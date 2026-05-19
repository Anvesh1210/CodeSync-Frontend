import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { IdeComponent } from './ide/ide';

const routes: Routes = [
  { path: ':projectId', component: IdeComponent },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EditorRoutingModule {}
