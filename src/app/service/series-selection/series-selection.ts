import { Injectable, computed, signal } from '@angular/core';

export interface RangeOption {
  hours: number;
  label: string;
}

export const RANGES: RangeOption[] = [
  { hours: 6, label: '6 h' },
  { hours: 24, label: '24 h' },
  { hours: 48, label: '48 h' },
  { hours: 72, label: '72 h' },
];

/** Hoechstens so viele Reihen gleichzeitig - darueber wird der Graph unlesbar */
export const MAX_SERIES = 8;

/**
 * Auswahl fuer den Verlaufsgraphen. Eigener Service, weil drei Stellen darauf
 * zugreifen: die Technologie-Tabelle (Haken), die Energie-Karten (Klick waehlt
 * den Typ) und der Graph selbst.
 */
@Injectable({ providedIn: 'root' })
export class SeriesSelection {
  private readonly _selected = signal<string[]>(['Solar', 'Wind onshore']);
  private readonly _hours = signal(24);

  readonly selected = this._selected.asReadonly();
  readonly hours = this._hours.asReadonly();

  readonly count = computed(() => this._selected().length);

  /** Ab vier Reihen kollidieren Endbeschriftungen - dann traegt die Legende */
  readonly showEndLabels = computed(() => this._selected().length <= 4);

  isSelected(name: string): boolean {
    return this._selected().includes(name);
  }

  toggle(name: string): void {
    this._selected.update(current =>
      current.includes(name)
        ? current.filter(entry => entry !== name)
        : current.length >= MAX_SERIES
          ? current
          : [...current, name]
    );
  }

  /** Ersetzt die Auswahl - genutzt vom Klick auf eine Energie-Karte */
  replace(names: string[]): void {
    this._selected.set(names.slice(0, MAX_SERIES));
  }

  setHours(hours: number): void {
    this._hours.set(hours);
  }
}
