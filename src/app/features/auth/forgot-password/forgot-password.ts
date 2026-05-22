import { Component, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css'],
  standalone: false
})
export class ForgotPasswordComponent {
  step: 'REQUEST_OTP' | 'VERIFY_OTP' | 'RESET_PASSWORD' = 'REQUEST_OTP';
  
  email = '';
  otp = '';
  newPassword = '';
  confirmPassword = '';
  
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  requestOtp() {
    if (!this.email) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    this.authService.forgotPassword({ email: this.email }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.successMessage = res.message || 'OTP sent to your email';
        this.step = 'VERIFY_OTP';
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to send OTP. Please try again.';
        this.cdr.detectChanges();
      }
    });
  }

  verifyOtpStep() {
    if (!this.otp) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    this.authService.validateOtp({ email: this.email, otp: this.otp }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.step = 'RESET_PASSWORD';
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Invalid or expired OTP.';
        this.cdr.detectChanges();
      }
    });
  }

  resetPassword() {
    if (!this.newPassword || !this.confirmPassword) return;
    
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }
    
    if (this.newPassword.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const data = {
      email: this.email,
      otp: this.otp,
      newPassword: this.newPassword,
      confirmPassword: this.confirmPassword
    };

    this.authService.resetPassword(data).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.successMessage = 'Password reset successfully. Redirecting to login...';
        this.cdr.detectChanges();
        
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err: any) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to reset password. The OTP might be invalid or expired.';
        
        // If OTP is invalid, maybe push them back to OTP step
        if (err.status === 401) {
            this.step = 'VERIFY_OTP';
        }
        this.cdr.detectChanges();
      }
    });
  }
}
