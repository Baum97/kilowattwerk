import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'renewly-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView;

  private readonly prefersDark = signal(this.window?.matchMedia(DARK_QUERY).matches ?? false);

  readonly mode = signal<ThemeMode>(this.restore());

  readonly isDark = computed(() => {
    const mode = this.mode();
    return mode === 'dark' || (mode === 'system' && this.prefersDark());
  });

  constructor() {
    this.window
      ?.matchMedia(DARK_QUERY)
      .addEventListener('change', event => this.prefersDark.set(event.matches));

    effect(() => {
      const mode = this.mode();
      const classes = this.document.documentElement.classList;
      classes.toggle('theme-light', mode === 'light');
      classes.toggle('theme-dark', mode === 'dark');
      this.window?.localStorage.setItem(STORAGE_KEY, mode);
    });
  }

  toggle(): void {
    this.mode.set(this.isDark() ? 'light' : 'dark');
  }

  private restore(): ThemeMode {
    const stored = this.window?.localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
  }
}
