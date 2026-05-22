import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { Subject, Observable, map } from 'rxjs';
import { ApiResponse } from '../models/api-response';

export interface Notification {
  notificationId: number;
  recipientId: string;
  actorId: string;
  type: string;
  title: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/web/app/notifications`;
  private wsUrl = `${environment.apiUrl}/notifications-ws`; // Directly to notification-service or via gateway

  private client!: Client;
  private notificationSubject = new Subject<Notification>();
  public notifications$ = this.notificationSubject.asObservable();

  connect(userId: string) {
    this.client = new Client({
      webSocketFactory: () => {
        // @ts-ignore
        return new SockJS(this.wsUrl);
      },
      debug: (str) => {
        // console.log(str);
      },
      onConnect: () => {
        this.client.subscribe(`/topic/notifications/${userId}`, (msg: Message) => {
          if (msg.body) {
            this.notificationSubject.next(JSON.parse(msg.body));
          }
        });
      }
    });

    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
    }
  }

  getNotifications(userId: string): Observable<Notification[]> {
    return this.http.get<ApiResponse<Notification[]>>(`${this.baseUrl}/${userId}`)
      .pipe(map(res => res.data));
  }

  markAsRead(notificationId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/${notificationId}/read`, {});
  }

  markAllAsRead(userId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/recipient/${userId}/readAll`, {});
  }
}
