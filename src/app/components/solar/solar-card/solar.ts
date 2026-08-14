import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SolarMenu } from '../solar-menu/solar-menu';

@Component({
  selector: 'app-solar',
  imports: [MatButtonModule, MatCardModule, MatIconModule, SolarMenu],
  templateUrl: './solar.html',
  styleUrl: './solar.css'
})
export class Solar {
  protected readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }
}
