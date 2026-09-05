import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { GenerationService } from '../../../service/generation-service/generation-service';
import { SeriesSelection } from '../../../service/series-selection/series-selection';

@Component({
  selector: 'app-solar',
  imports: [DatePipe, DecimalPipe, MatCardModule, MatIconModule],
  templateUrl: './solar.html',
  styleUrl: './solar.css'
})
export class Solar {
  protected readonly generation = inject(GenerationService);
  private readonly selection = inject(SeriesSelection);

  protected readonly isSelected = computed(() => {
    const chartable = this.generation.chartableFor('solar');
    const selected = this.selection.selected();
    return chartable.length > 0 && chartable.every(name => selected.includes(name));
  });

  /** Klick auf die Karte ersetzt die Auswahl des Verlaufsgraphen */
  select(): void {
    this.selection.replace(this.generation.chartableFor('solar'));
  }
}
