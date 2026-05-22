import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Client, Message } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export interface ExecutionRequest {
  projectId: string;
  fileId: string;
  userId: string;
  language: string;
  sourceCode: string;
  stdin?: string;
  fileName?: string;
  isPremium?: boolean;
}

export interface ExecutionJob {
  jobId: string;
  projectId: string;
  fileId: string;
  language: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIME_OUT' | 'CANCELLED';
  stdout: string;
  stderr: string;
  exitCode: number;
  submittedAt: string;
  completedAt: string;
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  severity: string;
}

export interface LanguageInfo {
  name: string;
  version: string;
  displayName: string;
  extension: string;
  boilerplate: string;
  defaultFileName?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ExecutionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/executions`;
  private wsUrl = `${environment.apiUrl}/ws-execution`;

  private client: Client | null = null;
  private outputSubject = new Subject<string>();
  private statusSubject = new Subject<string>();

  public output$ = this.outputSubject.asObservable();
  public status$ = this.statusSubject.asObservable();

  submitExecution(jobRequest: ExecutionRequest): Observable<ExecutionJob> {
    return this.http.post<ExecutionJob>(`${this.baseUrl}`, jobRequest);
  }

  getJobStatus(jobId: string): Observable<ExecutionJob> {
    return this.http.get<ExecutionJob>(`${this.baseUrl}/${jobId}`);
  }

  getJobsByProject(projectId: string): Observable<ExecutionJob[]> {
    return this.http.get<ExecutionJob[]>(`${this.baseUrl}/project/${projectId}`);
  }

  cancelExecution(jobId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${jobId}/cancel`, {});
  }

  lintCode(jobRequest: ExecutionRequest): Observable<SyntaxError[]> {
    return this.http.post<SyntaxError[]>(`${this.baseUrl}/lint`, jobRequest);
  }

  getSupportedLanguages(): Observable<LanguageInfo[]> {
    return this.http.get<LanguageInfo[]>(`${this.baseUrl}/languages`);
  }

  getLanguageVersion(language: string): Observable<LanguageInfo> {
    return this.http.get<LanguageInfo>(`${this.baseUrl}/languages/${language}`);
  }


  private isConnecting = false;

  connectToExecution(jobId: string) {
    console.log(`[ExecutionService] Connecting to execution jobId: ${jobId}`);
    
    if (this.client && this.client.active) {
      console.log('[ExecutionService] Deactivating existing client before new connection');
      this.client.deactivate();
    }

    this.isConnecting = true;
    this.client = new Client({
      webSocketFactory: () => {
        console.log(`[ExecutionService] WebSocket Factory creating SockJS to ${this.wsUrl}`);
        return new SockJS(this.wsUrl);
      },
      onConnect: (frame) => {
        console.log(`[ExecutionService] STOMP Connected: ${frame.command}`);
        this.isConnecting = false;
        
        console.log(`[ExecutionService] Subscribing to /topic/execution/${jobId}/output`);
        this.client?.subscribe(`/topic/execution/${jobId}/output`, (msg: Message) => {
          console.log(`[ExecutionService] Received output: ${msg.body.substring(0, 50)}${msg.body.length > 50 ? '...' : ''}`);
          this.outputSubject.next(msg.body);
        });

        console.log(`[ExecutionService] Subscribing to /topic/execution/${jobId}/status`);
        this.client?.subscribe(`/topic/execution/${jobId}/status`, (msg: Message) => {
          console.log(`[ExecutionService] Received status: ${msg.body}`);
          this.statusSubject.next(msg.body);
        });
      },
      onStompError: (frame) => {
        console.error('[ExecutionService] STOMP Error:', frame.headers['message']);
        console.error('[ExecutionService] Additional details:', frame.body);
        this.isConnecting = false;
      },
      onWebSocketClose: (evt) => {
        console.log('[ExecutionService] WebSocket Closed:', evt);
        this.isConnecting = false;
      },
      onDisconnect: () => {
        console.log('[ExecutionService] STOMP Disconnected');
        this.isConnecting = false;
      },
      debug: (str) => {
        if (!str.includes('PONG') && !str.includes('PING')) {
          console.log('[ExecutionService STOMP Debug]', str);
        }
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000
    });

    console.log('[ExecutionService] Activating STOMP client');
    this.client.activate();
  }

  disconnect() {
    if (this.client) {
      console.log('[ExecutionService] Disconnecting STOMP client manually');
      this.client.deactivate();
      this.client = null;
    }
  }
}
