import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardHomeComponent } from './dashboard-home/dashboard-home';
import { MyProjects } from './my-projects/my-projects';

const routes: Routes = [
  { path: '', component: DashboardHomeComponent },
  { path: 'my-projects', component: MyProjects }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class DashboardRoutingModule {}
