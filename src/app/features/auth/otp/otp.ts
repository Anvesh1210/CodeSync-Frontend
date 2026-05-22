import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-otp',
  templateUrl: './otp.html',
  styleUrls: ['./otp.css'],
  standalone: false
})
export class OtpComponent implements OnInit {
  otpCode: string = '';
  email: string | null = '';
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
    this.email = localStorage.getItem('registration_email');
    if (!this.email) {
      this.router.navigate(['/auth/register']);
    }
  }

  verifyOtp() {
    if (this.otpCode && this.otpCode.length === 6 && this.email) {
      this.authService.verifyOtp({ email: this.email, otp: this.otpCode }).subscribe({
        next: (res: any) => {
          localStorage.removeItem('registration_email');
          localStorage.setItem('token', res.accessToken);
          if (res.refreshToken) {
            localStorage.setItem('refreshToken', res.refreshToken);
          }
          localStorage.setItem('role', res.user.role);
          localStorage.setItem('user', JSON.stringify(res.user));
          window.location.href = '/dashboard';
        },
        error: (err: any) => {
          this.errorMessage = err.error?.message || 'Invalid OTP';
          this.successMessage = '';
        }
      });
    }
  }

  resendOtp() {
    if (this.email) {
      this.authService.resendOtp({ email: this.email }).subscribe({
        next: () => {
          this.successMessage = 'OTP resent successfully';
          this.errorMessage = '';
        },
        error: (err: any) => {
          this.errorMessage = err.error?.message || 'Failed to resend OTP';
          this.successMessage = '';
        }
      });
    }
  }
}
