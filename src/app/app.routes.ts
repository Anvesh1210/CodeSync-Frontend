import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth-guard';
import { AdminGuard } from './core/guards/admin-guard';
import { GuestGuard } from './core/guards/guest-guard';

import { LandingHomeComponent } from './features/landing/landing-home/landing-home';

export const routes: Routes = [
  {
    path: '',
    component: LandingHomeComponent,
    pathMatch: 'full'
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth-module').then(m => m.AuthModule),
    canActivate: [GuestGuard]
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./features/dashboard/dashboard-module').then(m => m.DashboardModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    loadChildren: () => import('./features/profile/profile-module').then(m => m.ProfileModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'pricing',
    loadChildren: () => import('./features/pricing/pricing-module').then(m => m.PricingModule)
  },
  {
    path: 'projects',
    loadChildren: () => import('./features/projects/projects-module').then(m => m.ProjectsModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'editor',
    loadChildren: () => import('./features/editor/editor-module').then(m => m.EditorModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin-module').then(m => m.AdminModule),
    canActivate: [AuthGuard, AdminGuard]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
