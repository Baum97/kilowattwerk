import { Injectable, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, timer } from 'rxjs';
import { catchError, shareReplay, switchMap } from 'rxjs/operators';
import { DailyRow } from '../../models/series';

export type EnergyType = 'solar' | 'wind' | 'hydro' | 'fossil';

/** production_types aus energy-charts, exakt wie in der Tabelle `generation` */
export const TECHNOLOGIES: Record<EnergyType, string[]> = {
  solar: ['Solar'],
  wind: ['Wind onshore', 'Wind offshore'],
  hydro: ['Hydro Run-of-River', 'Hydro water reservoir', 'Hydro pumped storage'],
  fossil: [
    'Fossil gas',
    'Fossil hard coal',
    'Fossil brown coal / lignite',
    'Fossil oil',
    'Fossil coal-derived gas',
  ],
};


/**
 * Technologienamen fuer die installierte Leistung. Bewusst eine eigene Map:
 * `installed_power` benennt die Reihen anders als `public_power` - dort
 * "Solar AC"/"Solar DC" statt "Solar", "Hydro" statt der drei Wasser-Reihen.
 * Solar AC ist die netzwirksame Groesse, DC waere die Modul-Nennleistung.
 */
export const CAPACITY_TECHNOLOGIES: Record<EnergyType, string[]> = {
  solar: ['Solar AC'],
  wind: ['Wind onshore', 'Wind offshore'],
  hydro: ['Hydro'],
  fossil: ['Fossil gas', 'Fossil hard coal', 'Fossil brown coal / lignite', 'Fossil oil'],
};

export interface CapacityEntry {
  year: string;
  gw: number;
}

export interface CapacityResponse {
  maxPowerCapacity: Record<string, CapacityEntry>;
}

export interface CurrentPower {
  ts: string | null;
  values: Record<string, number>;
}


export type MixCategory = 'renewable' | 'fossil' | 'nuclear' | 'storage' | 'other';

export interface MixTechnology {
  name: string;
  mw: number;
  share: number;
  category: MixCategory;
  /** null = im Verlaufsgraphen nicht einzeln darstellbar */
  slot: number | null;
}

export interface PowerMix {
  ts: string | null;
  totalMw: number;
  renewableSharePercent: number | null;
  technologies: MixTechnology[];
}


export interface TimelineSeries {
  name: string;
  category: MixCategory;
  slot: number | null;
  values: (number | null)[];
}

export interface Timeline {
  hours: number;
  timestamps: string[];
  series: TimelineSeries[];
}

/** Gruppen des Donuts - bewusst drei, siehe mix-card.ts */
export interface MixGroup {
  id: 'renewable' | 'fossil' | 'other';
  label: string;
  mw: number;
  share: number;
}

const GROUP_LABEL: Record<MixGroup['id'], string> = {
  renewable: 'Erneuerbar',
  fossil: 'Fossil',
  other: 'Sonstige',
};

/** energy-charts publiziert im 15-Minuten-Raster */
const REFRESH_MS = 15 * 60 * 1000;

const EMPTY_POWER: CurrentPower = { ts: null, values: {} };

const EMPTY_CAPACITY: CapacityResponse = { maxPowerCapacity: {} };

const EMPTY_MIX: PowerMix = { ts: null, totalMw: 0, renewableSharePercent: null, technologies: [] };

@Injectable({ providedIn: 'root' })
export class GenerationService {
  private readonly http = inject(HttpClient);

  // ein Poll fuer alle Karten - der Service ist root-provided
  private readonly current$ = timer(0, REFRESH_MS).pipe(
    switchMap(() =>
      this.http.get<CurrentPower>('/api/current').pipe(
        // Fehler verwerfen statt weitergeben: shareReplay behaelt den letzten
        // guten Wert und der Timer pollt weiter
        catchError(() => EMPTY)
      )
    ),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  private readonly current = toSignal(this.current$, { initialValue: EMPTY_POWER });

  /** Zeitstempel des angezeigten Messwerts */
  readonly updatedAt = computed(() => this.current().ts);

  readonly hasData = computed(() => this.current().ts !== null);

  /** Aktuelle Leistung des Energietyps in MW */
  currentMw(type: EnergyType): number {
    const { values } = this.current();
    return TECHNOLOGIES[type].reduce((sum, tech) => sum + (values[tech] ?? 0), 0);
  }


  /** Anzahl Technologien des Typs, die aktuell Werte liefern */
  count(type: EnergyType): number {
    const { values } = this.current();
    return TECHNOLOGIES[type].filter(tech => values[tech] != null).length;
  }

  private readonly mix$ = timer(0, REFRESH_MS).pipe(
    switchMap(() => this.http.get<PowerMix>('/api/mix').pipe(catchError(() => EMPTY))),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly mix = toSignal(this.mix$, { initialValue: EMPTY_MIX });

  /**
   * Technologien zu drei Gruppen zusammengefasst. Fuenfzehn Segmente waeren als
   * Donut nicht lesbar - die Einzelwerte stehen in der Tabelle darunter.
   */
  readonly mixGroups = computed<MixGroup[]>(() => {
    const { technologies, totalMw } = this.mix();
    if (!totalMw) return [];

    const sums: Record<MixGroup['id'], number> = { renewable: 0, fossil: 0, other: 0 };

    for (const tech of technologies) {
      const id = tech.category === 'renewable' || tech.category === 'fossil' ? tech.category : 'other';
      sums[id] += tech.mw;
    }

    return (['renewable', 'fossil', 'other'] as const)
      .map(id => ({ id, label: GROUP_LABEL[id], mw: sums[id], share: (sums[id] / totalMw) * 100 }))
      .filter(group => group.mw > 0);
  });

  /**
   * Installierte Leistung - einmalig geladen, kein Poll: die Reihe ist
   * jaehrlich aufgeloest und aendert sich nicht im Minutentakt.
   */
  private readonly capacity$ = this.http.get<CapacityResponse>('/api/maxPowerCapacity').pipe(
    catchError(() => EMPTY),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  private readonly capacity = toSignal(this.capacity$, { initialValue: EMPTY_CAPACITY });

  /** Installierte Leistung des Energietyps in MW (Quelle liefert GW) */
  capacityMw(type: EnergyType): number {
    const entries = this.capacity().maxPowerCapacity;
    return CAPACITY_TECHNOLOGIES[type].reduce(
      (sum, tech) => sum + (entries[tech]?.gw ?? 0) * 1000,
      0
    );
  }

  /** Bezugsjahr der installierten Leistung, fuer die Beschriftung */
  capacityYear(type: EnergyType): string | null {
    const entries = this.capacity().maxPowerCapacity;
    return CAPACITY_TECHNOLOGIES[type].map(tech => entries[tech]?.year).find(Boolean) ?? null;
  }

  /** Anteil der aktuellen an der installierten Leistung, in Prozent */
  utilisation(type: EnergyType): number | null {
    const max = this.capacityMw(type);
    if (!max) return null;
    return (this.currentMw(type) / max) * 100;
  }

  /**
   * Technologien eines Energietyps, die im Verlaufsgraphen darstellbar sind.
   * Abgeleitet aus dem `slot` der Mix-Antwort - so bleibt lib/technologies.mjs
   * die einzige Stelle, an der die Zuordnung gepflegt wird.
   */
  chartableFor(type: EnergyType): string[] {
    const slots = new Map(this.mix().technologies.map(tech => [tech.name, tech.slot]));
    return TECHNOLOGIES[type].filter(name => slots.get(name) != null);
  }

  timeline(hours: number, technologies: string[]): Observable<Timeline> {
    return this.http.get<Timeline>('/api/timeline', {
      params: { hours, technologies: technologies.join(',') },
    });
  }

  daily(type: EnergyType, days = 30): Observable<DailyRow[]> {
    return this.http.get<DailyRow[]>('/api/generation', {
      params: { technologies: TECHNOLOGIES[type].join(','), days },
    });
  }
}
