import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { WindMenu } from '../wind-menu/wind-menu';
import { GenerationService } from '../../../service/generation-service/generation-service';

@Component({
  selector: 'app-wind',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, WindMenu],
  templateUrl: './wind.html',
  styleUrl: './wind.css',
})
export class Wind {
  protected readonly generation = inject(GenerationService);
  protected readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }
}
