import { Component, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService, UserResponse } from '../../../core/services/auth';

export interface EditorTheme {
  id: string;
  name: string;
  author: string;
  isPro: boolean;
  colors: string[];
  background: string;
  previewCode: any;
}

@Component({
  selector: 'app-theme-store-modal',
  templateUrl: './theme-store-modal.html',
  standalone: true,
  imports: [CommonModule]
})
export class ThemeStoreModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() themeSelected = new EventEmitter<string>();

  private authService = inject(AuthService);
  private router = inject(Router);

  isPremium = false;
  selectedThemeId = 'codesync-default';
  previewThemeId = 'codesync-default';

  themes: EditorTheme[] = [
    {
      id: 'vs-dark',
      name: 'CodeSync Default',
      author: 'CodeSync',
      isPro: false,
      background: '#050505',
      colors: ['#050505', '#ffffff', '#00f0ff', '#3b82f6', '#d946ef', '#10b981'],
      previewCode: {
        comment: '// CodeSync Default preview',
        keyword: 'const',
        variable: 'mesh',
        operator: '=',
        func: 'initializeMesh',
        string: '"Ready for production"'
      }
    },
    {
      id: 'dracula',
      name: 'Dracula',
      author: 'Zeno Rocha',
      isPro: true,
      background: '#282a36',
      colors: ['#282a36', '#f8f8f2', '#bd93f9', '#ff79c6', '#f1fa8c', '#50fa7b'],
      previewCode: {
        comment: '// Dracula preview',
        keyword: 'const',
        variable: 'mesh',
        operator: '=',
        func: 'initializeMesh',
        string: '"Vibrant and dark"'
      }
    },
    {
      id: 'monokai-pro',
      name: 'Monokai Pro',
      author: 'Wimer Hazenberg',
      isPro: true,
      background: '#2d2a2e',
      colors: ['#2d2a2e', '#fcfcfa', '#a9dc76', '#ff6188', '#fc9867', '#ffd866'],
      previewCode: {
        comment: '// Monokai Pro preview',
        keyword: 'const',
        variable: 'mesh',
        operator: '=',
        func: 'initializeMesh',
        string: '"Professional focus"'
      }
    },
    {
      id: 'nord',
      name: 'Nord',
      author: 'Arctic Ice Studio',
      isPro: true,
      background: '#2e3440',
      colors: ['#2e3440', '#eceff4', '#88c0d0', '#81a1c1', '#5e81ac', '#a3be8c'],
      previewCode: {
        comment: '// Nord preview',
        keyword: 'const',
        variable: 'mesh',
        operator: '=',
        func: 'initializeMesh',
        string: '"Arctic serenity"'
      }
    },
    {
      id: 'tokyo-night',
      name: 'Tokyo Night',
      author: 'enkia',
      isPro: true,
      background: '#1a1b26',
      colors: ['#1a1b26', '#c0caf5', '#7aa2f7', '#bb9af7', '#e0af68', '#9ece6a'],
      previewCode: {
        comment: '// Tokyo Night preview',
        keyword: 'const',
        variable: 'mesh',
        operator: '=',
        func: 'initializeMesh',
        string: '"Bioluminescent glow"'
      }
    },
    {
      id: 'github-light',
      name: 'GitHub Light',
      author: 'GitHub',
      isPro: true,
      background: '#ffffff',
      colors: ['#ffffff', '#24292f', '#0550ae', '#cf222e', '#953800', '#116329'],
      previewCode: {
        comment: '// GitHub Light preview',
        keyword: 'const',
        variable: 'mesh',
        operator: '=',
        func: 'initializeMesh',
        string: '"Classic light"'
      }
    },
    {
      id: 'solarized-light',
      name: 'Solarized Light',
      author: 'Ethan Schoonover',
      isPro: true,
      background: '#fdf6e3',
      colors: ['#fdf6e3', '#657b83', '#268bd2', '#d33682', '#b58900', '#859900'],
      previewCode: {
        comment: '// Solarized Light preview',
        keyword: 'const',
        variable: 'mesh',
        operator: '=',
        func: 'initializeMesh',
        string: '"Eye-friendly contrast"'
      }
    }
  ];

  private getStorageKey(): string {
    try {
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).userId : 'guest';
      return `editor-theme_${userId}`;
    } catch (e) {
      return 'editor-theme_guest';
    }
  }

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.isPremium = user?.premium || false;
      
      // Load saved theme after user state is known
      const savedTheme = localStorage.getItem(this.getStorageKey());
      if (savedTheme) {
        this.selectedThemeId = savedTheme;
        this.previewThemeId = savedTheme;
      }
    });
  }

  get activePreviewTheme(): EditorTheme {
    return this.themes.find(t => t.id === this.previewThemeId) || this.themes[0];
  }

  selectForPreview(themeId: string) {
    this.previewThemeId = themeId;
  }

  applyTheme() {
    const theme = this.activePreviewTheme;
    if (theme.isPro && !this.isPremium) {
      // In a real app, this would open the pricing/upgrade modal
      alert('This theme is only available for Pro users!');
      return;
    }

    this.selectedThemeId = theme.id;
    localStorage.setItem(this.getStorageKey(), theme.id);
    this.themeSelected.emit(theme.id);
    this.closeModal();
  }

  closeModal() {
    this.close.emit();
  }

  goToPricing() {
    this.closeModal();
    this.router.navigate(['/pricing']);
  }
}
