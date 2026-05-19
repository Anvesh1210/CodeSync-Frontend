import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response';

export interface Project {
  projectId: string;
  ownerId: string;
  name: string;
  description: string;
  language: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  starCount: number;
  forkCount: number;
  sourceProjectId?: string | null;
  memberUserIds?: string[];
  ownerUsername?: string;
  members?: any[];
}

export interface CreateProjectPayload {
  ownerId: string;
  name: string;
  description?: string;
  language: string;
  visibility: 'PUBLIC' | 'PRIVATE';
  memberUserIds?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ProjectsService {
  private apiUrl = `${environment.apiUrl}/api/web/projects`;

  constructor(private http: HttpClient) {}

  getPublicProjects(): Observable<Project[]> {
    return this.http.get<ApiResponse<Project[]>>(`${this.apiUrl}/public`)
      .pipe(map(res => res.data));
  }

  searchProjects(query: string): Observable<Project[]> {
    return this.http.get<ApiResponse<Project[]>>(`${this.apiUrl}/search`, { params: { query } })
      .pipe(map(res => res.data));
  }

  getProjectById(projectId: string, userId?: string): Observable<Project> {
    const params: any = {};
    if (userId) params.userId = userId;
    // Use the enriched /app/project endpoint for IDE-level project data
    return this.http.get<ApiResponse<Project>>(`${environment.apiUrl}/api/web/app/project/${projectId}`, { params })
      .pipe(map(res => res.data));
  }

  createProject(payload: CreateProjectPayload): Observable<Project> {
    return this.http.post<ApiResponse<Project>>(this.apiUrl, payload)
      .pipe(map(res => res.data));
  }

  starProject(projectId: string, userId: string): Observable<Project> {
    return this.http.put<ApiResponse<Project>>(`${this.apiUrl}/${projectId}/star`, { userId })
      .pipe(map(res => res.data));
  }

  deleteProject(projectId: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${projectId}`)
      .pipe(map(res => res.data));
  }

  joinProject(projectId: string, userId: string): Observable<any> {
    // Note: using /api/web/app path as defined in EditorController
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/api/web/app/project/${projectId}/join`, null, {
      params: { userId }
    }).pipe(map(res => res.data));
  }

  getContributors(projectId: string): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}/api/web/app/project/${projectId}/contributors`)
      .pipe(map(res => res.data));
  }

  addMember(projectId: string, userId: string, role: string = 'COLLABORATOR'): Observable<any> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/${projectId}/members/${userId}`, null, {
      params: { role }
    }).pipe(map(res => res.data));
  }

  getProjectMembers(projectId: string): Observable<any[]> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/${projectId}/members`)
      .pipe(map(res => res.data));
  }
}
