import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-oauth-register',
  templateUrl: './oauth-register.html',
  styleUrls: ['./oauth-register.css'],
  standalone: false
})
export class OAuthRegisterComponent implements OnInit {
  email: string = '';
  fullName: string = '';
  username: string = '';
  avatarUrl: string = '';
  bio: string = '';
  provider: string = '';

  errorMessage: string = '';
  successMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Get OAuth data from query parameters
    this.route.queryParams.subscribe(params => {
      this.email = params['email'] || '';
      this.fullName = params['name'] || '';
      this.avatarUrl = params['avatarUrl'] || '';
      this.provider = params['provider'] || '';

      // Generate initial username from email
      if (this.email && !this.username) {
        this.username = this.email.split('@')[0];
      }

      if (!this.provider) {
        this.provider = 'google';
      }
    });
  }

  completeRegistration() {
    if (!this.isFormValid()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const registrationData = {
      provider: this.provider.toUpperCase(),
      email: this.email,
      fullName: this.fullName,
      username: this.username,
      avatarUrl: this.avatarUrl || undefined,
      bio: this.bio || undefined
    };

    this.authService.completeOAuthRegistration(registrationData).subscribe({
      next: (res: any) => {
        // Store tokens
        localStorage.setItem('token', res.accessToken);
        if (res.refreshToken) {
          localStorage.setItem('refreshToken', res.refreshToken);
        }
        localStorage.setItem('role', res.user.role);
        localStorage.setItem('user', JSON.stringify(res.user));
        localStorage.setItem('authProvider', this.provider);

        // Redirect to dashboard
        this.successMessage = 'Registration successful! Redirecting...';
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Registration failed. Please try again.';
      }
    });
  }

  isFormValid(): boolean {
    if (!this.username || !this.username.trim()) {
      this.errorMessage = 'Username is required';
      return false;
    }
    if (!this.fullName || !this.fullName.trim()) {
      this.errorMessage = 'Full name is required';
      return false;
    }
    if (this.username.length < 3 || this.username.length > 50) {
      this.errorMessage = 'Username must be between 3 and 50 characters';
      return false;
    }
    if (this.fullName.length > 120) {
      this.errorMessage = 'Full name must be less than 120 characters';
      return false;
    }
    if (this.bio && this.bio.length > 1000) {
      this.errorMessage = 'Bio must be less than 1000 characters';
      return false;
    }
    return true;
  }
}

