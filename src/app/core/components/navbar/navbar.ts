import { Component, inject, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../../../shared/shared-module';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.html',
  standalone: true,
  imports: [CommonModule, RouterModule, SharedModule]
})
export class NavbarComponent implements OnInit {
  private router = inject(Router);
  public themeService = inject(ThemeService);
  
  isAuthenticated = false;
  userInitials = '';
  userName = '';
  userEmail = '';
  userRole = '';
  userAvatarUrl = '';
  imageError = false;
  isPremium = false;
  isVisible = true;

  ngOnInit() {
    this.checkAuth();
    this.updateVisibility();

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.checkAuth();
        this.updateVisibility();
      }
    });
  }

  private updateVisibility() {
    const url = this.router.url;
    // Hide navbar on admin pages and editor page
    this.isVisible = !url.startsWith('/admin') && !url.startsWith('/editor');
  }

  private checkAuth() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    this.isAuthenticated = !!token;
    this.userRole = localStorage.getItem('role') || '';
    
    if (this.isAuthenticated && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.userName = user.fullName || user.username || 'User';
        this.userEmail = user.email || `${this.userName.toLowerCase()}@codesync.local`;
        
        // Extract initials properly
        this.userInitials = this.userName
          .split(' ')
          .map((n: string) => n[0])
          .join('')
          .toUpperCase()
          .substring(0, 2);
          
        this.userAvatarUrl = user.avatarUrl || '';
        this.isPremium = user.isPremium || user.premium || false;
      } catch (e) {
        this.userInitials = 'U';
      }
    }
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    this.checkAuth();
    this.router.navigate(['/']);
  }
}
