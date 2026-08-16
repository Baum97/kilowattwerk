import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';

export interface SolarPlant {
  id: string;
  name: string;
  location?: string;
  energy_kwh?: number;
  totalPowerKw?: number;
  time?: number;
  call?: number;
}

@Injectable({ providedIn: 'root' })
export class SolarService {
  private readonly _plants = signal<SolarPlant[]>([
    { id: 'euro-per-kwh-over-time', name: 'Euro/kWh/Zeit'},
    { id: 'current-kwh-per-year', name: 'Aktuell kWh/Jahr'},
    { id: 'annual-increase-kwh', name: 'Jährliche Steigerung kWh'},
  ]);

  readonly plants = this._plants.asReadonly();

  readonly count = computed(() => this._plants().length);

  readonly totalPowerKw = computed(() =>
    this._plants().reduce(() => 0, 0)
  );

  add(plant: SolarPlant): void {
    this._plants.update(plants => [...plants, plant]);
  }

  remove(id: string): void {
    this._plants.update(plants => plants.filter(plant => plant.id !== id));
  }


  constructor(private http: HttpClient) {}


  // API Methods
  publicPower() {
    console.debug("publicPowerAPI called");
    return 0.35;
  }

  getGermanyPower(): Observable<any> {
    return this.http.get<any>('https://api.energy-charts.info/public_power', { params: { country: 'DE' } })
    .pipe(
      catchError(this.handleError)
    );
  }

  currentkWhPerYearAPI(): number {
    console.debug("currentkWhPerYearAPI called");
    return 1000;
  }

  annualIncreaseKWhAPI(): number { 
    console.debug("annualIncreaseKWhAPI called");
    return 50;
  }


  private handleError(error: HttpErrorResponse) {
    return throwError(() => new Error(`An error occurred: ${error.message}`));
  }
}
