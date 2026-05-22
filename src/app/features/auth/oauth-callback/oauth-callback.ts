import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-oauth-callback',
  templateUrl: './oauth-callback.html',
  styleUrls: ['./oauth-callback.css'],
  standalone: false
})
export class OAuthCallbackComponent implements OnInit {
  constructor(
    private route: ActivatedRoute, 
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const refreshToken = params['refreshToken'];
      const provider = params['provider'];

      if (token) {
        localStorage.setItem('token', token);
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }
        if (provider) {
          localStorage.setItem('authProvider', provider);
        }

        // Fetch user profile before redirecting so AuthService doesn't clear the session
        this.http.get(`${environment.apiUrl}/api/web/auth/profile`, {
          headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
        }).subscribe({
          next: (user: any) => {
            localStorage.setItem('user', JSON.stringify(user));
            if (user && user.role) {
              localStorage.setItem('role', user.role);
            }
            // Redirect to dashboard
            window.location.href = '/dashboard';
          },
          error: (err) => {
            console.error('Failed to fetch user profile in oauth callback', err);
            this.router.navigate(['/auth/login'], {
              queryParams: { error: 'profile_fetch_failed' }
            });
          }
        });
      } else {
        const error = params['error'];
        const message = params['message'];
        console.error('OAuth callback error:', error, message);
        this.router.navigate(['/auth/login'], {
          queryParams: { error: error || 'authentication_failed' }
        });
      }
    });
  }
}



