import { Injectable, computed, signal } from '@angular/core';

export type ThemeOptionId = 'midnight' | 'daylight' | 'forest';

export interface ThemeOption {
  id: ThemeOptionId;
  label: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly themes: ThemeOption[] = [
    { id: 'midnight', label: 'Midnight', description: 'Original deep blue palette' },
    { id: 'daylight', label: 'Daylight', description: 'Bright, airy neutral surfaces' },
    { id: 'forest', label: 'Forest', description: 'High-contrast green focus' },
  ];

  private readonly storageKey = 'app-theme';
  private readonly theme = signal<ThemeOptionId>('midnight');

  currentTheme = computed(() => this.theme());

  constructor() {
    const saved = (localStorage.getItem(this.storageKey) as ThemeOptionId | null) ?? 'midnight';
    const valid = this.themes.some((t) => t.id === saved) ? saved : 'midnight';
    this.applyTheme(valid);
  }

  setTheme(themeId: ThemeOptionId) {
    const valid = this.themes.find((t) => t.id === themeId)?.id ?? 'midnight';
    this.applyTheme(valid);
  }

  private applyTheme(themeId: ThemeOptionId) {
    this.theme.set(themeId);
    document.body.setAttribute('data-theme', themeId);
    localStorage.setItem(this.storageKey, themeId);
  }
}
