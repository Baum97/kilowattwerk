import { Injectable, computed, signal } from '@angular/core';

export interface WindPlant {
  id: string;
  name: string;
  powerKw: number;
}

@Injectable({ providedIn: 'root' })
export class WindService {
  private readonly _plants = signal<WindPlant[]>([
    { id: 'nordfeld', name: 'Nordfeld', powerKw: 18.5 },
    { id: 'huegel', name: 'Hügel', powerKw: 9.3 },
  ]);

  readonly plants = this._plants.asReadonly();

  readonly count = computed(() => this._plants().length);

  readonly totalPowerKw = computed(() =>
    this._plants().reduce((sum, plant) => sum + plant.powerKw, 0)
  );

  add(plant: WindPlant): void {
    this._plants.update(plants => [...plants, plant]);
  }

  remove(id: string): void {
    this._plants.update(plants => plants.filter(plant => plant.id !== id));
  }
}
