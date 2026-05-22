import { Component, Input, Output, EventEmitter, inject, ChangeDetectorRef, OnInit, OnDestroy } from '@angular/core';
import { ExecutionService, ExecutionJob } from '../../../../../core/services/execution';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-execution-terminal',
  templateUrl: './execution-terminal.html',
  standalone: false
})
export class ExecutionTerminalComponent implements OnInit, OnDestroy {
  @Input() projectId!: string;
  @Input() fileId!: string;
  @Input() language!: string;
  @Input() fileName!: string;
  @Input() sourceCode!: string;
  @Output() onStart = new EventEmitter<void>();
  @Output() onRunRequested = new EventEmitter<void>();

  private executionService = inject(ExecutionService);
  private cdr = inject(ChangeDetectorRef);

  stdin: string = '';
  stdout: string = '';
  stderr: string = '';
  status: string = 'IDLE';
  currentJobId: string | null = null;
  
  history: ExecutionJob[] = [];
  filteredHistory: ExecutionJob[] = [];
  
  // Filters
  filterLanguage: string = 'all';
  filterStatus: string = 'all';

  private outputSub?: Subscription;
  private statusSub?: Subscription;

  ngOnInit() {
    this.outputSub = this.executionService.output$.subscribe(output => {
      if (output.startsWith('ERR: ')) {
        this.stderr += output.substring(5);
      } else {
        this.stdout += output;
      }
      this.cdr.detectChanges();
    });

    this.statusSub = this.executionService.status$.subscribe(status => {
      console.log(`[ExecutionTerminal] Status update received: ${status}`);
      this.status = status;
      if (['COMPLETED', 'FAILED', 'TIME_OUT', 'CANCELLED'].includes(status)) {
        console.log('[ExecutionTerminal] Job finished, loading history and prepared to disconnect');
        this.loadHistory();
        
        // Optionally disconnect after a short delay to ensure all output is received
        setTimeout(() => {
          if (this.status === status) { // Ensure status hasn't changed
             console.log('[ExecutionTerminal] Auto-disconnecting after terminal status');
             this.executionService.disconnect();
          }
        }, 2000);
      }
      this.cdr.detectChanges();
    });

    this.loadHistory();
  }

  ngOnDestroy() {
    console.log('[ExecutionTerminal] ngOnDestroy called');
    this.outputSub?.unsubscribe();
    this.statusSub?.unsubscribe();
    // We should probably NOT disconnect here if the job is still running,
    // but usually the terminal is the only thing that cares.
    this.executionService.disconnect();
  }

  get isPremiumUser(): boolean {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    return user?.premium || false;
  }

  internalRunCode() {
    if (this.onRunRequested.observers.length > 0) {
      this.onRunRequested.emit();
    } else {
      this.runCode();
    }
  }

  runCode(codeOverride?: string) {
    this.status = 'QUEUED';
    this.stdout = '';
    this.stderr = '';
    this.onStart.emit();

    const currentCode = codeOverride !== undefined ? codeOverride : this.sourceCode;

    const payload = {
      projectId: this.projectId,
      fileId: this.fileId,
      userId: JSON.parse(localStorage.getItem('user') || '{}').userId,
      language: this.language,
      sourceCode: currentCode,
      fileName: this.fileName,
      stdin: this.stdin,
      isPremium: JSON.parse(localStorage.getItem('user') || '{}').premium
    };

    console.log('[ExecutionTerminal] Submitting execution job', payload);
    this.executionService.submitExecution(payload).subscribe({
      next: (job) => {
        console.log('[ExecutionTerminal] Job submitted successfully, jobId:', job.jobId);
        this.currentJobId = job.jobId;
        this.executionService.connectToExecution(job.jobId);
      },
      error: (err) => {
        console.error('[ExecutionTerminal] Execution submission failed', err);
        this.status = 'FAILED';
        this.stderr = 'Failed to submit execution to server.';
        this.cdr.detectChanges();
      }
    });
  }

  loadHistory() {
    this.executionService.getJobsByProject(this.projectId).subscribe({
      next: (jobs) => {
        this.history = jobs;
        this.applyFilters();
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters() {
    this.filteredHistory = this.history.filter(job => {
      const langMatch = this.filterLanguage === 'all' || job.language === this.filterLanguage;
      const statusMatch = this.filterStatus === 'all' || job.status === this.filterStatus;
      return langMatch && statusMatch;
    });
  }

  clearTerminal() {
    this.stdout = '';
    this.stderr = '';
    this.status = 'IDLE';
    this.executionService.disconnect();
  }
}
