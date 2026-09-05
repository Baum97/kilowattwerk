import { Injectable, signal } from '@angular/core';

/**
 * Auf-/Zuklappen des Kontaktbereichs. Eigener Service, weil Ausloeser (Footer)
 * und Inhalt (Contact) Geschwister sind und sonst ueber App durchgereicht
 * werden muessten.
 */
@Injectable({ providedIn: 'root' })
export class ContactPanel {
  private readonly _open = signal(false);

  readonly open = this._open.asReadonly();

  toggle(): void {
    this._open.update(open => !open);
  }

  close(): void {
    this._open.set(false);
  }
}
