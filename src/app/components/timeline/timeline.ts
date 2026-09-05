import { DecimalPipe } from '@angular/common';
import {
  Component, ElementRef, afterNextRender, computed, inject, signal, viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, combineLatest, of, timer } from 'rxjs';
import { catchError, finalize, map, shareReplay, switchMap } from 'rxjs/operators';
import { GenerationService, Timeline as TimelineData } from '../../service/generation-service/generation-service';
import { RANGES, SeriesSelection } from '../../service/series-selection/series-selection';

const HEIGHT = 300;
const HEIGHT_NARROW = 220;

/** unter dieser Breite bleibt fuer Endbeschriftungen kein Platz */
const NARROW = 560;
// top traegt die Einheit ueber der obersten Achsenbeschriftung
const PAD = { top: 32, bottom: 30, left: 58 };
const RIGHT_WITH_LABELS = 96;
const RIGHT_PLAIN = 12;

const REFRESH_MS = 15 * 60 * 1000;
const Y_TICKS = 5;

const EMPTY_DATA: TimelineData = { hours: 24, timestamps: [], series: [] };

interface Line {
  name: string;
  slot: number;
  path: string;
  endX: number;
  endY: number;
  last: number | null;
  min: number;
  max: number;
}

@Component({
  selector: 'app-timeline',
  imports: [DecimalPipe],
  templateUrl: './timeline.html',
  styleUrl: './timeline.css',
})
export class Timeline {
  private readonly generation = inject(GenerationService);
  protected readonly selection = inject(SeriesSelection);

  protected readonly ranges = RANGES;

  private readonly plot = viewChild<ElementRef<HTMLElement>>('plot');

  protected readonly width = signal(760);

  protected readonly narrow = computed(() => this.width() < NARROW);

  /** flacher auf dem Telefon - 300px fuellen dort den halben Bildschirm */
  protected readonly height = computed(() => (this.narrow() ? HEIGHT_NARROW : HEIGHT));

  /**
   * Endbeschriftungen brauchen 96px am rechten Rand. Auf einem 360px-Schirm
   * blieben davon 200px Plotbreite - dann traegt allein die Legende.
   */
  protected readonly endLabels = computed(() => this.selection.showEndLabels() && !this.narrow());

  /** Index des Fadenkreuzes, null = kein Zeiger auf dem Graphen */
  protected readonly cursor = signal<number | null>(null);

  private readonly request = computed(() => ({
    hours: this.selection.hours(),
    technologies: this.selection.selected(),
  }));

  /** laeuft ein Abruf? Das vorherige Bild bleibt dabei stehen */
  protected readonly pending = signal(false);

  /** letzter Abruf fehlgeschlagen - sonst waere ein Klick stumm wirkungslos */
  protected readonly failed = signal(false);

  private readonly data = toSignal(
    combineLatest([toObservable(this.request), timer(0, REFRESH_MS)]).pipe(
      map(([request]) => request),
      switchMap(({ hours, technologies }) => {
        if (!technologies.length) {
          this.pending.set(false);
          this.failed.set(false);
          return of(EMPTY_DATA);
        }

        this.pending.set(true);

        return this.generation.timeline(hours, technologies).pipe(
          // Fehler nicht verschlucken: ohne Hinweis sieht ein fehlgeschlagener
          // Wechsel des Zeitraums wie ein Knopf ohne Wirkung aus
          catchError(() => {
            this.failed.set(true);
            return EMPTY;
          }),
          finalize(() => this.pending.set(false))
        );
      }),
      map(data => {
        this.failed.set(false);
        return data;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    ),
    { initialValue: EMPTY_DATA }
  );

  protected readonly timestamps = computed(() => this.data().timestamps);
  protected readonly hasData = computed(() => this.timestamps().length > 1);

  private readonly right = computed(() =>
    this.endLabels() ? RIGHT_WITH_LABELS : RIGHT_PLAIN
  );

  /** Obere Achsengrenze, auf einen runden Wert aufgerundet */
  protected readonly yMax = computed(() => {
    const values = this.data().series.flatMap(s => s.values.filter((v): v is number => v != null));
    return niceMax(values.length ? Math.max(...values) : 0);
  });

  protected readonly yTicks = computed(() => {
    const max = this.yMax();
    return Array.from({ length: Y_TICKS + 1 }, (_, i) => {
      const value = (max / Y_TICKS) * i;
      return { value, y: this.toY(value) };
    });
  });

  protected readonly xTicks = computed(() => {
    const stamps = this.timestamps();
    if (stamps.length < 2) return [];

    const wanted = Math.min(this.narrow() ? 3 : 6, stamps.length);
    const step = Math.max(1, Math.floor((stamps.length - 1) / (wanted - 1)));

    const ticks: { x: number; label: string }[] = [];
    for (let i = 0; i < stamps.length; i += step) {
      ticks.push({ x: this.toX(i), label: hhmm(stamps[i]) });
    }
    return ticks;
  });

  protected readonly lines = computed<Line[]>(() =>
    this.data().series.map(series => {
      // Luecken trennen den Pfad, statt ihn quer durchs Bild zu ziehen
      let path = '';
      let open = false;
      let endX = 0;
      let endY = 0;
      let last: number | null = null;

      series.values.forEach((value, i) => {
        if (value == null) {
          open = false;
          return;
        }
        const x = this.toX(i);
        const y = this.toY(value);
        path += (open ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
        open = true;
        endX = x;
        endY = y;
        last = value;
      });

      const numeric = series.values.filter((v): v is number => v != null);

      return {
        name: series.name,
        slot: series.slot ?? 1,
        path: path.trim(),
        endX,
        endY,
        last,
        min: numeric.length ? Math.min(...numeric) : 0,
        max: numeric.length ? Math.max(...numeric) : 0,
      };
    })
  );

  /** Werte aller Reihen am Fadenkreuz - eine Anzeige, nicht eine pro Linie */
  protected readonly readout = computed(() => {
    const index = this.cursor();
    if (index == null) return null;

    const stamps = this.timestamps();
    if (!stamps[index]) return null;

    return {
      time: hhmm(stamps[index]),
      x: this.toX(index),
      rows: this.data().series.map(series => ({
        name: series.name,
        slot: series.slot ?? 1,
        value: series.values[index],
      })),
    };
  });

  protected readonly summary = computed(() => {
    const lines = this.lines();
    if (!lines.length) return 'Keine Reihe ausgewählt.';

    const parts = lines.map(
      line =>
        line.name + ': aktuell ' + Math.round(line.last ?? 0) +
        ', Spanne ' + Math.round(line.min) + ' bis ' + Math.round(line.max) + ' Megawatt'
    );
    return 'Zeitverlauf der Erzeugung über ' + this.selection.hours() + ' Stunden. ' + parts.join('. ');
  });

  constructor() {
    afterNextRender(() => {
      const element = this.plot()?.nativeElement;
      if (!element) return;

      // Echte Pixelbreite statt viewBox-Skalierung: sonst schrumpft die
      // Beschriftung mit dem Container und wird unlesbar
      const observer = new ResizeObserver(entries => {
        const entry = entries[0];
        // Untergrenze nur gegen entartete Rechnung. Hoeher angesetzt wuerde
        // das SVG breiter als sein Container und rechts abgeschnitten - ein
        // SVG ohne viewBox skaliert nicht mit.
        if (entry) this.width.set(Math.max(240, Math.round(entry.contentRect.width)));
      });
      observer.observe(element);
    });
  }

  protected toX(index: number): number {
    const count = this.timestamps().length;
    if (count < 2) return PAD.left;
    const span = this.width() - PAD.left - this.right();
    return PAD.left + (index / (count - 1)) * span;
  }

  protected toY(value: number): number {
    const max = this.yMax() || 1;
    const span = this.height() - PAD.top - PAD.bottom;
    return PAD.top + span * (1 - value / max);
  }

  protected get plotLeft(): number {
    return PAD.left;
  }

  protected get plotTop(): number {
    return PAD.top;
  }

  protected get plotBottom(): number {
    return this.height() - PAD.bottom;
  }

  protected get plotRight(): number {
    return this.width() - this.right();
  }

  protected onPointer(event: PointerEvent): void {
    const count = this.timestamps().length;
    if (count < 2) return;

    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    const span = this.width() - PAD.left - this.right();
    const ratio = (event.clientX - rect.left - PAD.left) / span;

    this.cursor.set(Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1)))));
  }

  protected onKey(event: KeyboardEvent): void {
    const count = this.timestamps().length;
    if (!count) return;

    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!step) return;

    event.preventDefault();
    this.cursor.update(current => {
      const next = (current ?? count - 1) + step;
      return Math.max(0, Math.min(count - 1, next));
    });
  }

  protected clearCursor(): void {
    this.cursor.set(null);
  }
}

/** Rundet auf 1/2/2,5/5/10 der naechsten Zehnerpotenz auf */
function niceMax(value: number): number {
  if (value <= 0) return 1000;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const factor of [1, 2, 2.5, 5, 10]) {
    const candidate = factor * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
