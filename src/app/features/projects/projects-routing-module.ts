import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DiscoverComponent } from './discover/discover';
import { ProjectDetailComponent } from './project-detail/project-detail';
import { CreateProject } from './create-project/create-project';

const routes: Routes = [
  { path: 'discover', component: DiscoverComponent },
  { path: 'create', component: CreateProject },
  { path: ':id', component: ProjectDetailComponent },
  { path: '', redirectTo: 'discover', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ProjectsRoutingModule {}
