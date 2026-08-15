import { Injectable, computed, signal } from '@angular/core';

export interface SolarPlant {
  id: string;
  name: string;
  location?: string;
  power: number;
  time: number;
  call: number;
}

@Injectable({ providedIn: 'root' })
export class SolarService {
  private readonly _plants = signal<SolarPlant[]>([
    { id: 'euro-per-kwh-over-time', name: 'Euro/kWh/Zeit', call: this.euroPerKwHOverTimeAPI()},
    { id: 'current-kwh-per-year', name: 'Aktuell kWh/Jahr', call: this.currentkWhPerYearAPI()},
    { id: 'annual-increase-kwh', name: 'Jährliche Steigerung kWh', call: this.annualIncreaseKWhAPI()},
  ]);

  readonly plants = this._plants.asReadonly();

  readonly count = computed(() => this._plants().length);

  readonly totalPowerKw = computed(() =>
    this._plants().reduce((sum, plant) => sum + plant.call, 0)
  );

  add(plant: SolarPlant): void {
    this._plants.update(plants => [...plants, plant]);
  }

  remove(id: string): void {
    this._plants.update(plants => plants.filter(plant => plant.id !== id));
  }



  // API Methods
  euroPerKwHOverTimeAPI(): number {
    console.debug("euroPerKwHOverTimeAPI called");
    return 0.35;
  }

  currentkWhPerYearAPI(): number {
    console.debug("currentkWhPerYearAPI called");
    return 1000;
  }

  annualIncreaseKWhAPI(): number { 
    console.debug("annualIncreaseKWhAPI called");
    return 50;
  }
}
