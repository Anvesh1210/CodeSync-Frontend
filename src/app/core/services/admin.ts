import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/web/admin`;

  // ── Users ────────────────────────────────────────────────────────────────
  getUsers(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/users`).pipe(
      map((res: any) => {
        if (res && res.data) return res.data;
        if (Array.isArray(res)) return res;
        return [];
      })
    );
  }

  suspendUser(userId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/users/${userId}/suspend`, {});
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${userId}/delete`);
  }

  // ── Projects ─────────────────────────────────────────────────────────────
  getProjects(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/projects`).pipe(
      map((res: any) => {
        if (res && res.data) return Array.isArray(res.data) ? res.data : [];
        if (Array.isArray(res)) return res;
        return [];
      })
    );
  }

  deleteProject(projectId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/projects/${projectId}/delete`);
  }

  // ── Sessions ─────────────────────────────────────────────────────────────
  getSessions(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/sessions/active`).pipe(
      map((res: any) => {
        if (res && res.data) return Array.isArray(res.data) ? res.data : [];
        if (Array.isArray(res)) return res;
        return [];
      })
    );
  }

  terminateSession(sessionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/sessions/${sessionId}/end`, {});
  }

  // ── Executions ───────────────────────────────────────────────────────────
  getExecutions(): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/executions`).pipe(
      map((res: any) => {
        if (res && res.data) return Array.isArray(res.data) ? res.data : [];
        if (Array.isArray(res)) return res;
        return [];
      })
    );
  }

  cancelExecution(executionId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/executions/${executionId}/cancel`, {});
  }

  // ── Notifications ───────────────────────────────────────────────────────
  sendNotification(notification: any): Observable<any> {
    return this.http.post(`${environment.apiUrl}/notifications`, notification);
  }

  sendBroadcast(recipientIds: string[], title: string, message: string): Observable<any> {
    const params = { title, message };
    return this.http.post(`${environment.apiUrl}/notifications/bulk`, recipientIds, { params });
  }

  getAllNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/notifications`);
  }

  // ── Payments ─────────────────────────────────────────────────────────────
  getSubscriptions(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/payments/admin/subscriptions`);
  }

  getTransactions(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/payments/admin/transactions`);
  }

  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/notifications/${id}`);
  }

  terminateSubscription(userId: string): Observable<any> {
    // Correcting the cancel endpoint: it expects a UUID userId
    return this.http.post(`${environment.apiUrl}/payments/cancel?userId=${userId}`, {});
  }
}
