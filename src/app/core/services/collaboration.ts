import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { Subject, Observable, map, of, catchError } from 'rxjs';
import { ApiResponse } from '../models/api-response';

export interface CursorPosition {
  userId: string;
  line: number;
  col: number;
  color: string;
}

export interface CollabSession {
  sessionId: string;
  projectId: string;
  ownerId: string;
  projectOwnerId: string;
  isActive: boolean;
  createdAt: string;
}

export interface Participant {
  userId: string;
  userName?: string;
  sessionId: string;
  role: string;
  joinedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class CollaborationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/web/app/session`;

  private client!: Client;
  private participantSubject = new Subject<Participant[]>();
  private statusSubject = new Subject<'connected' | 'disconnected' | 'connecting'>();
  private sessionTerminatedSubject = new Subject<void>();

  public participants$ = this.participantSubject.asObservable();
  public status$ = this.statusSubject.asObservable();
  /** Emits once when the owner terminates the session (backend broadcasts ENDED) */
  public sessionTerminated$ = this.sessionTerminatedSubject.asObservable();

  connect(sessionId: string, token: string) {
    this.statusSubject.next('connecting');
    this.client = new Client({
      webSocketFactory: () => {
        // @ts-ignore
        return new SockJS(environment.wsUrl);
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`
      },
      debug: (str) => {
        // console.log(str);
      },
      onConnect: () => {
        this.statusSubject.next('connected');

        this.client.subscribe(`/topic/session/${sessionId}/participants`, (msg: Message) => {
          if (msg.body) {
            this.participantSubject.next(JSON.parse(msg.body));
          }
        });

        // Listen for session termination broadcast from the owner
        this.client.subscribe(`/topic/session/${sessionId}/status`, (msg: Message) => {
          if (msg.body) {
            const payload = JSON.parse(msg.body);
            if (payload.status === 'ENDED') {
              this.sessionTerminatedSubject.next();
            }
          }
        });
      }
    });

    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.statusSubject.next('disconnected');
    }
  }

  // REST Endpoints
  createSession(projectId: string, hostId: string, isPremium: boolean = false): Observable<CollabSession> {
    console.log('[CollaborationService] Creating session. projectId:', projectId, 'hostId:', hostId, 'isPremium:', isPremium);
    return this.http.post<ApiResponse<CollabSession>>(`${this.baseUrl}/start`, { projectId, ownerId: hostId, isPremium })
      .pipe(
        map(res => {
          console.log('[CollaborationService] Response:', res);
          return res.data;
        })
      );
  }

  getSession(sessionId: string): Observable<CollabSession> {
    return this.http.get<ApiResponse<CollabSession>>(`${this.baseUrl}/${sessionId}`)
      .pipe(map(res => res.data));
  }

  getActiveSessionForProject(projectId: string): Observable<CollabSession | null> {
    return this.http.get<ApiResponse<CollabSession>>(`${this.baseUrl}/project/${projectId}`)
      .pipe(
        map(res => res.data),
        catchError(() => of(null))
      );
  }

  joinSession(sessionId: string, userId: string): Observable<CollabSession> {
    return this.http.post<ApiResponse<CollabSession>>(`${this.baseUrl}/${sessionId}/join`, { userId })
      .pipe(map(res => res.data));
  }

  leaveSession(sessionId: string, userId: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${sessionId}/leave?userId=${userId}`, {})
      .pipe(map(res => res.data));
  }

  endSession(sessionId: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${sessionId}/end`, {})
      .pipe(map(res => res.data));
  }

  getParticipants(sessionId: string): Observable<Participant[]> {
    return this.http.get<ApiResponse<Participant[]>>(`${this.baseUrl}/${sessionId}/participants`)
      .pipe(map(res => res.data));
  }

  kickParticipant(sessionId: string, targetUserId: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${sessionId}/kick?targetUserId=${targetUserId}`, {})
      .pipe(map(res => res.data));
  }

  inviteToSession(sessionId: string, username: string): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/${sessionId}/invite?username=${username}`, {})
      .pipe(map(res => res.data));
  }

}
