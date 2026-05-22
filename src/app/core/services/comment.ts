import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Comment {
  id: string;
  fileId: string;
  projectId: string;
  authorId: string;
  lineNumber: number;
  text: string;
  resolved: boolean;
  parentId?: string;
  createdAt: string;
  replies?: Comment[];
}

export interface CommentRequest {
  fileId: string;
  projectId: string;
  authorId: string;
  lineNumber: number;
  text: string;
  parentId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/comments`;

  getCommentsByFile(fileId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.baseUrl}/file/${fileId}`);
  }

  addComment(request: CommentRequest): Observable<Comment> {
    return this.http.post<Comment>(this.baseUrl, request);
  }

  resolveComment(commentId: string): Observable<Comment> {
    return this.http.put<Comment>(`${this.baseUrl}/${commentId}/resolve`, {});
  }
}
