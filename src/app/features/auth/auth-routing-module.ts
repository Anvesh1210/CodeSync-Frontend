import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { OtpComponent } from './otp/otp';
import { OAuthCallbackComponent } from './oauth-callback/oauth-callback';
import { OAuthRegisterComponent } from './oauth-register/oauth-register';
import { ForgotPasswordComponent } from './forgot-password/forgot-password';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'verify-email', component: OtpComponent },
  { path: 'oauth-callback', component: OAuthCallbackComponent },
  { path: 'oauth-register', component: OAuthRegisterComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AuthRoutingModule {}
