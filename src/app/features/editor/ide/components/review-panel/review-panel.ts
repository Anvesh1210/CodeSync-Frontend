import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommentService, Comment, CreateCommentRequest } from '../../../../../core/services/comment.service';

@Component({
  selector: 'app-review-panel',
  templateUrl: './review-panel.html',
  standalone: false
})
export class ReviewPanelComponent implements OnInit, OnChanges {
  @Input() fileId!: string;
  @Input() projectId!: string;

  private commentService = inject(CommentService);
  private cdr = inject(ChangeDetectorRef);

  comments: Comment[] = [];
  newCommentText: string = '';
  newCommentLine: number | null = null;
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  activeReplyId: string | null = null;
  replyText: string = '';
  repliesMap: Record<string, Comment[]> = {};

  ngOnInit() {
    if (this.fileId) {
      this.loadComments();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['fileId'] && this.fileId) {
      this.loadComments();
    }
  }

  loadComments() {
    this.isLoading = true;
    this.error = null;
    // Load top-level comments only (no parent)
    this.commentService.getCommentsByFile(this.fileId).subscribe({
      next: (comments) => {
        this.comments = comments.filter(c => !c.parentCommentId);
        this.isLoading = false;
        // Load replies for each top-level comment
        this.comments.forEach(c => this.loadReplies(c.commentId));
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load comments.';
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadReplies(commentId: string) {
    this.commentService.getReplies(commentId).subscribe({
      next: (replies) => {
        this.repliesMap[commentId] = replies;
        this.cdr.detectChanges();
      }
    });
  }

  addComment() {
    if (!this.newCommentText.trim()) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const request: CreateCommentRequest = {
      projectId: this.projectId,
      fileId: this.fileId,
      authorId: user.userId,
      content: this.newCommentText.trim(),
      lineNumber: this.newCommentLine ?? undefined
    };

    this.isSubmitting = true;
    this.commentService.addComment(request).subscribe({
      next: (comment) => {
        this.comments.unshift(comment);
        this.repliesMap[comment.commentId] = [];
        this.newCommentText = '';
        this.newCommentLine = null;
        this.isSubmitting = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to add comment.';
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }
    });
  }

  submitReply(parentCommentId: string) {
    if (!this.replyText.trim()) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const request: CreateCommentRequest = {
      projectId: this.projectId,
      fileId: this.fileId,
      authorId: user.userId,
      content: this.replyText.trim(),
      parentCommentId
    };

    this.commentService.addComment(request).subscribe({
      next: (reply) => {
        if (!this.repliesMap[parentCommentId]) {
          this.repliesMap[parentCommentId] = [];
        }
        this.repliesMap[parentCommentId].push(reply);
        this.replyText = '';
        this.activeReplyId = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to submit reply.';
        this.cdr.detectChanges();
      }
    });
  }

  resolve(commentId: string) {
    this.commentService.resolveComment(commentId).subscribe({
      next: (updated) => {
        const idx = this.comments.findIndex(c => c.commentId === commentId);
        if (idx !== -1) this.comments[idx] = updated;
        this.cdr.detectChanges();
      },
      error: () => { this.error = 'Failed to resolve comment.'; this.cdr.detectChanges(); }
    });
  }

  reopen(commentId: string) {
    this.commentService.unresolveComment(commentId).subscribe({
      next: (updated) => {
        const idx = this.comments.findIndex(c => c.commentId === commentId);
        if (idx !== -1) this.comments[idx] = updated;
        this.cdr.detectChanges();
      },
      error: () => { this.error = 'Failed to reopen comment.'; this.cdr.detectChanges(); }
    });
  }

  deleteComment(commentId: string) {
    this.commentService.deleteComment(commentId).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.commentId !== commentId);
        delete this.repliesMap[commentId];
        this.cdr.detectChanges();
      },
      error: () => { this.error = 'Failed to delete comment.'; this.cdr.detectChanges(); }
    });
  }

  toggleReply(commentId: string) {
    this.activeReplyId = this.activeReplyId === commentId ? null : commentId;
    this.replyText = '';
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
    return `${Math.floor(diffHours / 24)}d ago`;
  }

  getInitials(authorId: string): string {
    return authorId ? authorId.substring(0, 2).toUpperCase() : 'U';
  }
}
