import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: 'solar', loadComponent: () => import('./components/solar/solar-card/solar').then(m => m.Solar) }, 
  { path: 'header', loadComponent: () => import('./components/header/header').then(m => m.Header) }, 
  { path: 'wind', loadComponent: () => import('./components/wind/wind-card/wind').then(m => m.Wind) },
  { path: 'fossil', loadComponent: () => import('./components/fossil/fossil-card/fossil').then(m => m.Fossil) },
];
