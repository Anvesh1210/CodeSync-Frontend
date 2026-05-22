import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CodeFile } from '../../../../../core/services/file';

@Component({
  selector: 'app-file-explorer',
  templateUrl: './file-explorer.html',
  standalone: false
})
export class FileExplorerComponent {
  @Input() files: CodeFile[] = [];
  @Input() activeFileId: string | null = null;
  @Input() selectedNodeId: string | null = null;
  
  @Output() nodeSelected = new EventEmitter<CodeFile>();
  @Output() deleteRequested = new EventEmitter<string>();
  @Output() renameConfirmed = new EventEmitter<{id: string, newName: string}>();
  @Output() renameCancelled = new EventEmitter<void>();

  expandedFolders: Set<string> = new Set<string>();
  renamingId: string | null = null;

  toggleFolder(event: Event, folderId: string) {
    event.stopPropagation();
    if (this.expandedFolders.has(folderId)) {
      this.expandedFolders.delete(folderId);
    } else {
      this.expandedFolders.add(folderId);
    }
  }

  selectNode(node: CodeFile) {
    this.nodeSelected.emit(node);
  }

  onDelete(event: Event, id: string) {
    event.stopPropagation();
    this.deleteRequested.emit(id);
  }

  onRename(event: Event, id: string) {
    event.stopPropagation();
    this.renamingId = id;
  }

  confirmRename(id: string, newName: string) {
    if (!newName || !newName.trim()) {
      this.cancelRename();
      return;
    }
    this.renameConfirmed.emit({id, newName: newName.trim()});
    this.renamingId = null;
  }

  cancelRename() {
    this.renamingId = null;
    this.renameCancelled.emit();
  }
}
