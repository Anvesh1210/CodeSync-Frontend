import { Component, OnInit, inject } from '@angular/core';
import { AdminService } from '../../../core/services/admin';
import { AuthService } from '../../../core/services/auth';
import { Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.html',
  styleUrls: ['./admin-dashboard.css'],
  standalone: false
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // ── Navigation ───────────────────────────────────────────────────────────
  activeTab: 'overview' | 'users' | 'projects' | 'sessions' | 'executions' | 'notifications' | 'payments' = 'overview';

  // ── Loading / Error states ───────────────────────────────────────────────
  loading: { [key: string]: boolean } = {
    'users': false,
    'projects': false,
    'sessions': false,
    'executions': false,
    'payments': false
  };
  toastMessage = '';
  toastType: 'success' | 'error' = 'success';
  showToast = false;

  // ── Overview metrics ─────────────────────────────────────────────────────
  metrics = {
    totalUsers: 0,
    activeSessions: 0,
    totalProjects: 0,
    codeRuns: 0
  };

  // ── Users ────────────────────────────────────────────────────────────────
  users: any[] = [];
  filteredUsers: any[] = [];
  userSearch = '';

  // ── Projects ─────────────────────────────────────────────────────────────
  projects: any[] = [];
  filteredProjects: any[] = [];
  projectSearch = '';

  // ── Sessions ─────────────────────────────────────────────────────────────
  sessions: any[] = [];

  executions: any[] = [];
  filteredExecutions: any[] = [];

  // ── Notifications ───────────────────────────────────────────────────────
  notificationForm = {
    recipientId: '',
    title: '',
    message: '',
    type: 'INFO' as 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR'
  };
  broadcastMode = false;
  notificationsHistory: any[] = [];

  // ── Confirm dialog ───────────────────────────────────────────────────────
  confirmVisible = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmAction: (() => void) | null = null;

  // ── Current admin info ───────────────────────────────────────────────────
  adminName = 'Administrator';

  ngOnInit() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        this.adminName = u.fullName || u.username || 'Administrator';
      } catch { }
    }
    this.loadTab('overview');
    this.cdr.detectChanges();
  }

  // ── Tab switching ────────────────────────────────────────────────────────
  switchTab(tab: typeof this.activeTab) {
    this.activeTab = tab;
    this.loadTab(tab);
  }

  private loadTab(tab: typeof this.activeTab) {
    if (tab === 'overview') {
      this.loadUsers();
      this.loadProjects();
      this.loadSessions();
      this.loadExecutions();
    } else if (tab === 'users') {
      this.loadUsers();
    } else if (tab === 'projects') {
      this.loadProjects();
    } else if (tab === 'sessions') {
      this.loadSessions();
    } else if (tab === 'executions') {
      this.loadExecutions();
    } else if (tab === 'notifications') {
      if (this.users.length === 0) this.loadUsers();
      this.loadNotificationsHistory();
    } else if (tab === 'payments') {
      this.loadPayments();
    }
  }

  // ── Data loaders ─────────────────────────────────────────────────────────
  loadUsers() {
    this.loading['users'] = true;
    this.adminService.getUsers().subscribe({
      next: (data) => {
        this.users = data || [];
        this.metrics.totalUsers = this.users.length;
        this.filterUsers();
        this.loading['users'] = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load users', err);
        this.loading['users'] = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadProjects() {
    this.loading['projects'] = true;
    this.adminService.getProjects().subscribe({
      next: (data) => {
        this.projects = data || [];
        this.metrics.totalProjects = this.projects.length;
        this.filterProjects();
        this.loading['projects'] = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load projects', err);
        this.loading['projects'] = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadSessions() {
    this.loading['sessions'] = true;
    this.adminService.getSessions().subscribe({
      next: (data) => {
        this.sessions = data || [];
        this.metrics.activeSessions = this.sessions.length;
        this.loading['sessions'] = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load sessions', err);
        this.loading['sessions'] = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadExecutions() {
    this.loading['executions'] = true;
    this.adminService.getExecutions().subscribe({
      next: (data) => {
        this.executions = data || [];
        this.metrics.codeRuns = this.executions.length;
        this.filteredExecutions = [...this.executions];
        this.loading['executions'] = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load executions', err);
        this.loading['executions'] = false;
        this.cdr.detectChanges();
      }
    });
  }

  // ── Payment loaders ──────────────────────────────────────────────────────
  subscriptions: any[] = [];
  filteredSubscriptions: any[] = [];
  transactions: any[] = [];
  filteredTransactions: any[] = [];
  paymentSearch = '';
  paymentStatusFilter = 'ALL';
  paymentBillingFilter = 'ALL';
  paymentEntityFilter = 'ALL';
  paymentDateFilter = 'ALL';

  loadPayments() {
    this.loading['payments'] = true;
    if (this.users.length === 0) {
      this.loadUsers();
    }
    
    this.adminService.getSubscriptions().subscribe({
      next: (subs) => {
        this.subscriptions = subs || [];
        this.adminService.getTransactions().subscribe({
          next: (txns) => {
            this.transactions = txns || [];
            this.filterPayments();
            this.loading['payments'] = false;
            this.cdr.detectChanges();
          },
          error: () => {
            this.loading['payments'] = false;
            this.cdr.detectChanges();
          }
        });
      },
      error: () => {
        this.loading['payments'] = false;
        this.cdr.detectChanges();
      }
    });
  }

  filterPayments() {
    const q = this.paymentSearch.toLowerCase();
    
    // Filter Subscriptions
    this.filteredSubscriptions = this.subscriptions.filter(s => {
      const username = this.getUserName(s.userId).toLowerCase();
      const matchesSearch = username.includes(q) || s.userId.toLowerCase().includes(q);
      const matchesStatus = this.paymentStatusFilter === 'ALL' || s.status === this.paymentStatusFilter;
      const matchesBilling = this.paymentBillingFilter === 'ALL' || s.billingCycle === this.paymentBillingFilter;
      const matchesEntity = this.paymentEntityFilter === 'ALL' || s.entityType === this.paymentEntityFilter;
      
      let matchesDate = true;
      if (this.paymentDateFilter !== 'ALL') {
        const date = new Date(s.startDate);
        const now = new Date();
        if (this.paymentDateFilter === 'TODAY') {
          matchesDate = date.toDateString() === now.toDateString();
        } else if (this.paymentDateFilter === 'WEEK') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = date >= weekAgo;
        } else if (this.paymentDateFilter === 'MONTH') {
          matchesDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }
      }
      
      return matchesSearch && matchesStatus && matchesBilling && matchesEntity && matchesDate;
    });

    // Filter Transactions
    this.filteredTransactions = this.transactions.filter(t => {
      const username = this.getUserName(t.userId).toLowerCase();
      const matchesSearch = username.includes(q) || t.userId.toLowerCase().includes(q) || t.orderId.toLowerCase().includes(q);
      
      let matchesDate = true;
      if (this.paymentDateFilter !== 'ALL') {
        const date = new Date(t.createdAt);
        const now = new Date();
        if (this.paymentDateFilter === 'TODAY') {
          matchesDate = date.toDateString() === now.toDateString();
        } else if (this.paymentDateFilter === 'WEEK') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchesDate = date >= weekAgo;
        } else if (this.paymentDateFilter === 'MONTH') {
          matchesDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }
      }
      
      return matchesSearch && matchesDate;
    });
  }

  getUserName(userId: string): string {
    const user = this.users.find(u => u.userId === userId);
    return user ? (user.username || user.fullName || 'Unknown User') : 'User (' + userId.substring(0, 8) + ')';
  }

  loadNotificationsHistory() {
    this.adminService.getAllNotifications().subscribe({
      next: (data) => {
        this.notificationsHistory = (data || []).reverse();
        this.cdr.detectChanges();
      }
    });
  }

  // ── Notification actions ──────────────────────────────────────────────────
  sendNotification() {
    if (!this.notificationForm.title || !this.notificationForm.message) {
      this.toast('Please provide a title and message.', 'error');
      return;
    }

    if (this.broadcastMode) {
      const allIds = this.users.map(u => u.userId);
      this.adminService.sendBroadcast(allIds, this.notificationForm.title, this.notificationForm.message).subscribe({
        next: () => {
          this.toast('Broadcast notification sent!', 'success');
          this.resetNotificationForm();
          this.loadNotificationsHistory();
        },
        error: () => this.toast('Failed to send broadcast.', 'error')
      });
    } else {
      if (!this.notificationForm.recipientId) {
        this.toast('Please select a recipient.', 'error');
        return;
      }
      const payload = {
        recipientId: this.notificationForm.recipientId,
        title: this.notificationForm.title,
        message: this.notificationForm.message,
        type: this.notificationForm.type,
        read: false
      };
      this.adminService.sendNotification(payload).subscribe({
        next: () => {
          this.toast('Notification sent successfully!', 'success');
          this.resetNotificationForm();
          this.loadNotificationsHistory();
        },
        error: () => this.toast('Failed to send notification.', 'error')
      });
    }
  }

  resetNotificationForm() {
    this.notificationForm = {
      recipientId: '',
      title: '',
      message: '',
      type: 'INFO'
    };
    this.broadcastMode = false;
  }

  confirmDeleteNotification(n: any) {
    this.confirmTitle = 'Delete Notification';
    this.confirmMessage = `Are you sure you want to delete notification "${n.title}"?`;
    this.confirmAction = () => this.doDeleteNotification(n.id);
    this.confirmVisible = true;
  }

  doDeleteNotification(id: number) {
    this.adminService.deleteNotification(id).subscribe({
      next: () => {
        this.toast('Notification deleted.', 'success');
        this.loadNotificationsHistory();
        this.confirmVisible = false;
      },
      error: () => this.toast('Failed to delete notification.', 'error')
    });
  }

  confirmTerminateSubscription(s: any) {
    this.confirmTitle = 'Terminate Subscription';
    this.confirmMessage = `End premium benefits for user ${s.userId}?`;
    this.confirmAction = () => this.doTerminateSubscription(s.userId);
    this.confirmVisible = true;
  }

  doTerminateSubscription(userId: string) {
    this.adminService.terminateSubscription(userId).subscribe({
      next: () => {
        this.toast('Subscription terminated.', 'success');
        this.loadPayments();
        this.confirmVisible = false;
      },
      error: () => this.toast('Failed to terminate subscription.', 'error')
    });
  }

  // ── Filter helpers ───────────────────────────────────────────────────────
  filterUsers() {
    const q = this.userSearch.toLowerCase();
    this.filteredUsers = q
      ? this.users.filter(u =>
          (u.username || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q))
      : [...this.users];
  }

  filterProjects() {
    const q = this.projectSearch.toLowerCase();
    this.filteredProjects = q
      ? this.projects.filter(p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.language || '').toLowerCase().includes(q))
      : [...this.projects];
  }

  // ── User actions ─────────────────────────────────────────────────────────
  confirmSuspendUser(user: any) {
    this.showConfirm(
      'Suspend User',
      `Suspend account for "${user.username}"? They will be logged out immediately.`,
      () => this.suspendUser(user)
    );
  }

  suspendUser(user: any) {
    this.adminService.suspendUser(user.userId).subscribe({
      next: () => {
        user.active = false;
        user.isActive = false;
        this.toast(`User "${user.username}" suspended.`, 'success');
      },
      error: () => this.toast('Failed to suspend user.', 'error')
    });
  }

  confirmDeleteUser(user: any) {
    this.showConfirm(
      'Delete User',
      `Permanently delete "${user.username}"? This cannot be undone.`,
      () => this.deleteUser(user)
    );
  }

  deleteUser(user: any) {
    this.adminService.deleteUser(user.userId).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.userId !== user.userId);
        this.filterUsers();
        this.metrics.totalUsers = this.users.length;
        this.toast(`User "${user.username}" deleted.`, 'success');
      },
      error: () => this.toast('Failed to delete user.', 'error')
    });
  }

  // ── Project actions ───────────────────────────────────────────────────────
  confirmDeleteProject(project: any) {
    this.showConfirm(
      'Delete Project',
      `Delete project "${project.name}"? All files and data will be lost.`,
      () => this.deleteProject(project)
    );
  }

  deleteProject(project: any) {
    const id = project.projectId || project.id;
    this.adminService.deleteProject(id).subscribe({
      next: () => {
        this.projects = this.projects.filter(p => (p.projectId || p.id) !== id);
        this.filterProjects();
        this.metrics.totalProjects = this.projects.length;
        this.toast(`Project "${project.name}" deleted.`, 'success');
      },
      error: () => this.toast('Failed to delete project.', 'error')
    });
  }

  // ── Session actions ───────────────────────────────────────────────────────
  confirmTerminateSession(session: any) {
    const id = session.sessionId || session.id;
    this.showConfirm(
      'Terminate Session',
      `Terminate session "${id}"? All participants will be disconnected.`,
      () => this.terminateSession(session)
    );
  }

  terminateSession(session: any) {
    const id = session.sessionId || session.id;
    this.adminService.terminateSession(id).subscribe({
      next: () => {
        this.sessions = this.sessions.filter(s => (s.sessionId || s.id) !== id);
        this.metrics.activeSessions = this.sessions.length;
        this.toast(`Session terminated.`, 'success');
      },
      error: () => this.toast('Failed to terminate session.', 'error')
    });
  }

  // ── Execution actions ─────────────────────────────────────────────────────
  confirmCancelExecution(exec: any) {
    const id = exec.jobId || exec.id;
    this.showConfirm(
      'Cancel Execution',
      `Cancel execution job "${id}"?`,
      () => this.cancelExecution(exec)
    );
  }

  cancelExecution(exec: any) {
    const id = exec.jobId || exec.id;
    this.adminService.cancelExecution(id).subscribe({
      next: () => {
        exec.status = 'CANCELLED';
        this.toast(`Execution cancelled.`, 'success');
      },
      error: () => this.toast('Failed to cancel execution.', 'error')
    });
  }

  // ── Confirm dialog helpers ────────────────────────────────────────────────
  showConfirm(title: string, message: string, action: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmAction = action;
    this.confirmVisible = true;
  }

  doConfirm() {
    if (this.confirmAction) {
      this.confirmAction();
    }
    this.confirmVisible = false;
    this.confirmAction = null;
  }

  cancelConfirm() {
    this.confirmVisible = false;
    this.confirmAction = null;
  }

  // ── Toast helper ──────────────────────────────────────────────────────────
  toast(message: string, type: 'success' | 'error') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => (this.showToast = false), 3500);
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  isUserActive(user: any): boolean {
    return user.isActive === true || user.active === true;
  }

  getStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'COMPLETED': return 'badge-success';
      case 'RUNNING':   return 'badge-warning';
      case 'FAILED':    return 'badge-error';
      case 'QUEUED':    return 'badge-info';
      case 'CANCELLED': return 'badge-muted';
      default:          return 'badge-muted';
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
