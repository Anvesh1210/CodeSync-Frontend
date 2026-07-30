import { Component, OnInit, OnDestroy, ElementRef, inject, ChangeDetectorRef, HostListener, effect, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { Subscription } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { FileService, CodeFile } from '../../../core/services/file';
import { CollaborationService } from '../../../core/services/collaboration';
import { ProjectsService } from '../../projects/services/projects.service';
import { ExecutionService, ExecutionRequest, LanguageInfo } from '../../../core/services/execution';
import { environment } from '../../../../environments/environment';
import { finalize } from 'rxjs';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { MonacoBinding } from 'y-monaco';
import { ThemeService } from '../../../core/services/theme.service';

declare var monaco: any;

@Component({
  selector: 'app-ide',
  templateUrl: './ide.html',
  styleUrls: ['./ide.css'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IdeComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private fileService = inject(FileService);
  private collabService = inject(CollaborationService);
  private projectsService = inject(ProjectsService);
  private executionService = inject(ExecutionService);
  private el = inject(ElementRef);
  private cdr = inject(ChangeDetectorRef);
  private ngZone = inject(NgZone);
  public themeService = inject(ThemeService);

  projectId: string = '';
  projectName: string = '';
  ownerId: string = '';
  isAdmin: boolean = false;
  userRole: 'OWNER' | 'CONTRIBUTOR' | 'VIEWER' = 'VIEWER';
  activeRightTab: 'LIVE' | 'VCS' | 'REVIEW' = 'LIVE';
  isThemeStoreOpen = false;
  isCreateDropdownOpen = false;

  files: CodeFile[] = [];
  openTabs: CodeFile[] = [];
  activeFileId: string = '';
  activeFile: CodeFile | null = null;
  
  editor: any;
  editorOptions: any = {
    theme: this.themeService.getTheme(),
    language: 'plaintext',
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
    padding: { top: 4 },
    readOnly: false
  };
  isLoading = true;
  cursorLine = 1;
  cursorCol = 1;
  
  // Yjs Collaboration state
  ydoc: Y.Doc | null = null;
  yprovider: WebsocketProvider | null = null;
  ybinding: MonacoBinding | null = null;
  ytext: Y.Text | null = null;
  
  selectedNode: CodeFile | null = null;
  currentSessionId: string | null = null;
  currentSessionHostId: string | null = null;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';
  latency: number = 0;
  participants: any[] = [];
  contributors: any[] = [];
  inviteUsername: string = '';
  isInviting: boolean = false;
  
  // Execution
  executionOutput: string = '';
  isExecuting: boolean = false;
  showTerminal: boolean = false;
  isTerminalExpanded: boolean = false;

  // Child component props
  showChat = true;
  isZenMode = false;
  isLeftSidebarVisible = true;
  isRightSidebarVisible = true;
  terminalHeight = 180;
  isResizingTerminal = false;
  creationMode: 'file' | 'folder' | null = null;
  nodeToDeleteId: string | null = null;
  saveStatus: string = '';
  isSaving: boolean = false;

  lintTimeout: any;
  isTerminating: boolean = false;
  private shouldCreateInitialFile: boolean = false;
  private hasAttemptedInitialFileCreation: boolean = false;
  private sessionSub?: Subscription;

  /** localStorage key for persisting active session */
  private static readonly SESSION_KEY = 'active_session_id';
  private static themesDefined = false;

  constructor() {
    // Configure Monaco Environment to fix worker loading issues and stop blinking
    (window as any).MonacoEnvironment = {
      getWorkerUrl: (moduleId: string, label: string) => {
        return '/assets/monaco-editor/vs/base/worker/workerMain.js';
      }
    };

    effect(() => {
      const isDark = this.themeService.isDarkMode();
      
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).userId : 'guest';
      const customTheme = localStorage.getItem(`editor-theme_${userId}`);
      
      // If a custom theme is saved, use it. Otherwise use the system base.
      const themeToApply = customTheme || (isDark ? 'vs-dark' : 'vs');
      
      if (this.editorOptions.theme !== themeToApply) {
        if (this.editor) {
          this.editor.updateOptions({ theme: themeToApply });
        }
        this.editorOptions.theme = themeToApply;
        this.cdr.markForCheck();
      }
    });
  }

  ngOnInit(): void {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      this.isLeftSidebarVisible = false;
      this.isRightSidebarVisible = false;
    }
    this.projectId = this.route.snapshot.paramMap.get('projectId') || '';
    if (this.projectId) {
      this.loadProjectData();
      // Try to restore session first, then check invitation, then look for active session for project
      if (!this.restoreSession()) {
        if (!this.checkPendingInvitation()) {
          this.checkForActiveSession();
        }
      }
    }
  }

  /**
   * If the user had an active session before a page refresh,
   * reconnect to it so the session is not lost.
   * Returns true if a session was restored.
   */
  private restoreSession(): boolean {
    const savedSessionId = localStorage.getItem(IdeComponent.SESSION_KEY);
    if (savedSessionId && !this.currentSessionId) {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      this.currentSessionId = savedSessionId;
      // We'll load the host info when we join or sync, but for now we restore status
      this.connectionStatus = 'connecting';
      // Reconnect WebSocket to the existing session
      this.collabService.connect(savedSessionId, localStorage.getItem('token') || '');
      this.subscribeToSessionTermination();
      this.loadParticipants();
      console.log('Restored existing session:', savedSessionId);
      return true;
    }
    return false;
  }

  /** Returns true if a pending invitation was found and processed */
  private checkPendingInvitation(): boolean {
    const sessionId = localStorage.getItem('pending_session_invite');
    if (sessionId) {
      localStorage.removeItem('pending_session_invite');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.userId) {
        this.connectionStatus = 'connecting';
        this.collabService.joinSession(sessionId, user.userId).subscribe({
          next: () => {
            this.currentSessionId = sessionId;
            localStorage.setItem(IdeComponent.SESSION_KEY, sessionId);
            this.collabService.connect(sessionId, localStorage.getItem('token') || '');
            this.subscribeToSessionTermination();
            this.loadParticipants();
            console.log('Successfully joined session from invitation');
          },
          error: (err) => {
            console.error('Failed to join session from invitation', err);
            this.connectionStatus = 'disconnected';
          }
        });
        return true;
      }
    }
    return false;
  }

  /** Checks if there is an active session for this project and joins it automatically */
  private checkForActiveSession() {
    this.collabService.getActiveSessionForProject(this.projectId).subscribe({
      next: (session) => {
        if (session && session.sessionId) {
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          if (user.userId) {
            console.log('Found active session for project, joining automatically:', session.sessionId);
            this.connectionStatus = 'connecting';
            this.collabService.joinSession(session.sessionId, user.userId).subscribe({
              next: () => {
                this.currentSessionId = session.sessionId;
                this.currentSessionHostId = session.ownerId;
                localStorage.setItem(IdeComponent.SESSION_KEY, session.sessionId);
                this.collabService.connect(session.sessionId, localStorage.getItem('token') || '');
                this.subscribeToSessionTermination();
                this.loadParticipants();
              },
              error: (err) => {
                console.error('Failed to join active project session', err);
                this.connectionStatus = 'disconnected';
              }
            });
          }
        }
      }
    });
  }

  public loadProjectData() {
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;
    const userId = user?.userId;

    // 1. Load project metadata
    this.fileService.getFileTree(this.projectId).subscribe({
      next: (tree) => {
        this.files = tree;
        if (this.files.length > 0) {
          // Open first file by default if it's not a folder
          const firstFile = this.findFirstFile(this.files);
          if (firstFile) {
            this.openFile(firstFile);
          }
        } else if (!this.hasAttemptedInitialFileCreation) {
          // If project is empty, wait for project details to load language then create boilerplate
          this.shouldCreateInitialFile = true;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load file tree', err);
        this.cdr.detectChanges();
      }
    });

    // 2. Load project details for header
    this.projectsService.getProjectById(this.projectId, userId)
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (project) => {
          this.projectName = project.name;
          this.ownerId = project.ownerId;
          const storedUser = localStorage.getItem('user');
          const user = storedUser ? JSON.parse(storedUser) : null;
          this.isAdmin = user?.role === 'ADMIN' || localStorage.getItem('role') === 'ADMIN';
          
          const currentUserId = user?.userId;
          const memberArray = project.memberUserIds ? Array.from(project.memberUserIds) : [];
          console.log('Calculating role:', {
            ownerId: this.ownerId,
            currentUserId: currentUserId,
            isAdmin: this.isAdmin,
            memberIds: memberArray
          });

          if (this.ownerId === currentUserId || this.isAdmin) {
            this.userRole = 'OWNER';
          } else if (memberArray.some((id: any) => id.toString() === currentUserId?.toString())) {
            this.userRole = 'CONTRIBUTOR';
          } else {
            this.userRole = 'VIEWER';
          }

          console.log('Calculated User Role:', this.userRole);
          this.editorOptions = { ...this.editorOptions, readOnly: this.userRole === 'VIEWER' };
          if (this.editor) {
            this.editor.updateOptions({ readOnly: this.userRole === 'VIEWER' });
          }

          if (this.shouldCreateInitialFile) {
            this.createInitialFile(project.language);
            this.shouldCreateInitialFile = false;
          }

          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Failed to load project details', err);
          if (err.status === 404) {
            this.projectName = 'Project Not Found';
          }
          this.cdr.detectChanges();
        }
      });

    // 3. Load contributors (all project members)
    this.projectsService.getContributors(this.projectId).subscribe({
      next: (members) => {
        this.contributors = members;
        // Double check role from contributors list if not already owner
        const currentUserId = user?.userId;
        if (this.userRole === 'VIEWER' && members.some((m: any) => m.userId === currentUserId)) {
          this.userRole = 'CONTRIBUTOR';
          this.editorOptions = { ...this.editorOptions, readOnly: false };
          if (this.editor) {
            this.editor.updateOptions({ readOnly: false });
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load contributors', err)
    });
  }

  private findFirstFile(nodes: CodeFile[]): CodeFile | null {
    for (const node of nodes) {
      if (!node.isFolder) return node;
      if (node.children) {
        const found = this.findFirstFile(node.children);
        if (found) return found;
      }
    }
    return null;
  }

  ngOnDestroy(): void {
    console.log('[IdeComponent] ngOnDestroy called');
    if (this.editor) {
      this.editor.dispose();
    }
    // Only disconnect the WebSocket — DO NOT end the session.
    // Session lives on the backend until the owner explicitly terminates it.
    this.collabService.disconnect();
    this.sessionSub?.unsubscribe();
  }

  openFile(file: CodeFile) {
    console.log('[IdeComponent] Opening file:', file.name, 'fileId:', file.fileId);
    if (file.isFolder) return;
    
    // Add to tabs if not present
    if (!this.openTabs.find(t => t.fileId === file.fileId)) {
      this.openTabs.push(file);
    }

    if (this.activeFileId === file.fileId) return;
    
    // Save current file content before switching
    this.saveCurrentFileContent();
    this.cleanupYjs();

    this.activeFileId = file.fileId;
    this.activeFile = file;

    this.loadFileContentFromDb(file);
  }

  /** Loads file content from the database */
  private loadFileContentFromDb(file: CodeFile) {
    console.log('[IdeComponent] Loading file content from DB for:', file.name);
    if (file.content === undefined || file.content === null) {
      this.fileService.getFileContent(file.fileId).subscribe({
        next: (fullFile) => {
          console.log('[IdeComponent] Content loaded for:', file.name);
          file.content = fullFile.content;
          this.updateEditorContent(file);
          this.cdr.detectChanges();
        }
      });
    } else {
      this.updateEditorContent(file);
      this.cdr.detectChanges();
    }
  }

  closeFile(file?: CodeFile, event?: Event) {
    if (event) event.stopPropagation();

    const fileToClose = file || this.activeFile;
    if (!fileToClose) return;

    // Save if closing active
    if (fileToClose.fileId === this.activeFileId) {
      this.saveCurrentFileContent();
    }

    this.openTabs = this.openTabs.filter(t => t.fileId !== fileToClose.fileId);

    if (this.activeFileId === fileToClose.fileId) {
      if (this.openTabs.length > 0) {
        this.openFile(this.openTabs[this.openTabs.length - 1]);
      } else {
        this.activeFileId = '';
        this.activeFile = null;
        if (this.editor) this.editor.setValue('');
      }
    }
    this.cdr.detectChanges();
  }

  switchTab(file: CodeFile) {
    this.openFile(file);
  }

  private saveCurrentFileContent() {
    if (this.activeFile && this.editor) {
      const currentContent = this.editor.getValue();
      if (this.activeFile.content !== currentContent) {
        this.activeFile.content = currentContent;
        this.persistFileContent(this.activeFile.fileId, currentContent);
      }
    }
  }

  private persistFileContent(fileId: string, content: string) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.userId) return;

    this.fileService.updateFileContent(fileId, content, user.userId, user.premium || false).subscribe({
      next: () => console.log(`Auto-saved file: ${fileId}`),
      error: (err) => console.error(`Failed to auto-save file: ${fileId}`, err)
    });
  }

  initCreation(type: 'file' | 'folder') {
    this.creationMode = type;
    this.isCreateDropdownOpen = false;
    this.cdr.detectChanges();
  }

  cancelCreation() {
    this.creationMode = null;
    this.cdr.detectChanges();
  }

  confirmCreation(value: string) {
    if (!value || !value.trim() || !this.creationMode) {
      this.cancelCreation();
      return;
    }

    const name = value.trim();
    const mode = this.creationMode;
    this.creationMode = null; // Clear immediately to prevent double calls from blur + enter

    if (mode === 'file') {
      this.executeCreation(name, false);
    } else {
      this.executeCreation(name, true);
    }
  }

  private executeCreation(name: string, isFolder: boolean) {
    const parent = this.selectedNode?.isFolder ? this.selectedNode.fileId : this.selectedNode?.parentId;
    const storedUser = localStorage.getItem('user');
    const user = storedUser ? JSON.parse(storedUser) : null;

    const fileRequest = {
      projectId: this.projectId,
      name: name,
      path: '/',
      language: isFolder ? 'folder' : this.getLanguageFromExtension(name),
      content: '',
      isFolder: isFolder,
      parentId: parent,
      userId: user?.userId,
      isPremium: user?.premium || false
    };

    this.fileService.createFile(fileRequest).subscribe({
      next: () => {
        this.loadProjectData();
        this.cancelCreation();
      },
      error: (err) => {
        alert('Error: ' + err.error?.message);
        this.cancelCreation();
      }
    });
  }

  deleteNode(fileId: string) {
    this.nodeToDeleteId = fileId;
  }

  confirmDelete() {
    if (!this.nodeToDeleteId) return;
    const fileId = this.nodeToDeleteId;
    this.nodeToDeleteId = null;

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.userId) return;

    this.fileService.deleteFile(fileId, user.userId).subscribe({
      next: () => {
        // Remove from tabs if open
        this.openTabs = this.openTabs.filter(t => t.fileId !== fileId);

        if (this.activeFileId === fileId) {
          if (this.openTabs.length > 0) {
            this.openFile(this.openTabs[this.openTabs.length - 1]);
          } else {
            this.activeFileId = '';
            this.activeFile = null;
            if (this.editor) this.editor.setValue('');
          }
        }
        this.loadProjectData();
      },
      error: (err) => alert('Error: ' + err.error?.message)
    });
  }

  cancelDelete() {
    this.nodeToDeleteId = null;
  }

  handleRenameConfirmed(data: {id: string, newName: string}) {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.fileService.renameFile(data.id, data.newName, user.userId).subscribe({
      next: () => {
        this.loadProjectData();
        // Update tab name if open
        const tab = this.openTabs.find(t => t.fileId === data.id);
        if (tab) tab.name = data.newName;
      },
      error: (err) => alert('Error: ' + err.error?.message)
    });
  }

  renameNode(fileId: string, currentName: string) {
    // This is now handled inline by the explorer component
  }

  handleNodeSelected(node: CodeFile) {
    this.selectedNode = node;
    if (!node.isFolder) {
      this.openFile(node);
    }
    this.cdr.detectChanges();
  }

  toggleCreateDropdown(event: Event) {
    event.stopPropagation();
    this.isCreateDropdownOpen = !this.isCreateDropdownOpen;
    this.cdr.markForCheck();
  }

  onThemeSelected(themeId: string) {
    if (this.editorOptions.theme === themeId) return;
    
    console.log('[Theme] Applying editor theme:', themeId);
    if (this.editor) {
      try {
        this.editor.updateOptions({ theme: themeId });
        this.editorOptions.theme = themeId;
      } catch (e) {
        console.error('[Theme] Failed to set Monaco theme:', e);
      }
    } else {
      this.editorOptions.theme = themeId;
    }
    this.cdr.markForCheck();
  }

  onEditorInit(editor: any) {
    this.ngZone.runOutsideAngular(() => {
      this.editor = editor;

      if (!IdeComponent.themesDefined) {
        this.defineCustomThemes();
        IdeComponent.themesDefined = true;
      }
      
      // Apply saved theme if exists
      const userStr = localStorage.getItem('user');
      const userId = userStr ? JSON.parse(userStr).userId : 'guest';
      const savedTheme = localStorage.getItem(`editor-theme_${userId}`);
      
      if (savedTheme) {
        this.editor.updateOptions({ theme: savedTheme });
        this.editorOptions.theme = savedTheme;
      }

      // Add Ctrl+S command to Monaco
      this.editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        this.ngZone.run(() => {
          this.saveActiveFile();
        });
      });

      // We can run setupYjs here in case the activeFile was already loaded
      if (this.activeFile && this.activeFile.content !== undefined) {
        this.updateEditorContent(this.activeFile);
      }

      // Syntax checking debounce
      this.editor.onDidChangeModelContent(() => {
        if (this.lintTimeout) {
          clearTimeout(this.lintTimeout);
        }
        this.lintTimeout = setTimeout(() => {
          this.ngZone.run(() => {
            this.triggerLinting();
          });
        }, 1000);
      });
    });

    this.isLoading = false;
    
    this.collabService.participants$.subscribe(participants => {
      this.participants = participants;
      this.cdr.markForCheck();
    });

    this.collabService.status$.subscribe(status => {
      this.connectionStatus = status;
      this.cdr.markForCheck();
    });

    // Only one layout call after a slight delay to settle
    setTimeout(() => this.triggerEditorLayout(), 100);
  }

  toggleTerminal() {
    this.showTerminal = !this.showTerminal;
    this.triggerEditorLayout();
  }

  toggleTerminalExpansion() {
    this.isTerminalExpanded = !this.isTerminalExpanded;
    this.triggerEditorLayout();
  }

  @HostListener('window:resize')
  onResize() {
    this.triggerEditorLayout();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.saveActiveFile();
    }
    if (event.key === 'Escape' && this.isZenMode) {
      this.toggleZenMode();
    }
  }

  toggleZenMode() {
    this.isZenMode = !this.isZenMode;
    this.triggerEditorLayout();
    this.cdr.detectChanges();
  }

  toggleLeftSidebar() {
    this.isLeftSidebarVisible = !this.isLeftSidebarVisible;
    this.triggerEditorLayout();
    this.cdr.detectChanges();
  }

  toggleRightSidebar() {
    this.isRightSidebarVisible = !this.isRightSidebarVisible;
    this.triggerEditorLayout();
    this.cdr.detectChanges();
  }

  startTerminalResize(event: MouseEvent) {
    event.preventDefault();
    this.isResizingTerminal = true;
    document.body.style.cursor = 'row-resize';
  }

  @HostListener('window:mousemove', ['$event'])
  handleTerminalResize(event: MouseEvent) {
    if (!this.isResizingTerminal) return;

    const windowHeight = window.innerHeight;
    const newHeight = windowHeight - event.clientY;
    
    // Constraints: min 100px, max 80% of window
    if (newHeight > 100 && newHeight < windowHeight * 0.8) {
      this.terminalHeight = newHeight;
      this.triggerEditorLayout();
      this.cdr.detectChanges();
    }
  }

  @HostListener('window:mouseup')
  stopTerminalResize() {
    if (this.isResizingTerminal) {
      this.isResizingTerminal = false;
      document.body.style.cursor = 'default';
      this.triggerEditorLayout();
    }
  }

  triggerEditorLayout() {
    if (this.editor) {
      // Immediate layout
      this.editor.layout();
      
      // Secondary layout after CSS transitions (like terminal toggle) complete
      setTimeout(() => {
        this.editor.layout();
      }, 350); // Slightly more than 300ms transition
    }
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (this.isCreateDropdownOpen) {
      const target = event.target as HTMLElement;
      const isClickInside = target.closest('.create-dropdown-container');
      if (!isClickInside) {
        this.isCreateDropdownOpen = false;
        this.cdr.detectChanges();
      }
    }
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  saveActiveFile() {
    if (!this.activeFile || !this.editor || this.isSaving) return;

    const content = this.editor.getValue();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.userId;

    if (!userId) {
      this.showSaveStatus('Error: User not logged in', true);
      return;
    }

    this.isSaving = true;
    this.saveStatus = 'Saving...';
    console.log(`[Save] Saving file ${this.activeFile.fileId}, content length: ${content.length}`);
    this.cdr.detectChanges();

    this.fileService.updateFileContent(this.activeFile.fileId, content, userId, user.premium || false).subscribe({
      next: () => {
        if (this.activeFile) this.activeFile.content = content;
        this.isSaving = false;
        this.showSaveStatus('Saved Successfully');
      },
      error: (err) => {
        this.isSaving = false;
        this.showSaveStatus('Failed to save', true);
        console.error('Save failed:', err);
      }
    });
  }

  private showSaveStatus(message: string, isError: boolean = false) {
    this.saveStatus = message;
    this.cdr.detectChanges();
    setTimeout(() => {
      if (this.saveStatus === message) {
        this.saveStatus = '';
        this.cdr.detectChanges();
      }
    }, 3000);
  }

  private getLanguageFromExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'ts': return 'typescript';
      case 'js': return 'javascript';
      case 'java': return 'java';
      case 'py': return 'python';
      case 'cpp': return 'cpp';
      case 'go': return 'go';
      case 'rs': return 'rust';
      case 'rb': return 'ruby';
      case 'php': return 'php';
      case 'kt': return 'kotlin';
      case 'swift': return 'swift';
      case 'r': return 'r';
      case 'c': return 'c';
      case 'html': return 'html';
      case 'css': return 'css';
      default: return 'plaintext';
    }
  }

  private defineCustomThemes() {
    // Dracula
    monaco.editor.defineTheme('dracula', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6272a4' },
        { token: 'keyword', foreground: 'ff79c6' },
        { token: 'variable', foreground: 'f8f8f2' },
        { token: 'string', foreground: 'f1fa8c' }
      ],
      colors: {
        'editor.background': '#282a36',
        'editor.foreground': '#f8f8f2',
        'editor.lineHighlightBackground': '#44475a'
      }
    });

    // Monokai Pro
    monaco.editor.defineTheme('monokai-pro', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '727072' },
        { token: 'keyword', foreground: 'ff6188' },
        { token: 'string', foreground: 'ffd866' }
      ],
      colors: {
        'editor.background': '#2d2a2e',
        'editor.foreground': '#fcfcfa'
      }
    });

    // Nord
    monaco.editor.defineTheme('nord', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '616e88' },
        { token: 'keyword', foreground: '81a1c1' }
      ],
      colors: {
        'editor.background': '#2e3440',
        'editor.foreground': '#eceff4'
      }
    });

    // Tokyo Night
    monaco.editor.defineTheme('tokyo-night', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '565f89' },
        { token: 'keyword', foreground: 'bb9af7' },
        { token: 'variable', foreground: 'c0caf5' },
        { token: 'string', foreground: '9ece6a' }
      ],
      colors: {
        'editor.background': '#1a1b26',
        'editor.foreground': '#c0caf5'
      }
    });

    // GitHub Light
    monaco.editor.defineTheme('github-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6e7781' },
        { token: 'keyword', foreground: 'cf222e' },
        { token: 'variable', foreground: '#24292f' },
        { token: 'string', foreground: '0a3069' },
        { token: 'type', foreground: '953800' }
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#24292f',
        'editor.lineHighlightBackground': '#f6f8fa',
        'editorCursor.foreground': '#0550ae'
      }
    });

    // Solarized Light
    monaco.editor.defineTheme('solarized-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '93a1a1' },
        { token: 'keyword', foreground: '859900' },
        { token: 'variable', foreground: '839496' },
        { token: 'string', foreground: '2aa198' }
      ],
      colors: {
        'editor.background': '#fdf6e3',
        'editor.foreground': '#657b83'
      }
    });
  }

  private updateEditorContent(file: CodeFile) {
    if (this.editor) {
      const model = this.editor.getModel();
      monaco.editor.setModelLanguage(model, file.language || 'plaintext');
      this.editor.setValue(file.content || '');
      this.setupYjs();
    }
  }


  startSession() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.userId) return;
    this.connectionStatus = 'connecting';

    console.log('[IDE] Starting session. projectId:', this.projectId, 'userId:', user.userId);
    this.collabService.createSession(this.projectId, user.userId, user.premium).subscribe({
      next: (session) => {
        console.log('Session created:', session);
        this.currentSessionId = session.sessionId;
        this.currentSessionHostId = session.ownerId;
        // Persist so page refresh doesn't lose the session
        localStorage.setItem(IdeComponent.SESSION_KEY, session.sessionId);

        // Explicitly join the session to ensure owner is a participant
        this.collabService.joinSession(session.sessionId, user.userId).subscribe({
          next: (participant) => {
            console.log('Joined session as owner:', participant);
            this.collabService.connect(session.sessionId, localStorage.getItem('token') || '');
            this.subscribeToSessionTermination();
            this.loadParticipants();
          },
          error: (err) => {
            console.error('Failed to join session:', err);
            this.collabService.connect(session.sessionId, localStorage.getItem('token') || '');
            this.subscribeToSessionTermination();
            this.loadParticipants();
          }
        });
      },
      error: (err) => {
        this.connectionStatus = 'disconnected';
        console.error('[IDE] Failed to create session:', err);
        const errorMsg = err.error?.message || err.message || 'Unknown error';
        alert('Failed to start collaboration session: ' + errorMsg);
      }
    });
  }

  /** Subscribe to backend-broadcast termination events so all participants see the session end */
  private subscribeToSessionTermination() {
    this.sessionSub = this.collabService.sessionTerminated$.subscribe(() => {
      console.log('Session terminated by owner');
      this.clearSessionState();
    });
  }

  /** Clears all session state from memory and localStorage */
  private clearSessionState() {
    this.currentSessionId = null;
    this.currentSessionHostId = null;
    this.participants = [];
    this.connectionStatus = 'disconnected';
    localStorage.removeItem(IdeComponent.SESSION_KEY);
    this.collabService.disconnect();
    this.cdr.detectChanges();
  }

  /** Owner-only: Terminates the session for ALL participants */
  terminateSession() {
    if (!this.currentSessionId) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.userId) return;

    if (!confirm('Are you sure you want to terminate this session? All participants will be disconnected.')) {
      return;
    }

    this.isTerminating = true;
    console.log('[IDE] Calling endSession for:', this.currentSessionId);
    this.collabService.endSession(this.currentSessionId).subscribe({
      next: () => {
        console.log('[IDE] endSession API returned success');
        console.log('Session terminated successfully');
        this.isTerminating = false;
        this.clearSessionState();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isTerminating = false;
        console.error('Failed to terminate session:', err);
        alert('Failed to terminate session: ' + (err.error?.message || 'Unknown error'));
        this.cdr.detectChanges();
      }
    });
  }

  kickParticipant(targetUserId: string) {
    if (!this.currentSessionId || !this.isSessionOwner()) return;
    
    if (!confirm('Are you sure you want to kick this participant?')) {
      return;
    }

    this.collabService.kickParticipant(this.currentSessionId, targetUserId).subscribe({
      next: () => {
        console.log('Participant kicked');
        this.loadParticipants();
      },
      error: (err) => {
        console.error('Failed to kick participant', err);
        alert('Failed to kick participant: ' + (err.error?.message || 'Unknown error'));
      }
    });
  }

  /** Non-owner: Leave the session without terminating it */
  leaveCurrentSession() {
    if (!this.currentSessionId) return;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.userId) return;

    this.collabService.leaveSession(this.currentSessionId, user.userId).subscribe({
      next: () => {
        console.log('Left session successfully');
        this.clearSessionState();
      },
      error: (err) => {
        console.error('Failed to leave session:', err);
        // Clear locally even if API fails
        this.clearSessionState();
      }
    });
  }

  isSessionOwner(): boolean {
    if (this.isAdmin) return true;
    const userString = localStorage.getItem('user');
    if (!userString) return false;
    
    const user = JSON.parse(userString);
    
    // Authorized if user is the PROJECT owner OR the SESSION host
    const isProjectOwner = this.ownerId === user.userId;
    const isSessionHost = this.currentSessionHostId === user.userId;
    
    return isProjectOwner || isSessionHost;
  }

  loadParticipants() {
    if (!this.currentSessionId) return;
    console.log('Loading participants for session:', this.currentSessionId);
    this.collabService.getParticipants(this.currentSessionId).subscribe({
      next: (participants) => {
        console.log('Participants loaded:', participants);
        this.participants = participants;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Failed to load participants', err)
    });
  }

  getInitials(name: string): string {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  }

  getUserColor(userId: string): string {
    const colors = ['#3b82f6', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];
    const index = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  }

  copyInviteLink() {
    if (!this.currentSessionId) return;
    const link = `https://codesync.app/join/${this.currentSessionId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Invite link copied to clipboard!');
    });
  }

  inviteUser() {
    if (!this.currentSessionId || !this.inviteUsername.trim()) return;
    
    this.isInviting = true;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.collabService.inviteToSession(this.currentSessionId, this.inviteUsername.trim())
      .pipe(finalize(() => this.isInviting = false))
      .subscribe({
        next: () => {
          alert(`Invitation sent to ${this.inviteUsername}`);
          this.inviteUsername = '';
          this.cdr.detectChanges();
        },
        error: (err) => {
          alert('Failed to send invitation: ' + (err.error?.message || 'Unknown error'));
        }
      });
  }

  openThemeStore() {
    this.isThemeStoreOpen = true;
  }

  closeThemeStore() {
    this.isThemeStoreOpen = false;
  }


  setupYjs() {
    this.cleanupYjs();
    
    if (!this.activeFile || !this.currentSessionId || !this.editor) return;

    this.ydoc = new Y.Doc();
    this.ytext = this.ydoc.getText('monaco');
    
    // Bind Y.Text to editor model
    const model = this.editor.getModel();
    
    const roomName = `${this.currentSessionId}-${this.activeFile.fileId}`;
    const wsUrl = environment.apiUrl.replace(/^http/, 'ws') + '/yjs';
      
    this.yprovider = new WebsocketProvider(wsUrl, roomName, this.ydoc);
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.yprovider.awareness.setLocalStateField('user', {
      name: user.username || user.userId?.substring(0, 4) || 'Unknown',
      color: this.getUserColor(user.userId || 'unknown')
    });

    this.ybinding = new MonacoBinding(this.ytext, model, new Set([this.editor]), this.yprovider.awareness);

    // Initial content sync: If Yjs doc is empty but we have DB content, initialize Yjs
    this.yprovider.on('sync', (isSynced: boolean) => {
      if (isSynced && this.ytext && this.ytext.toString() === '' && this.activeFile?.content) {
        console.log('[Yjs] Room is empty, initializing with DB content');
        this.ytext.insert(0, this.activeFile.content);
      }
    });
  }

  cleanupYjs() {
    if (this.ybinding) {
      this.ybinding.destroy();
      this.ybinding = null;
    }
    if (this.yprovider) {
      this.yprovider.destroy();
      this.yprovider = null;
    }
    if (this.ydoc) {
      this.ydoc.destroy();
      this.ydoc = null;
    }
  }

  triggerLinting() {
    if (!this.activeFile || !this.editor) return;
    
    // Skip linting if it's plaintext
    if (!this.activeFile.language || this.activeFile.language === 'plaintext') {
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const request: ExecutionRequest = {
      projectId: this.projectId,
      fileId: this.activeFile.fileId,
      userId: user.userId,
      language: this.activeFile.language,
      sourceCode: this.editor.getValue(),
      isPremium: user.premium || false
    };

    this.executionService.lintCode(request).subscribe({
      next: (errors) => {
        const model = this.editor.getModel();
        if (!model) return;
        
        const markers = errors.map(err => ({
          severity: err.severity === 'warning' ? monaco.MarkerSeverity.Warning : monaco.MarkerSeverity.Error,
          startLineNumber: err.line,
          startColumn: err.column || 1,
          endLineNumber: err.line,
          endColumn: 1000,
          message: err.message
        }));
        
        monaco.editor.setModelMarkers(model, 'codesync-lint', markers);
      },
      error: (err) => console.error('Linting request failed', err)
    });
  }

  /** Called when the VCS panel successfully restores a snapshot. */
  onSnapshotRestored(restoredContent: string) {
    if (!this.editor || !this.activeFile) return;

    // 1. Update the Monaco editor immediately
    this.editor.setValue(restoredContent);

    // 2. Keep the in-memory file object in sync
    this.activeFile.content = restoredContent;

    // 3. Persist the restored content to the database
    this.persistFileContent(this.activeFile.fileId, restoredContent);

    this.cdr.detectChanges();
  }

  joinAsContributor() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.userId) return;

    this.projectsService.joinProject(this.projectId, user.userId).subscribe({
      next: () => {
        this.userRole = 'CONTRIBUTOR';
        this.editorOptions = { ...this.editorOptions, readOnly: false };
        if (this.editor) {
          this.editor.updateOptions({ readOnly: false });
        }
        setTimeout(() => {
          this.loadProjectData(); // Refresh everything
        }, 1000);
        alert('Welcome! You are now a contributor to this project.');
        console.log('Successfully joined as contributor');
      },
      error: (err) => {
        console.error('Failed to join as contributor', err);
        const errorMsg = err.error?.message || err.message || 'Unknown error';
        alert('Failed to join as contributor: ' + errorMsg);
      }
    });
  }

  private createInitialFile(language: string) {
    this.executionService.getLanguageVersion(language.toLowerCase()).subscribe({
      next: (info: LanguageInfo) => {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const fileRequest = {
          projectId: this.projectId,
          name: info.defaultFileName || `main.${info.extension}`,
          path: '/',
          language: info.name,
          content: info.boilerplate || '',
          isFolder: false,
          userId: user?.userId,
          isPremium: user?.premium || false
        };

        this.fileService.createFile(fileRequest).subscribe({
          next: () => {
            this.hasAttemptedInitialFileCreation = true;
            this.loadProjectData();
          },
          error: (err: any) => {
            this.hasAttemptedInitialFileCreation = true;
            console.error('Failed to create initial file', err);
          }
        });
      },
      error: (err: any) => console.error('Failed to load language config for boilerplate', err)
    });
  }

}
