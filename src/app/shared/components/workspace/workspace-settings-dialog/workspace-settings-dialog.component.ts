import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { WorkspaceMembers } from '../../../../core/models/workspace.model';
import { DeleteWorkspaceConfirmationDialogComponent } from '../delete-workspace-confirmation-dialog/delete-workspace-confirmation-dialog.component';

export interface WorkspaceSettingsDialogData {
  workspaceId: string;
  workspaceName: string;
  isOwner: boolean;
  isDefault: boolean;
  members: WorkspaceMembers;
}

@Component({
  selector: 'app-workspace-settings-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatChipsModule,
    MatDividerModule
  ],
  templateUrl: './workspace-settings-dialog.component.html',
  styleUrls: ['./workspace-settings-dialog.component.scss']
})
export class WorkspaceSettingsDialogComponent {
  dialogRef = inject(MatDialogRef<WorkspaceSettingsDialogComponent>);
  data: WorkspaceSettingsDialogData = inject(MAT_DIALOG_DATA);
  workspaceService = inject(WorkspaceService);
  dialog = inject(MatDialog);

  nameControl = new FormControl(this.data.workspaceName, [Validators.required]);
  memberEmails = signal<Record<string, string>>({});

  get hasNameChanged(): boolean {
    return this.nameControl.value !== this.data.workspaceName && this.nameControl.valid;
  }

  async onRename(): Promise<void> {
    if (this.nameControl.invalid || !this.nameControl.value) {
      return;
    }

    try {
      await this.workspaceService.renameWorkspace(
        this.data.workspaceId,
        this.nameControl.value
      );
      this.dialogRef.close({ renamed: true });
    } catch (error) {
      console.error('Failed to rename workspace:', error);
    }
  }

  async onDelete(): Promise<void> {
    // Get idea count for confirmation dialog
    const ideaCount = await this.workspaceService.getWorkspaceIdeaCount(this.data.workspaceId);

    // Open strong confirmation dialog
    const confirmDialogRef = this.dialog.open(DeleteWorkspaceConfirmationDialogComponent, {
      width: '600px',
      data: {
        workspaceName: this.data.workspaceName,
        ideaCount: ideaCount
      },
      disableClose: true
    });

    const confirmed = await confirmDialogRef.afterClosed().toPromise();

    if (!confirmed) {
      return;
    }

    try {
      await this.workspaceService.deleteWorkspace(this.data.workspaceId);
      this.dialogRef.close({ deleted: true });
    } catch (error) {
      console.error('Failed to delete workspace:', error);
    }
  }

  async onLeave(): Promise<void> {
    const confirmed = confirm(
      `Are you sure you want to leave "${this.data.workspaceName}"? You will lose access to all ideas in this workspace.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await this.workspaceService.leaveWorkspace(this.data.workspaceId);
      this.dialogRef.close({ left: true });
    } catch (error) {
      console.error('Failed to leave workspace:', error);
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  getMemberIds(): string[] {
    return Object.keys(this.data.members);
  }

  getRole(userId: string): string {
    return this.data.members[userId];
  }

  getMemberEmail(userId: string): string {
    return this.memberEmails()[userId] || userId;
  }

  getOwnerUserId(): string {
    return Object.entries(this.data.members).find(([_, role]) => role === 'owner')?.[0] || '';
  }
}
