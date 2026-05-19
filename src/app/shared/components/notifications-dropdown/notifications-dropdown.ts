import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { NotificationService, Notification } from '../../../core/services/notification';
import { ProjectsService } from '../../../features/projects/services/projects.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notifications-dropdown',
  templateUrl: './notifications-dropdown.html',
  standalone: false
})
export class NotificationsDropdownComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private projectsService = inject(ProjectsService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private sub?: Subscription;

  isOpen = false;
  notifications: Notification[] = [];
  unreadCount = 0;

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.userId) {
      this.loadNotifications(user.userId);
      this.notificationService.connect(user.userId);
      
      this.sub = this.notificationService.notifications$.subscribe(notif => {
        this.notifications.unshift(notif);
        this.updateUnreadCount();
        this.cdr.detectChanges();
      });
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.notificationService.disconnect();
  }

  loadNotifications(userId: string) {
    this.notificationService.getNotifications(userId).subscribe({
      next: (data) => {
        this.notifications = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.updateUnreadCount();
        this.cdr.detectChanges();
      }
    });
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  markAsRead(notification: Notification) {
    if (!notification.isRead) {
      notification.isRead = true;
      this.updateUnreadCount();
      this.notificationService.markAsRead(notification.notificationId).subscribe();
    }
  }

  markAllAsRead() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.userId) {
      this.notifications.forEach(n => n.isRead = true);
      this.updateUnreadCount();
      this.notificationService.markAllAsRead(user.userId).subscribe();
    }
  }

  acceptInvitation(notification: Notification, event: Event) {
    console.log('Accepting invitation for notification:', notification);
    event.stopPropagation();
    
    // 1. Mark as read
    this.markAsRead(notification);
    this.isOpen = false;
    
    // 2. Redirect to project
    // relatedId is sessionId, relatedType is projectId (as set in backend)
    const projectId = notification.relatedType;
    const sessionId = notification.relatedId;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    console.log('ProjectID:', projectId, 'SessionID:', sessionId, 'UserID:', user.userId);

    if (projectId && sessionId && user.userId) {
      // 3. Join Project permanently in backend
      console.log('Calling joinProject API...');
      this.projectsService.joinProject(projectId, user.userId).subscribe({
        next: (res) => {
          console.log('Successfully joined project:', res);
          // Store sessionId to be used by IdeComponent
          localStorage.setItem('pending_session_invite', sessionId);
          this.router.navigate(['/editor', projectId]);
        },
        error: (err: any) => {
          console.error('Failed to join project via API:', err);
          // Still redirect as they might have access or we want them to see the error in context
          localStorage.setItem('pending_session_invite', sessionId);
          this.router.navigate(['/editor', projectId]);
        }
      });
    } else {
      console.warn('Missing data for invitation acceptance:', { projectId, sessionId, userId: user.userId });
    }
  }

  declineInvitation(notification: Notification, event: Event) {
    event.stopPropagation();
    this.markAsRead(notification);
  }

  private updateUnreadCount() {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
  }

  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }
}
