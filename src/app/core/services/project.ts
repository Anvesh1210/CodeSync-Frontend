import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  username: string;
  role: string;
  joinedAt: string;
}

export interface Project {
  projectId: string;
  name: string;
  description: string;
  language: string;
  visibility: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  starCount: number;
  forkCount: number;
  members?: ProjectMember[];
}

export interface CreateProjectRequest {
  name: string;
  description: string;
  language: string;
  visibility: string;
  ownerId: string;
  isPremium: boolean;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  visibility?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/web/projects`;

  getProjectsByOwner(ownerId: string): Observable<Project[]> {
    return this.http.get<ApiResponse<Project[]>>(`${this.baseUrl}/owner/${ownerId}`)
      .pipe(map(res => res.data));
  }

  getProjectsByMember(userId: string): Observable<Project[]> {
    return this.http.get<ApiResponse<Project[]>>(`${this.baseUrl}/member/${userId}`)
      .pipe(map(res => res.data));
  }

  getPublicProjects(): Observable<Project[]> {
    return this.http.get<ApiResponse<Project[]>>(`${this.baseUrl}/public`)
      .pipe(map(res => res.data));
  }

  searchProjects(query: string): Observable<Project[]> {
    return this.http.get<ApiResponse<Project[]>>(`${this.baseUrl}/search?query=${query}`)
      .pipe(map(res => res.data));
  }

  getProjectById(projectId: string, userId?: string): Observable<Project> {
    const url = userId ? `${this.baseUrl}/${projectId}?userId=${userId}` : `${this.baseUrl}/${projectId}`;
    return this.http.get<ApiResponse<Project>>(url)
      .pipe(map(res => res.data));
  }

  createProject(projectData: CreateProjectRequest): Observable<Project> {
    return this.http.post<ApiResponse<Project>>(this.baseUrl, projectData)
      .pipe(map(res => res.data));
  }

  updateProject(projectId: string, projectData: UpdateProjectRequest): Observable<Project> {
    return this.http.put<ApiResponse<Project>>(`${this.baseUrl}/${projectId}`, projectData)
      .pipe(map(res => res.data));
  }

  deleteProject(projectId: string): Observable<any> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${projectId}`)
      .pipe(map(res => res.data));
  }

  forkProject(projectId: string, ownerId: string): Observable<Project> {
    return this.http.post<ApiResponse<Project>>(`${this.baseUrl}/${projectId}/fork`, { ownerId })
      .pipe(map(res => res.data));
  }

  starProject(projectId: string, userId: string): Observable<any> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/${projectId}/star`, { userId })
      .pipe(map(res => res.data));
  }
}
