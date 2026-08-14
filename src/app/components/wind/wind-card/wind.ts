import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { WindMenu } from '../wind-menu/wind-menu';
import { WindService } from '../../../service/wind-service/wind-service';

@Component({
  selector: 'app-wind',
  imports: [MatButtonModule, MatCardModule, MatIconModule, WindService, WindMenu],
  templateUrl: './wind.html',
  styleUrl: './wind.css',
})
export class Wind {
  protected readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }
}
