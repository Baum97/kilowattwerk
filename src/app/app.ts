import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { Solar } from './components/solar/solar-card/solar';
import { Header } from './components/header/header';
import { Wind } from './components/wind/wind-card/wind';
import { Fossil } from './components/fossil/fossil-card/fossil';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Solar, Wind, Fossil, Header],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'KilowattWerk';
}
