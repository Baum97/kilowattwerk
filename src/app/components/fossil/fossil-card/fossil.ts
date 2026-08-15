import { DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { FossilMenu } from '../fossil-menu/fossil-menu';
import { FossilService } from '../../../service/fossil-service/fossil-service';

@Component({
  selector: 'app-fossil',
  imports: [DecimalPipe, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, FossilMenu],
  templateUrl: './fossil.html',
  styleUrl: './fossil.css',
})
export class Fossil {
  protected readonly fossil = inject(FossilService);
  protected readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }
}
