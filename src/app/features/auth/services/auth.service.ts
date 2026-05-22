import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/api/web/auth`;

  constructor(private http: HttpClient) {}

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials);
  }

  verifyOtp(data: { email: string, otp: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/verify-otp`, data);
  }

  validateOtp(data: { email: string, otp: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/validate-otp`, data);
  }

  resendOtp(data: { email: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/resend-otp`, data);
  }

  completeOAuthRegistration(data: {
    provider: string;
    email: string;
    fullName: string;
    username: string;
    avatarUrl?: string;
    bio?: string;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/oauth-login`, data);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
  }

  forgotPassword(data: { email: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/forgot-password`, data);
  }

  resetPassword(data: { email: string, otp: string, newPassword: string, confirmPassword: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, data);
  }
}

