import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ContactPanel } from '../../service/contact-panel/contact-panel';

type SendState = 'idle' | 'sending' | 'sent' | 'error';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  protected readonly panel = inject(ContactPanel);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);

  protected readonly state = signal<SendState>('idle');
  protected readonly errorMessage = signal<string | null>(null);

  private readonly section = viewChild<ElementRef<HTMLElement>>('section');

  constructor() {
    // Der Bereich liegt ueber dem Footer: beim Aufklappen waechst die Seite an
    // dieser Stelle, waehrend die Scrollposition bleibt - der Inhalt entstuende
    // sonst ausserhalb des Sichtfelds. Erst nach der Hoehen-Animation scrollen,
    // sonst zielt der Browser auf die noch zusammengeklappte Hoehe.
    effect(() => {
      if (!this.panel.open()) return;

      const element = this.section()?.nativeElement;
      if (!element) return;

      const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      const reveal = () => element.scrollIntoView({ block: 'start', behavior });

      element.addEventListener('transitionend', reveal, { once: true });
      // Fallback, falls kein transitionend kommt (reduzierte Bewegung, Hintergrundtab)
      setTimeout(reveal, 320);
    });
  }

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    message: ['', [Validators.required, Validators.maxLength(5000)]],
  });

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.state.set('sending');
    this.errorMessage.set(null);

    try {
      // bewusst fetch-aehnlich ueber HttpClient: BotID haengt seine Header an
      // jeden POST auf /api/contact, unabhaengig vom verwendeten Client
      await firstValueFrom(this.http.post('/api/contact', this.form.getRawValue()));
      this.form.reset();
      this.state.set('sent');
    } catch (error: unknown) {
      const message = (error as { error?: { error?: string } })?.error?.error;
      this.errorMessage.set(message ?? 'Die Nachricht konnte nicht gesendet werden.');
      this.state.set('error');
    }
  }
}
