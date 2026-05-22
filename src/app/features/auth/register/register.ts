import { Component, NgZone, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
  standalone: false
})
export class RegisterComponent {
  oauthBaseUrl = `${environment.apiUrl}/auth/oauth2/authorize`;
  fullName = '';
  username = '';
  email = '';
  password = '';
  avatarUrl = '';
  bio = '';
  errorMessage = '';
  isSubmitting = false;

  constructor(
    private router: Router, 
    private authService: AuthService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  register() {
    if (this.username && this.email && this.password && this.fullName && !this.isSubmitting) {
      this.isSubmitting = true;
      this.errorMessage = '';
      const userData = {
        fullName: this.fullName,
        username: this.username,
        email: this.email,
        password: this.password,
        avatarUrl: this.avatarUrl,
        bio: this.bio
      };

      this.authService.register(userData).subscribe({
        next: (response: any) => {
          this.ngZone.run(() => {
            console.log('Registration success response:', response);
            this.isSubmitting = false;
            
            if (response && response.success === false) {
              this.errorMessage = response.message || 'Registration failed';
              try {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              } catch (e) {}
              this.cdr.detectChanges();
              return;
            }
            
            localStorage.setItem('registration_email', this.email);
            this.router.navigate(['/auth/verify-email']);
            this.cdr.detectChanges();
          });
        },
        error: (err: any) => {
          this.ngZone.run(() => {
            console.error('Registration error:', err);
            this.isSubmitting = false;
            
            try {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } catch (e) {}

            if (err.status === 409) {
              this.errorMessage = (err.error?.message || 'Account already exists') + '. Please use a different username/email or sign in.';
            } else {
              this.errorMessage = err.error?.message || 'Registration failed';
            }
            
            this.cdr.detectChanges();
          });
        }
      });
    }
  }
}
