import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { GenerationService, MixGroup, MixTechnology } from '../../../service/generation-service/generation-service';
import { SeriesSelection } from '../../../service/series-selection/series-selection';

/** Donut-Geometrie im viewBox-Raster 0..200 */
const RADIUS = 76;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Fluchtluecke in Flaechenfarbe zwischen zwei Segmenten (2px) */
const GAP = 2;

interface Segment extends MixGroup {
  dashArray: string;
  dashOffset: number;
}

@Component({
  selector: 'app-mix',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './mix.html',
  styleUrl: './mix.css',
})
export class Mix {
  protected readonly generation = inject(GenerationService);
  protected readonly selection = inject(SeriesSelection);

  protected readonly radius = RADIUS;

  protected readonly mix = this.generation.mix;
  protected readonly groups = this.generation.mixGroups;

  protected readonly hovered = signal<MixGroup | null>(null);

  protected readonly segments = computed<Segment[]>(() => {
    let consumed = 0;

    return this.groups().map(group => {
      const length = (group.share / 100) * CIRCUMFERENCE;
      // Luecke vom Bogen abziehen, nicht zwischen die Boegen legen - so bleibt
      // die Winkelposition jedes Segments korrekt
      const drawn = Math.max(length - GAP, 0);
      const segment: Segment = {
        ...group,
        dashArray: `${drawn} ${CIRCUMFERENCE - drawn}`,
        dashOffset: -consumed,
      };
      consumed += length;
      return segment;
    });
  });

  /**
   * Bewusst die eigene Gruppensumme, nicht `renewableSharePercent` von
   * energy-charts: die Zahl steht mitten im Donut und muss den gruenen Bogen
   * beschreiben. Die offizielle Quote liegt rund einen Punkt hoeher, weil sie
   * den biogenen Anteil von Abfall mitzaehlt - der hier unter "Sonstige" laeuft.
   */
  protected readonly renewableShare = computed(
    () => this.groups().find(group => group.id === 'renewable')?.share ?? null
  );

  protected readonly technologies = computed<MixTechnology[]>(() => this.mix().technologies);

  /** Balkenbreite in der Tabelle, relativ zur groessten Technologie */
  protected barWidth(tech: MixTechnology): number {
    const max = this.technologies()[0]?.mw ?? 0;
    return max > 0 ? (tech.mw / max) * 100 : 0;
  }

  protected groupOf(tech: MixTechnology): MixGroup['id'] {
    return tech.category === 'renewable' || tech.category === 'fossil' ? tech.category : 'other';
  }

  protected show(group: MixGroup): void {
    this.hovered.set(group);
  }

  protected clear(): void {
    this.hovered.set(null);
  }
}
