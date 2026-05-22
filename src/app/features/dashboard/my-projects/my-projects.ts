import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { ProjectService, Project } from '../../../core/services/project';
import { AuthService } from '../../../core/services/auth';
import { take, filter, switchMap, timeout, finalize } from 'rxjs/operators';

@Component({
  selector: 'app-my-projects',
  templateUrl: './my-projects.html',
  styleUrl: './my-projects.css',
  standalone: false
})
export class MyProjects implements OnInit {
  private projectService = inject(ProjectService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  projects: Project[] = [];
  isLoading = false;
  errorMessage = '';
  searchQuery = '';
  isModalOpen = false;

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.isLoading = true;
    this.errorMessage = '';

    // Wait for user to be available, then fetch projects
    this.authService.currentUser$.pipe(
      filter(user => !!user),
      take(1),
      switchMap(user => {
        if (!user || !user.userId) throw new Error('User not logged in');
        return this.projectService.getProjectsByOwner(user.userId);
      }),
      timeout(10000),
      finalize(() => this.isLoading = false)
    ).subscribe({
      next: (projects) => {
        console.log('My projects loaded:', projects);
        this.projects = projects;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Project loading error:', err);
        this.isLoading = false;
        if (err.name === 'TimeoutError') {
          this.errorMessage = 'The server is taking too long to respond. Please check your connection.';
        } else {
          this.errorMessage = 'Unable to load projects. Ensure your session is active.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  get filteredProjects(): Project[] {
    if (!this.searchQuery.trim()) return this.projects;
    const q = this.searchQuery.toLowerCase();
    return this.projects.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q) ||
      p.language.toLowerCase().includes(q)
    );
  }

  openProject(projectId: string) {
    this.router.navigate(['/projects', projectId]);
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

  getLanguageColor(language: string): string {
    const colors: Record<string, string> = {
      'TypeScript': '#3178c6',
      'JavaScript': '#f7df1e',
      'Python': '#3572A5',
      'Java': '#b07219',
      'Go': '#00ADD8',
      'Rust': '#dea584',
      'C++': '#f34b7d',
      'C#': '#178600',
      'Ruby': '#701516',
      'PHP': '#4F5D95',
    };
    return colors[language] || '#64748b';
  }
}
