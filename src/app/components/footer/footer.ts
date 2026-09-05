import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ContactPanel } from '../../service/contact-panel/contact-panel';

@Component({
  selector: 'app-footer',
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './footer.html',
  styleUrl: './footer.css',
})
export class Footer {
  protected readonly panel = inject(ContactPanel);

  /** Spendenseite - eine Stelle zum Aendern, wenn die Plattform wechselt */
  protected readonly donateUrl =
    'https://github.com/sponsors/Baum97?frequency=recurring&sponsor=Baum97';

  protected readonly year = new Date().getFullYear();
}
