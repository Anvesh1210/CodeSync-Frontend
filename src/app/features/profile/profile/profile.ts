import { Component, OnInit, inject } from '@angular/core';
import { AuthService, UserResponse } from '../../../core/services/auth';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  standalone: false
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);
  
  user: UserResponse | null = null;
  userInitials = '';

  passwords = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  message = '';
  isError = false;
  imageError = false;

  ngOnInit() {
    this.authService.currentUser$.subscribe(user => {
      this.user = user;
      if (user) {
        this.userInitials = this.getInitials(user.fullName || user.username);
      }
    });
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  saveProfile() {
    if (!this.user) return;
    
    this.authService.updateProfile({
      username: this.user.username,
      fullName: this.user.fullName,
      bio: this.user.bio,
      avatarUrl: this.user.avatarUrl
    }).subscribe({
      next: () => {
        this.message = 'Profile updated successfully';
        this.isError = false;
        setTimeout(() => this.message = '', 3000);
      },
      error: (err) => {
        this.message = err.error?.message || 'Failed to update profile';
        this.isError = true;
      }
    });
  }

  updatePassword() {
    if (this.passwords.newPassword !== this.passwords.confirmPassword) {
      this.message = 'New passwords do not match';
      this.isError = true;
      return;
    }

    this.authService.changePassword({
      currentPassword: this.passwords.currentPassword,
      newPassword: this.passwords.newPassword
    }).subscribe({
      next: () => {
        this.message = 'Password updated successfully';
        this.isError = false;
        this.passwords = { currentPassword: '', newPassword: '', confirmPassword: '' };
        setTimeout(() => this.message = '', 3000);
      },
      error: (err) => {
        this.message = err.error?.message || 'Failed to update password';
        this.isError = true;
      }
    });
  }
}
