import { Component } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { Solar } from './components/solar/solar-card/solar';
import { Header } from './components/header/header';
import { Wind } from './components/wind/wind-card/wind';
import { Fossil } from './components/fossil/fossil-card/fossil';
import { Mix } from './components/mix/mix-card/mix';
import { Timeline } from './components/timeline/timeline';
import { Footer } from './components/footer/footer';
import { Contact } from './components/contact/contact';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Solar, Wind, Fossil, Mix, Timeline, Header, Contact, Footer],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected title = 'KilowattWerk';
}
