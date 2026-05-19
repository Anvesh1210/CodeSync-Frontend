import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { VersionService, Snapshot } from '../../../../../core/services/version.service';

@Component({
  selector: 'app-vcs-panel',
  templateUrl: './vcs-panel.html',
  standalone: false
})
export class VcsPanelComponent implements OnInit, OnChanges {
  @Input() fileId!: string;
  @Input() projectId!: string;
  @Input() sourceCode!: string;

  @Output() contentRestored = new EventEmitter<string>();

  private versionService = inject(VersionService);
  private cdr = inject(ChangeDetectorRef);

  snapshots: Snapshot[] = [];
  commitMessage: string = '';
  isLoading = false;
  isCommitting = false;
  error: string | null = null;
  diffResult: string[] | null = null;
  diffTitle: string = '';

  ngOnInit() {
    if (this.fileId) {
      this.loadHistory();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['fileId'] && this.fileId) {
      this.loadHistory();
    }
  }

  loadHistory() {
    this.isLoading = true;
    this.error = null;
    this.versionService.getFileHistory(this.fileId).subscribe({
      next: (snapshots) => {
        this.snapshots = snapshots;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load version history.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  commit() {
    if (!this.commitMessage.trim()) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    this.isCommitting = true;
    this.versionService.createSnapshot({
      projectId: this.projectId,
      fileId: this.fileId,
      authorId: user.userId,
      message: this.commitMessage.trim(),
      content: this.sourceCode || '',
      branch: 'main'
    }).subscribe({
      next: (snapshot) => {
        this.snapshots.unshift(snapshot);
        this.commitMessage = '';
        this.isCommitting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to create snapshot.';
        this.isCommitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  restore(snapshot: Snapshot) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.versionService.restoreSnapshot(snapshot.snapshotId, user.userId).subscribe({
      next: (newSnapshot) => {
        // Push the restored content into the editor via the parent IDE
        this.contentRestored.emit(snapshot.content);
        this.loadHistory();
      },
      error: () => {
        this.error = 'Failed to restore snapshot.';
        this.cdr.detectChanges();
      }
    });
  }

  viewDiff(snapshot: Snapshot, index: number) {
    if (index >= this.snapshots.length - 1) return; // No parent to diff against
    const older = this.snapshots[index + 1];
    this.diffTitle = `Changes from "${older.message}" → "${snapshot.message}"`;
    this.versionService.diffSnapshots(older.snapshotId, snapshot.snapshotId).subscribe({
      next: (result) => {
        this.diffResult = result.differences;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load diff.';
        this.cdr.detectChanges();
      }
    });
  }

  closeDiff() {
    this.diffResult = null;
  }

  formatTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}
