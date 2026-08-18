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

export interface CurrentPower {
  ts: string | null;
  values: Record<string, number>;
}

export interface TechnologyPower {
  id: string;
  name: string;
  mw: number;
}

/** energy-charts publiziert im 15-Minuten-Raster */
const REFRESH_MS = 15 * 60 * 1000;

const EMPTY_POWER: CurrentPower = { ts: null, values: {} };

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

  /** Aufschluesselung je Technologie, absteigend nach Leistung */
  breakdown(type: EnergyType): TechnologyPower[] {
    const { values } = this.current();
    return TECHNOLOGIES[type]
      .filter(tech => values[tech] != null)
      .map(tech => ({ id: tech, name: tech, mw: values[tech] }))
      .sort((a, b) => b.mw - a.mw);
  }

  count(type: EnergyType): number {
    return this.breakdown(type).length;
  }

  daily(type: EnergyType, days = 30): Observable<DailyRow[]> {
    return this.http.get<DailyRow[]>('/api/generation', {
      params: { technologies: TECHNOLOGIES[type].join(','), days },
    });
  }
}
