import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CreateProjectPayload, ProjectsService } from '../services/projects.service';

@Component({
  selector: 'app-create-project',
  standalone: false,
  templateUrl: './create-project.html',
  styleUrls: ['./create-project.css'],
})
export class CreateProject {
  name = '';
  description = '';
  language = 'Java';
  visibility: 'PUBLIC' | 'PRIVATE' = 'PUBLIC';
  isSubmitting = false;
  errorMessage = '';
  languages = ['Java', 'Python', 'C++', 'JavaScript'];

  constructor(private projectsService: ProjectsService, private router: Router) {}

  createProject() {
    if (!this.name.trim()) {
      this.errorMessage = 'Project name is required';
      return;
    }

    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const ownerId = user?.userId;
    if (!ownerId) {
      this.errorMessage = 'You must be signed in to create a project';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: CreateProjectPayload = {
      ownerId,
      name: this.name.trim(),
      description: this.description.trim() || undefined,
      language: this.language,
      visibility: this.visibility
    };

    this.projectsService.createProject(payload).subscribe({
      next: (project) => {
        this.isSubmitting = false;
        this.router.navigate(['/projects', project.projectId]);
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Failed to create project';
      }
    });
  }
}
