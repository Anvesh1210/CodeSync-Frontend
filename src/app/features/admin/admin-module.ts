import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AdminRoutingModule } from './admin-routing-module';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard';

@NgModule({
  declarations: [AdminDashboardComponent],
  imports: [CommonModule, FormsModule, AdminRoutingModule],
})
export class AdminModule {}
