import { Injectable, computed, signal } from '@angular/core';

export interface FossilPlant {
  id: string;
  name: string;
  powerKw: number;
}

@Injectable({ providedIn: 'root' })
export class FossilService {
  private readonly _plants = signal<FossilPlant[]>([
    { id: 'bhkw', name: 'BHKW', powerKw: 64.1 },
  ]);

  readonly plants = this._plants.asReadonly();

  readonly count = computed(() => this._plants().length);

  readonly totalPowerKw = computed(() =>
    this._plants().reduce((sum, plant) => sum + plant.powerKw, 0)
  );

  add(plant: FossilPlant): void {
    this._plants.update(plants => [...plants, plant]);
  }

  remove(id: string): void {
    this._plants.update(plants => plants.filter(plant => plant.id !== id));
  }
}
