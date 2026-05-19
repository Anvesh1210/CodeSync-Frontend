import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ProjectsRoutingModule } from './projects-routing-module';
import { DiscoverComponent } from './discover/discover';
import { ProjectDetailComponent } from './project-detail/project-detail';
import { CreateProject } from './create-project/create-project';

@NgModule({
  declarations: [DiscoverComponent, ProjectDetailComponent, CreateProject],
  imports: [CommonModule, FormsModule, ProjectsRoutingModule],
})
export class ProjectsModule {}
