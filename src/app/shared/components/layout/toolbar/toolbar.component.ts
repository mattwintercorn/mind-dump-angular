// src/app/shared/components/layout/toolbar/toolbar.component.ts
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../../core/services/auth.service';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { SignInButtonComponent } from '../../auth/sign-in-button/sign-in-button.component';
import { SyncStatusComponent } from '../../auth/sync-status/sync-status.component';
import { WorkspaceSwitcherComponent } from '../../workspace/workspace-switcher/workspace-switcher.component';
import { ShareWorkspaceDialogComponent, ShareWorkspaceDialogData } from '../../workspace/share-workspace-dialog/share-workspace-dialog.component';

export type ViewMode = 'grid' | 'graph' | 'cluster';

@Component({
    selector: 'app-toolbar',
    imports: [
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatButtonToggleModule,
        MatTooltipModule,
        MatMenuModule,
        MatDividerModule,
        MatDialogModule,
        SignInButtonComponent,
        SyncStatusComponent,
        WorkspaceSwitcherComponent
    ],
    templateUrl: './toolbar.component.html',
    styleUrl: './toolbar.component.scss'
})
export class ToolbarComponent {
  @Input() title = 'Mind Dump';
  @Output() newIdea = new EventEmitter<void>();
  @Output() viewModeChange = new EventEmitter<ViewMode>();

  authService = inject(AuthService);
  workspaceService = inject(WorkspaceService);
  private dialog = inject(MatDialog);

  currentViewMode: ViewMode = 'grid';

  onNewIdea(): void {
    this.newIdea.emit();
  }

  onViewModeChange(mode: ViewMode): void {
    this.currentViewMode = mode;
    this.viewModeChange.emit(mode);
  }

  canShareWorkspace(): boolean {
    const currentUser = this.authService.currentUser();
    const activeWorkspace = this.workspaceService.activeWorkspace();
    return !!currentUser && !!activeWorkspace && activeWorkspace.ownerId === currentUser.uid;
  }

  onShareWorkspace(): void {
    const activeWorkspace = this.workspaceService.activeWorkspace();
    if (!activeWorkspace) {
      return;
    }

    const dialogData: ShareWorkspaceDialogData = {
      workspaceId: activeWorkspace.id,
      workspaceName: activeWorkspace.name,
      ownerId: activeWorkspace.ownerId,
      members: activeWorkspace.members || {}
    };

    this.dialog.open(ShareWorkspaceDialogComponent, {
      width: '500px',
      data: dialogData
    });
  }

  async onSignOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }
}
