import { Component, inject } from '@angular/core';

import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CreateWorkspaceDialogComponent } from '../create-workspace-dialog/create-workspace-dialog.component';
import { WorkspaceSettingsDialogComponent } from '../workspace-settings-dialog/workspace-settings-dialog.component';

@Component({
    selector: 'app-workspace-switcher',
    imports: [
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule
],
    templateUrl: './workspace-switcher.component.html',
    styleUrls: ['./workspace-switcher.component.scss']
})
export class WorkspaceSwitcherComponent {
  workspaceService = inject(WorkspaceService);
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);

  async onWorkspaceClick(workspaceId: string): Promise<void> {
    await this.workspaceService.switchWorkspace(workspaceId);
  }

  onCreateWorkspace(): void {
    const dialogRef = this.dialog.open(CreateWorkspaceDialogComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe(async (workspace) => {
      if (workspace) {
        // Workspace created successfully, switch to it
        await this.workspaceService.switchWorkspace(workspace.id);
      }
    });
  }

  onWorkspaceSettings(event: Event, workspaceId: string, workspaceName: string, isDefault: boolean): void {
    // Prevent menu from closing when clicking settings button
    event.stopPropagation();

    const workspace = this.workspaceService.workspaces().find(w => w.id === workspaceId);
    if (!workspace) return;

    const currentUserId = this.authService.currentUser()?.uid;
    const isOwner = workspace.ownerId === currentUserId;

    const dialogRef = this.dialog.open(WorkspaceSettingsDialogComponent, {
      width: '600px',
      data: {
        workspaceId: workspaceId,
        workspaceName: workspaceName,
        isOwner: isOwner,
        isDefault: isDefault,
        members: workspace.members || {}
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result?.deleted || result?.left) {
        // Workspace was deleted or left, reload workspaces
        await this.workspaceService.loadWorkspaces();
      } else if (result?.renamed) {
        // Workspace was renamed, reload workspaces
        await this.workspaceService.loadWorkspaces();
      }
    });
  }

  isActive(workspaceId: string): boolean {
    return this.workspaceService.activeWorkspace()?.id === workspaceId;
  }
}
