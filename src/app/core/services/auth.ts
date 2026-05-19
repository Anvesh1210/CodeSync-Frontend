import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserResponse {
  userId: string;
  username: string;
  email: string;
  role: string;
  fullName?: string;
  createdAt?: string;
  avatarUrl?: string;
  bio?: string;
  active?: boolean;
  premium?: boolean;
  planType?: string;
  subscriptionStart?: string;
  subscriptionExpiry?: string;
  provider?: string;
}

export interface AuthResponse {
  accessToken: string | null;
  refreshToken: string;
  tokenType: string | null;
  expiresAt: number;
  user: UserResponse;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/web/auth`;

  private currentUserSubject = new BehaviorSubject<UserResponse | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    this.checkInitialAuth();
  }

  private checkInitialAuth() {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (userStr && token) {
      try {
        // Set immediate local state for fast UI rendering
        this.currentUserSubject.next(JSON.parse(userStr));
        // Silently fetch latest state from server to sync claims (like premium upgrades)
        this.validateToken().subscribe({
          error: () => this.logout() // If token is invalid, clear session
        });
      } catch (e) {
        this.logout();
      }
    } else {
      this.logout();
    }
  }

  login(credentials: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login`, credentials).pipe(
      tap(res => this.setSession(res))
    );
  }

  register(userData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/register`, userData);
  }

  oauthLogin(oauthData: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/oauth-login`, oauthData).pipe(
      tap(res => this.setSession(res))
    );
  }

  refreshToken(refreshToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/refresh`, { refreshToken }).pipe(
      tap(res => this.setSession(res))
    );
  }

  logout(): void {
    const token = localStorage.getItem('token');
    if (token) {
      this.http.post(`${this.baseUrl}/logout`, {}, {
        headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
      }).subscribe({
        error: () => {} 
      });
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    this.currentUserSubject.next(null);
  }

  private setSession(authResult: AuthResponse): void {
    if (authResult.accessToken) {
      localStorage.setItem('token', authResult.accessToken);
      localStorage.setItem('refreshToken', authResult.refreshToken);
      localStorage.setItem('user', JSON.stringify(authResult.user));
      localStorage.setItem('role', authResult.user.role);
      this.currentUserSubject.next(authResult.user);
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }
  
  validateToken(): Observable<UserResponse> {
    const token = this.getToken();
    if (!token) return new Observable(obs => obs.error('No token'));
    
    return this.http.get<UserResponse>(`${this.baseUrl}/profile`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    }).pipe(
      tap(user => {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  updateProfile(profileData: any): Observable<UserResponse> {
    const token = this.getToken();
    return this.http.put<UserResponse>(`${this.baseUrl}/profile`, profileData, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    }).pipe(
      tap(user => {
        localStorage.setItem('user', JSON.stringify(user));
        this.currentUserSubject.next(user);
      })
    );
  }

  changePassword(passwordData: any): Observable<any> {
    const token = this.getToken();
    return this.http.put(`${this.baseUrl}/password`, passwordData, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    });
  }
}
