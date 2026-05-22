import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Snapshot {
  snapshotId: string;
  projectId: string;
  fileId: string;
  authorId: string;
  message: string;
  content: string;
  hash: string;
  parentSnapshotId: string | null;
  branch: string;
  tag: string | null;
  createdAt: string;
}

export interface SnapshotRequest {
  projectId: string;
  fileId: string;
  authorId: string;
  message: string;
  content: string;
  branch?: string;
}

export interface DiffResult {
  oldSnapshotId: string;
  newSnapshotId: string;
  differences: string[];
}

@Injectable({
  providedIn: 'root',
})
export class VersionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/versions`;

  createSnapshot(request: SnapshotRequest): Observable<Snapshot> {
    return this.http.post<Snapshot>(this.baseUrl, request);
  }

  getSnapshotById(id: string): Observable<Snapshot> {
    return this.http.get<Snapshot>(`${this.baseUrl}/${id}`);
  }

  getSnapshotsByFile(fileId: string): Observable<Snapshot[]> {
    return this.http.get<Snapshot[]>(`${this.baseUrl}/file/${fileId}`);
  }

  getSnapshotsByProject(projectId: string): Observable<Snapshot[]> {
    return this.http.get<Snapshot[]>(`${this.baseUrl}/project/${projectId}`);
  }

  getFileHistory(fileId: string): Observable<Snapshot[]> {
    return this.http.get<Snapshot[]>(`${this.baseUrl}/history/${fileId}`);
  }

  getLatestSnapshot(fileId: string): Observable<Snapshot> {
    return this.http.get<Snapshot>(`${this.baseUrl}/latest/${fileId}`);
  }

  restoreSnapshot(snapshotId: string, authorId: string): Observable<Snapshot> {
    return this.http.post<Snapshot>(
      `${this.baseUrl}/${snapshotId}/restore?authorId=${authorId}`,
      {}
    );
  }

  diffSnapshots(oldId: string, newId: string): Observable<DiffResult> {
    return this.http.get<DiffResult>(
      `${this.baseUrl}/diff?oldId=${oldId}&newId=${newId}`
    );
  }

  tagSnapshot(snapshotId: string, tag: string): Observable<Snapshot> {
    return this.http.post<Snapshot>(
      `${this.baseUrl}/${snapshotId}/tag?tag=${tag}`,
      {}
    );
  }
}
