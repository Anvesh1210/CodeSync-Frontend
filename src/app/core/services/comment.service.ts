import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Comment {
  commentId: string;
  projectId: string;
  fileId: string;
  authorId: string;
  content: string;
  lineNumber: number | null;
  columnNumber: number | null;
  parentCommentId: string | null;
  resolved: boolean;
  snapshotId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  projectId: string;
  fileId: string;
  authorId: string;
  content: string;
  lineNumber?: number;
  columnNumber?: number;
  parentCommentId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/comments`;

  addComment(request: CreateCommentRequest): Observable<Comment> {
    return this.http.post<Comment>(this.baseUrl, request);
  }

  getCommentsByFile(fileId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.baseUrl}/file/${fileId}`);
  }

  getCommentsByProject(projectId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.baseUrl}/project/${projectId}`);
  }

  getCommentById(commentId: string): Observable<Comment> {
    return this.http.get<Comment>(`${this.baseUrl}/${commentId}`);
  }

  getReplies(commentId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.baseUrl}/${commentId}/replies`);
  }

  updateComment(commentId: string, content: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.baseUrl}/${commentId}`, content, {
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  resolveComment(commentId: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.baseUrl}/${commentId}/resolve`, {});
  }

  unresolveComment(commentId: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.baseUrl}/${commentId}/unresolve`, {});
  }

  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${commentId}`);
  }

  getCommentCount(fileId: string): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/file/${fileId}/count`);
  }
}
