import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { SolarMenu } from '../solar-menu/solar-menu';
import { SolarService } from '../../../service/solar-service/solar-service';

@Component({
  selector: 'app-solar',
  imports: [DecimalPipe, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, SolarMenu],
  templateUrl: './solar.html',
  styleUrl: './solar.css'
})
export class Solar {
  protected readonly solar = inject(SolarService);
  protected readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }
}
