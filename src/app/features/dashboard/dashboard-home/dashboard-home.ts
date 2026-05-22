import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ProjectService, Project } from '../../../core/services/project';
import { AuthService, UserResponse } from '../../../core/services/auth';
import { Router } from '@angular/router';
import { take, filter, switchMap, timeout, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard-home',
  templateUrl: './dashboard-home.html',
  styleUrls: ['./dashboard-home.css'],
  standalone: false
})
export class DashboardHomeComponent implements OnInit {
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);
  public router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  currentUser: UserResponse | null = null;
  myProjects: Project[] = [];
  isLoading = false;
  errorMessage = '';
  isModalOpen = false;

  ngOnInit() {
    this.authService.currentUser$.pipe(take(1)).subscribe(user => {
      this.currentUser = user;
      if (user && user.role === 'ADMIN') {
        this.router.navigate(['/admin']);
      }
    });
    this.loadProjects();
  }

  loadProjects() {
    this.isLoading = true;
    this.errorMessage = '';

    this.authService.currentUser$.pipe(
      filter(user => !!user),
      take(1),
      switchMap(user => {
        if (!user || !user.userId) throw new Error('Not logged in');
        return this.projectService.getProjectsByMember(user.userId);
      }),
      timeout(10000),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (projects) => {
        console.log('Dashboard projects loaded:', projects);
        this.myProjects = projects;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Dashboard load error:', err);
        this.isLoading = false;
        this.errorMessage = 'Could not load projects. Please ensure your session is active.';
        this.cdr.detectChanges();
      }
    });
  }

  openProject(projectId: string) {
    this.router.navigate(['/projects', projectId]);
  }

  get totalStars(): number {
    return this.myProjects.reduce((sum, p) => sum + (p.starCount || 0), 0);
  }

  get totalForks(): number {
    return this.myProjects.reduce((sum, p) => sum + (p.forkCount || 0), 0);
  }

  get publicCount(): number {
    return this.myProjects.filter(p => p.visibility === 'PUBLIC').length;
  }

  openNewProjectModal() {
    this.isModalOpen = true;
  }

  closeNewProjectModal() {
    this.isModalOpen = false;
  }

  onProjectCreated() {
    this.closeNewProjectModal();
    this.loadProjects();
  }
}
