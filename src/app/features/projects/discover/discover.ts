import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Project, ProjectsService } from '../services/projects.service';
import { timeout, finalize } from 'rxjs/operators';

interface DiscoverProject {
  id: string;
  name: string;
  ownerId: string;
  author: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  visibility: 'PUBLIC' | 'PRIVATE';
}

@Component({
  selector: 'app-discover',
  templateUrl: './discover.html',
  standalone: false
})
export class DiscoverComponent implements OnInit {
  allProjects: DiscoverProject[] = [];
  projects: DiscoverProject[] = [];
  filters = ['ALL', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'JavaScript', 'C++', 'Ruby', 'Other'];
  activeFilter = 'ALL';
  searchQuery = '';
  ownerQuery = '';
  isLoading = false;
  errorMessage = '';
  private router = inject(Router);
  private projectsService = inject(ProjectsService);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.loadPublicProjects();
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
    this.applyFilters();
  }

  onFiltersChanged() {
    this.applyFilters();
  }

  private loadPublicProjects() {
    this.isLoading = true;
    this.errorMessage = '';
    this.projectsService.getPublicProjects()
      .pipe(
        timeout(10000),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (projects) => {
          console.log('Public projects loaded:', projects);
          this.isLoading = false; // Set to false immediately so UI can show data
          if (Array.isArray(projects)) {
            this.allProjects = projects.map((project) => this.toDiscoverProject(project));
            this.applyFilters();
            this.cdr.detectChanges();
          } else {
            console.warn('Expected array of projects, got:', projects);
          }
        },
        error: (err) => {
          console.error('Failed to load public projects:', err);
          if (err.name === 'TimeoutError') {
            this.errorMessage = 'The project list is taking too long to load. Try refreshing.';
          } else {
            this.errorMessage = err.error?.message || 'Failed to load projects';
          }
        }
      });
  }

  private applyFilters() {
    const query = this.searchQuery.trim().toLowerCase();
    const owner = this.ownerQuery.trim().toLowerCase();
    this.projects = this.allProjects.filter((project) => {
      const languageMatch =
        this.activeFilter === 'ALL' ||
        (this.activeFilter === 'Other'
          ? !this.filters.includes(project.language)
          : project.language.toLowerCase() === this.activeFilter.toLowerCase());
      const queryMatch =
        !query ||
        project.name.toLowerCase().includes(query) ||
        project.description.toLowerCase().includes(query);
      const ownerMatch =
        !owner ||
        project.ownerId.toLowerCase().includes(owner) ||
        project.author.toLowerCase().includes(owner);
      return languageMatch && queryMatch && ownerMatch;
    });
  }

  private toDiscoverProject(project: Project): DiscoverProject {
    const ownerId = project.ownerId || '';
    return {
      id: project.projectId,
      name: project.name,
      ownerId,
      author: `@${project.ownerUsername || ownerId.substring(0, 8) || 'unknown'}`,
      description: project.description || '',
      language: project.language || 'Other',
      stars: project.starCount || 0,
      forks: project.forkCount || 0,
      visibility: project.visibility || 'PRIVATE'
    };
  }

  languageDotClass(language: string): string {
    const map: Record<string, string> = {
      typescript: 'bg-blue-400',
      python: 'bg-yellow-400',
      java: 'bg-red-400',
      go: 'bg-emerald-400',
      rust: 'bg-orange-400',
      javascript: 'bg-yellow-300',
      'c++': 'bg-purple-400',
      ruby: 'bg-pink-500'
    };
    return map[language.toLowerCase()] || 'bg-slate-500';
  }

  openProject(id: string) {
    this.router.navigate(['/projects', id]);
  }

  openCreateProject() {
    this.router.navigate(['/projects/create']);
  }
}
