import { DecimalPipe } from '@angular/common';
import {
  Component, ElementRef, afterNextRender, computed, inject, signal, viewChild,
} from '@angular/core';
import { GenerationService } from '../../service/generation-service/generation-service';

const HEIGHT = 280;
const HEIGHT_NARROW = 220;
const NARROW = 560;

const PAD = { top: 30, bottom: 32, left: 46, right: 12 };

/** Marke duenn halten - nie die ganze Bandbreite fuellen */
const MAX_COLUMN = 24;
const COLUMN_SHARE = 0.6;

/** Flaechenfarbene Luecke zwischen zwei Stapelabschnitten */
const GAP = 2;

/** Radius am Datenende, eckig an der Basis */
const CAP_RADIUS = 4;

const Y_TICKS = 4;

interface Segment {
  name: string;
  slot: number;
  path: string;
}

interface Column {
  year: number;
  x: number;
  width: number;
  total: number;
  partial: boolean;
  segments: Segment[];
}

@Component({
  selector: 'app-expansion',
  imports: [DecimalPipe],
  templateUrl: './expansion.html',
  styleUrl: './expansion.css',
})
export class Expansion {
  private readonly generation = inject(GenerationService);

  private readonly plot = viewChild<ElementRef<HTMLElement>>('plot');

  protected readonly width = signal(760);
  protected readonly narrow = computed(() => this.width() < NARROW);
  protected readonly height = computed(() => (this.narrow() ? HEIGHT_NARROW : HEIGHT));

  protected readonly data = this.generation.annual;

  /** Index der Saeule unter dem Zeiger */
  protected readonly cursor = signal<number | null>(null);

  protected readonly years = computed(() => this.data().years);
  protected readonly hasData = computed(() => this.years().length > 0);

  /** Summe je Jahr - die Hoehe der Saeule und die eigentliche Aussage */
  protected readonly totals = computed(() =>
    this.years().map((_, i) => this.data().series.reduce((sum, s) => sum + (s.twh[i] ?? 0), 0))
  );

  protected readonly yMax = computed(() => {
    const max = Math.max(0, ...this.totals());
    return niceMax(max);
  });

  protected readonly yTicks = computed(() => {
    const max = this.yMax();
    return Array.from({ length: Y_TICKS + 1 }, (_, i) => {
      const value = (max / Y_TICKS) * i;
      return { value, y: this.toY(value) };
    });
  });

  protected readonly columns = computed<Column[]>(() => {
    const years = this.years();
    if (!years.length) return [];

    const band = (this.width() - PAD.left - PAD.right) / years.length;
    const columnWidth = Math.min(MAX_COLUMN, band * COLUMN_SHARE);
    const partial = new Set(this.data().partialYears);
    const baseline = this.toY(0);

    return years.map((year, index) => {
      const x = PAD.left + band * index + (band - columnWidth) / 2;

      let bottom = baseline;
      const segments: Segment[] = [];

      // von unten nach oben stapeln, in Slot-Reihenfolge
      this.data().series.forEach((series, position) => {
        const value = series.twh[index] ?? 0;
        if (value <= 0) return;

        const rawHeight = baseline - this.toY(value);
        const height = Math.max(0, rawHeight - GAP);
        if (height <= 0) return;

        const top = bottom - height;
        const isTop = position === this.data().series.length - 1;

        segments.push({
          name: series.name,
          slot: series.slot ?? 1,
          path: isTop
            ? cappedPath(x, top, columnWidth, height)
            : rectPath(x, top, columnWidth, height),
        });

        bottom = top - GAP;
      });

      return {
        year,
        x,
        width: columnWidth,
        total: this.totals()[index],
        partial: partial.has(year),
        segments,
      };
    });
  });

  /**
   * Nur zwei Saeulen beschriften - die Spanne ist die Aussage, ein Wert auf
   * jeder Saeule waere Rauschen. Bewusst das letzte *vollstaendige* Jahr:
   * gegen ein angebrochenes verglichen sahe der Ausbau nach Rueckgang aus.
   */
  protected readonly labelled = computed(() => {
    const complete = this.columns().filter(column => !column.partial);
    if (complete.length < 2) return complete;
    return [complete[0], complete[complete.length - 1]];
  });

  protected readonly readout = computed(() => {
    const index = this.cursor();
    const column = index == null ? null : this.columns()[index];
    if (!column) return null;

    return {
      column,
      rows: this.data().series
        .map(series => ({
          name: series.name,
          slot: series.slot ?? 1,
          value: series.twh[index!] ?? 0,
        }))
        .filter(row => row.value > 0)
        .reverse(),
    };
  });

  protected readonly partialNote = computed(() => {
    const partial = this.data().partialYears;
    return partial.length ? partial.join(', ') : null;
  });

  protected readonly summary = computed(() => {
    const years = this.years();
    const totals = this.totals();
    if (!years.length) return 'Keine Jahresdaten geladen.';

    return (
      `Jahresenergie der Erneuerbaren von ${years[0]} bis ${years.at(-1)}. ` +
      `${years[0]}: ${totals[0].toFixed(0)} Terawattstunden, ` +
      `${years.at(-1)}: ${totals.at(-1)?.toFixed(0)} Terawattstunden.`
    );
  });

  constructor() {
    afterNextRender(() => {
      const element = this.plot()?.nativeElement;
      if (!element) return;

      const observer = new ResizeObserver(entries => {
        const entry = entries[0];
        if (entry) this.width.set(Math.max(240, Math.round(entry.contentRect.width)));
      });
      observer.observe(element);
    });
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
    return this.width() - PAD.right;
  }

  protected onPointer(event: PointerEvent): void {
    const count = this.years().length;
    if (!count) return;

    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    const band = (this.width() - PAD.left - PAD.right) / count;
    const index = Math.floor((event.clientX - rect.left - PAD.left) / band);

    this.cursor.set(index >= 0 && index < count ? index : null);
  }

  protected onKey(event: KeyboardEvent): void {
    const count = this.years().length;
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

/** Rechteck mit abgerundeter Oberkante, eckig unten */
function cappedPath(x: number, y: number, width: number, height: number): string {
  const r = Math.min(CAP_RADIUS, height, width / 2);
  return (
    `M${x},${y + height} L${x},${y + r} Q${x},${y} ${x + r},${y} ` +
    `L${x + width - r},${y} Q${x + width},${y} ${x + width},${y + r} ` +
    `L${x + width},${y + height} Z`
  );
}

function rectPath(x: number, y: number, width: number, height: number): string {
  return `M${x},${y} h${width} v${height} h${-width} Z`;
}

function niceMax(value: number): number {
  if (value <= 0) return 100;

  const magnitude = 10 ** Math.floor(Math.log10(value));
  // 1,5 / 3 / 4 mit drin, sonst springt die Achse z. B. von 250 auf 500
  // und die Marken fuellen nur die halbe Hoehe
  for (const factor of [1, 1.5, 2, 2.5, 3, 4, 5, 10]) {
    const candidate = factor * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}
