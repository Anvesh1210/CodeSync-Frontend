import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
  standalone: false
})
export class LoginComponent {
  oauthBaseUrl = `${environment.apiUrl}/auth/oauth2/authorize`;
  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private router: Router, 
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  login() {
    if (!this.username || !this.password) return;
    
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login({ email: this.username, password: this.password }).subscribe({
      next: (res: any) => {
        console.log('Login successful', res);
        this.isLoading = false;
        localStorage.setItem('token', res.accessToken);
        if (res.refreshToken) {
          localStorage.setItem('refreshToken', res.refreshToken);
        }
        localStorage.setItem('role', res.user.role);
        localStorage.setItem('user', JSON.stringify(res.user));
        
        this.cdr.detectChanges();
        
        if (res.user.role === 'ADMIN') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      },
      error: (err: any) => {
        try {
          console.error('Login error full object:', err);
          this.isLoading = false;
          
          if (err.status === 401) {
            this.errorMessage = 'Invalid email/username or password. Please try again.';
          } else if (err.status === 403) {
            this.errorMessage = 'Account not verified. Please check your email for OTP.';
          } else if (err.status === 0) {
            this.errorMessage = 'Network error. Please check if the API Gateway (Port 8762) is running.';
          } else {
            this.errorMessage = err.error?.message || err.message || 'An unexpected error occurred during login.';
          }
        } catch (e) {
          console.error('Exception in login error handler:', e);
          this.isLoading = false;
          this.errorMessage = 'An error occurred while processing the login failure.';
        } finally {
          this.cdr.detectChanges();
        }
      }
    });
  }
}
