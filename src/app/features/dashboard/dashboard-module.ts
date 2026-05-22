import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { DashboardRoutingModule } from './dashboard-routing-module';
import { DashboardHomeComponent } from './dashboard-home/dashboard-home';
import { MyProjects } from './my-projects/my-projects';
import { NewProjectModalComponent } from '../../shared/components/new-project-modal/new-project-modal';

@NgModule({
  declarations: [DashboardHomeComponent, MyProjects],
  imports: [CommonModule, FormsModule, DashboardRoutingModule, NewProjectModalComponent],
})
export class DashboardModule {}

