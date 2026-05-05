import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { WorkspaceService } from '../../../../core/services/workspace.service';

@Component({
  selector: 'app-create-workspace-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  template: `
    <h2 mat-dialog-title>Create New Workspace</h2>
    
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Workspace Name</mat-label>
        <input 
          matInput 
          [(ngModel)]="workspaceName" 
          placeholder="My Team Project"
          (keyup.enter)="onCreate()"
          autofocus>
      </mat-form-field>
      
      @if (errorMessage) {
        <p class="error-message">{{ errorMessage }}</p>
      }
    </mat-dialog-content>
    
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button 
        mat-raised-button 
        color="primary" 
        (click)="onCreate()"
        [disabled]="!workspaceName || isLoading">
        {{ isLoading ? 'Creating...' : 'Create' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }
    
    mat-dialog-content {
      min-width: 400px;
      padding: 20px 24px;
    }
    
    .error-message {
      color: #f44336;
      margin-top: 8px;
      font-size: 14px;
    }
  `]
})
export class CreateWorkspaceDialogComponent {
  private dialogRef = inject(MatDialogRef<CreateWorkspaceDialogComponent>);
  private workspaceService = inject(WorkspaceService);
  
  workspaceName = '';
  isLoading = false;
  errorMessage = '';

  onCancel(): void {
    this.dialogRef.close();
  }

  async onCreate(): Promise<void> {
    if (!this.workspaceName.trim()) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const workspace = await this.workspaceService.createWorkspace(this.workspaceName.trim());
      this.dialogRef.close(workspace);
    } catch (error) {
      this.errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to create workspace';
      this.isLoading = false;
    }
  }
}
