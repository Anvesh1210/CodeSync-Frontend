import { Component, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService, CreateProjectRequest } from '../../../core/services/project';
import { AuthService } from '../../../core/services/auth';
import { timeout } from 'rxjs/operators';

@Component({
  selector: 'app-new-project-modal',
  templateUrl: './new-project-modal.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class NewProjectModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() projectCreated = new EventEmitter<void>();

  projectName = '';
  projectDescription = '';
  projectLanguage = 'TypeScript';
  isPublic = true;
  errorMessage = '';
  isSubmitting = false;

  private projectService = inject(ProjectService);
  private authService = inject(AuthService);

  get isPremiumUser(): boolean {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return user?.premium || false;
  }

  closeModal() {
    this.close.emit();
  }

  createProject() {
    this.errorMessage = '';
    
    if (!this.projectName.trim()) {
      this.errorMessage = 'Project name is required';
      return;
    }

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const ownerId = user?.userId;

    if (!ownerId) {
      this.errorMessage = 'User not logged in';
      return;
    }

    this.isSubmitting = true;
    const request: CreateProjectRequest = {
      name: this.projectName,
      description: this.projectDescription,
      language: this.projectLanguage,
      visibility: this.isPublic ? 'PUBLIC' : 'PRIVATE',
      ownerId: ownerId,
      isPremium: user?.premium || false
    };

    this.projectService.createProject(request)
      .pipe(timeout(15000))
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.projectCreated.emit();
          this.closeModal();
        },
        error: (err: any) => {
          this.isSubmitting = false;
          if (err.name === 'TimeoutError') {
            this.errorMessage = 'Creation timed out. The project might still be creating in the background, please check the list in a moment.';
          } else {
            this.errorMessage = err.error?.message || 'Failed to create project';
          }
        }
      });
  }
}
