import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Project, ProjectsService } from '../services/projects.service';
import { FileService, CodeFile } from '../../../core/services/file';
import { finalize, timeout } from 'rxjs';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.html',
  standalone: false
})
export class ProjectDetailComponent implements OnInit {
  projectId: string = '';
  project: Project | null = null;
  files: CodeFile[] = [];
  isLoading = false;
  errorMessage = '';
  isStarring = false;
  isOwner = false;
  isAdmin = false;
  isDeleting = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectsService: ProjectsService,
    private fileService: FileService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.projectId) {
      this.errorMessage = 'Project id is missing';
      return;
    }
    this.loadProject();
  }

  private loadProject() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const storedUser = localStorage.getItem('user');
      const user = storedUser ? JSON.parse(storedUser) : null;
      const userId = user?.userId;

      console.log('Loading project:', this.projectId, 'for user:', userId);

      this.projectsService.getProjectById(this.projectId, userId)
        .pipe(
          timeout(10000),
          finalize(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
            console.log('Project request finalized');
          })
        )
        .subscribe({
          next: (project) => {
            console.log('Project received:', project);
            if (!project) {
              this.errorMessage = 'Project data is empty.';
              this.cdr.detectChanges();
              return;
            }
            this.project = project;
            this.isAdmin = user?.role === 'ADMIN' || localStorage.getItem('role') === 'ADMIN';
            this.isOwner = (user && user.userId === project.ownerId) || this.isAdmin;
            this.loadFileTree();
            this.cdr.detectChanges();
          },
          error: (err) => {
            console.error('Project load error:', err);
            if (err.name === 'TimeoutError') {
              this.errorMessage = 'Request timed out. Please check your network or if the Project Service is running.';
            } else {
              this.errorMessage = err.error?.message || 'Failed to load project details. Status: ' + err.status;
            }
            this.cdr.detectChanges();
          }
        });
    } catch (error) {
      console.error('Critical error in loadProject:', error);
      this.isLoading = false;
      this.errorMessage = 'A local error occurred while preparing the request.';
    }
  }

  private loadFileTree() {
    this.fileService.getFileTree(this.projectId).subscribe({
      next: (files) => {
        this.files = files;
      },
      error: (err) => {
        console.error('Failed to load file tree', err);
      }
    });
  }

  openWorkspace() {
    this.router.navigate(['/editor', this.projectId]);
  }

  starProject() {
    if (!this.project) {
      return;
    }
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.userId;
    if (!userId) {
      this.errorMessage = 'Please sign in to star this project';
      return;
    }

    this.isStarring = true;
    this.projectsService.starProject(this.project.projectId, userId).subscribe({
      next: (updatedProject) => {
        this.project = updatedProject;
        this.isStarring = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to star project';
        this.isStarring = false;
      }
    });
  }

  deleteProject() {
    if (!this.project || !this.isOwner) {
      return;
    }

    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    this.isDeleting = true;
    this.projectsService.deleteProject(this.project.projectId).subscribe({
      next: () => {
        this.isDeleting = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Failed to delete project';
        this.isDeleting = false;
      }
    });
  }
}
