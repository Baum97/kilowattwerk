import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { FossilMenu } from '../fossil-menu/fossil-menu';
import { FossilService } from '../../../service/fossil-service/fossil-service'; 

@Component({
  selector: 'app-fossil',
  imports: [MatButtonModule, MatCardModule, MatIconModule, FossilService, FossilMenu],
  templateUrl: './fossil.html',
  styleUrl: './fossil.css',
})
export class Fossil {
  protected readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }
}
