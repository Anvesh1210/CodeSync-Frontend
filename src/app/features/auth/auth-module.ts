import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthRoutingModule } from './auth-routing-module';
import { LoginComponent } from './login/login';
import { RegisterComponent } from './register/register';
import { OtpComponent } from './otp/otp';
import { OAuthCallbackComponent } from './oauth-callback/oauth-callback';
import { OAuthRegisterComponent } from './oauth-register/oauth-register';
import { ForgotPasswordComponent } from './forgot-password/forgot-password';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    LoginComponent, 
    RegisterComponent, 
    OtpComponent, 
    OAuthCallbackComponent, 
    OAuthRegisterComponent,
    ForgotPasswordComponent
  ],
  imports: [CommonModule, AuthRoutingModule, FormsModule],
})
export class AuthModule {}
