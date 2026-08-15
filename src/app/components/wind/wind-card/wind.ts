import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { WindMenu } from '../wind-menu/wind-menu';
import { WindService } from '../../../service/wind-service/wind-service';

@Component({
  selector: 'app-wind',
  imports: [DecimalPipe, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, WindMenu],
  templateUrl: './wind.html',
  styleUrl: './wind.css',
})
export class Wind {
  protected readonly wind = inject(WindService);
  protected readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }
}
