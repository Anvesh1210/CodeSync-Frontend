import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private getStorageKey(): string {
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).userId : 'guest';
      return `theme_${userId}`;
    } catch (e) {
      return 'theme_guest';
    }
  }

  isDarkMode = signal<boolean>(localStorage.getItem(this.getStorageKey()) !== 'light');

  constructor() {
    effect(() => {
      const theme = this.isDarkMode() ? 'dark' : 'light';
      localStorage.setItem(this.getStorageKey(), theme);
      if (theme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
    });
  }

  toggleTheme() {
    this.isDarkMode.set(!this.isDarkMode());
  }

  getTheme(): 'vs-dark' | 'vs' {
    return this.isDarkMode() ? 'vs-dark' : 'vs';
  }
}
