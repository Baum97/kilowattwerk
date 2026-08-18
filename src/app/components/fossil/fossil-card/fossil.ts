import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { FossilMenu } from '../fossil-menu/fossil-menu';
import { GenerationService } from '../../../service/generation-service/generation-service';

@Component({
  selector: 'app-fossil',
  imports: [DatePipe, DecimalPipe, MatButtonModule, MatCardModule, MatChipsModule, MatIconModule, FossilMenu],
  templateUrl: './fossil.html',
  styleUrl: './fossil.css',
})
export class Fossil {
  protected readonly generation = inject(GenerationService);
  protected readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }
}
