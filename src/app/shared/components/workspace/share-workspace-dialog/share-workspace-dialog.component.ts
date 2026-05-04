import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { WorkspaceMembers } from '../../../../core/models/workspace.model';

export interface ShareWorkspaceDialogData {
  workspaceId: string;
  workspaceName: string;
  ownerId: string;
  members: WorkspaceMembers;
}

@Component({
  selector: 'app-share-workspace-dialog',
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
    MatProgressSpinnerModule
  ],
  templateUrl: './share-workspace-dialog.component.html',
  styleUrls: ['./share-workspace-dialog.component.scss']
})
export class ShareWorkspaceDialogComponent {
  dialogRef = inject(MatDialogRef<ShareWorkspaceDialogComponent>);
  data: ShareWorkspaceDialogData = inject(MAT_DIALOG_DATA);
  workspaceService = inject(WorkspaceService);

  emailControl = new FormControl('', [Validators.required, Validators.email]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  memberEmails = signal<Record<string, string>>({});

  async onAddCollaborator(): Promise<void> {
    if (this.emailControl.invalid || !this.emailControl.value) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.workspaceService.shareWorkspace(
        this.data.workspaceId,
        this.emailControl.value
      );
      this.emailControl.setValue('');
      this.emailControl.markAsUntouched();
      
      // Reload to show new member
      this.dialogRef.close({ refresh: true });
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to add collaborator');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onRemoveCollaborator(userId: string): Promise<void> {
    try {
      await this.workspaceService.removeCollaborator(this.data.workspaceId, userId);
      
      // Remove from members object
      const updatedMembers = { ...this.data.members };
      delete updatedMembers[userId];
      this.data.members = updatedMembers;
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to remove collaborator');
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  isOwner(userId: string): boolean {
    return userId === this.data.ownerId;
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
}
