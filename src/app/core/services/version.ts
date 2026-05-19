import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Snapshot {
  id: string;
  fileId: string;
  projectId: string;
  authorId: string;
  message: string;
  content: string;
  branch: string;
  tag?: string;
  createdAt: string;
}

export interface SnapshotRequest {
  fileId: string;
  projectId: string;
  authorId: string;
  message: string;
  content: string;
  branch?: string;
}

@Injectable({
  providedIn: 'root',
})
export class VersionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/versions`;

  getHistory(fileId: string): Observable<Snapshot[]> {
    return this.http.get<Snapshot[]>(`${this.baseUrl}/history/${fileId}`);
  }

  getSnapshot(snapshotId: string): Observable<Snapshot> {
    return this.http.get<Snapshot>(`${this.baseUrl}/${snapshotId}`);
  }

  createSnapshot(request: SnapshotRequest): Observable<Snapshot> {
    return this.http.post<Snapshot>(this.baseUrl, request);
  }

  restoreSnapshot(snapshotId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${snapshotId}/restore`, {});
  }

  getDiff(fileId: string, commitA: string, commitB: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/diff?fileId=${fileId}&commitA=${commitA}&commitB=${commitB}`);
  }
}
