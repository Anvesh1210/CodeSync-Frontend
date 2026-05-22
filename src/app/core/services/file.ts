import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models/api-response';

export interface CodeFile {
  fileId: string;
  projectId: string;
  name: string;
  path: string;
  language: string;
  content: string;
  isFolder: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  children?: CodeFile[];
}

export interface FileRequest {
  projectId: string;
  name: string;
  path: string;
  language: string;
  content: string;
  isFolder: boolean;
  parentId?: string;
  userId?: string;
  isPremium?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/web/app/file`;

  getFileTree(projectId: string): Observable<CodeFile[]> {
    return this.http.get<ApiResponse<CodeFile[]>>(`${environment.apiUrl}/api/web/app/file/tree/${projectId}`)
      .pipe(map(res => res.data));
  }

  getFileContent(fileId: string): Observable<CodeFile> {
    return this.http.get<ApiResponse<CodeFile>>(`${this.baseUrl}/${fileId}`)
      .pipe(map(res => res.data));
  }

  createFile(fileData: FileRequest): Observable<CodeFile> {
    return this.http.post<ApiResponse<CodeFile>>(`${this.baseUrl}/create`, fileData)
      .pipe(map(res => res.data));
  }

  createFolder(fileData: FileRequest): Observable<CodeFile> {
    return this.http.post<ApiResponse<CodeFile>>(`${this.baseUrl}/create`, fileData)
      .pipe(map(res => res.data));
  }

  updateFileContent(fileId: string, content: string, userId: string, isPremium: boolean = false): Observable<CodeFile> {
    return this.http.put<ApiResponse<CodeFile>>(`${this.baseUrl}/${fileId}/content`, { content, userId, isPremium })
      .pipe(map(res => res.data));
  }

  renameFile(fileId: string, newName: string, userId: string): Observable<CodeFile> {
    const params = { newName, userId };
    return this.http.put<ApiResponse<CodeFile>>(`${this.baseUrl}/${fileId}/rename`, null, { params })
      .pipe(map(res => res.data));
  }

  deleteFile(fileId: string, userId: string): Observable<any> {
    const params = { userId };
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/${fileId}/delete`, { params })
      .pipe(map(res => res.data));
  }

  restoreFile(fileId: string, versionId: string): Observable<CodeFile> {
    return this.http.post<ApiResponse<CodeFile>>(`${this.baseUrl}/${fileId}/restore`, { versionId })
      .pipe(map(res => res.data));
  }
}
