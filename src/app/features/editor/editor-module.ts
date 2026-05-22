import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { EditorRoutingModule } from './editor-routing-module';
import { IdeComponent } from './ide/ide';
import { ThemeStoreModalComponent } from '../../shared/components/theme-store-modal/theme-store-modal';
import { SharedModule } from '../../shared/shared-module';

import { FileExplorerComponent } from './ide/components/file-explorer/file-explorer';
import { ExecutionTerminalComponent } from './ide/components/execution-terminal/execution-terminal';
import { VcsPanelComponent } from './ide/components/vcs-panel/vcs-panel';
import { ReviewPanelComponent } from './ide/components/review-panel/review-panel';
import { MonacoEditorModule } from 'ngx-monaco-editor-v2';

@NgModule({
  declarations: [
    IdeComponent,
    FileExplorerComponent,
    ExecutionTerminalComponent,
    VcsPanelComponent,
    ReviewPanelComponent
  ],
  imports: [
    CommonModule, 
    EditorRoutingModule, 
    FormsModule, 
    ThemeStoreModalComponent,
    SharedModule,
    MonacoEditorModule.forRoot({
      baseUrl: '/assets/monaco-editor/vs'
    })
  ],
})
export class EditorModule {}
