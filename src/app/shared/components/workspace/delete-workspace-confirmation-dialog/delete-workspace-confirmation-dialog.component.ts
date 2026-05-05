import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';

export interface DeleteWorkspaceDialogData {
  workspaceName: string;
  ideaCount: number;
}

@Component({
  selector: 'app-delete-workspace-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule
  ],
  template: `
    <div class="dialog-container">
      <div class="warning-header">
        <mat-icon class="warning-icon">warning</mat-icon>
        <h2 mat-dialog-title>Permanently Delete Workspace?</h2>
      </div>
      
      <mat-dialog-content>
        <div class="warning-box">
          <p class="warning-text">
            <strong>⚠️ This action cannot be undone!</strong>
          </p>
          <p>You are about to permanently delete:</p>
          <ul>
            <li><strong>{{ data.workspaceName }}</strong></li>
            <li>{{ data.ideaCount }} idea(s)</li>
            <li>All connections, components, and projects</li>
            <li>All shared access for collaborators</li>
          </ul>
        </div>

        <div class="confirmation-section">
          <p class="confirmation-label">
            Type <strong>DELETE</strong> to confirm:
          </p>
          <mat-form-field appearance="outline" class="full-width">
            <input 
              matInput 
              [(ngModel)]="confirmationText" 
              placeholder="DELETE"
              (keyup.enter)="onConfirm()"
              autocomplete="off"
              autofocus>
          </mat-form-field>
        </div>

        @if (errorMessage) {
          <p class="error-message">{{ errorMessage }}</p>
        }
      </mat-dialog-content>
      
      <mat-dialog-actions align="end">
        <button mat-button (click)="onCancel()">Cancel</button>
        <button 
          mat-raised-button 
          color="warn"
          (click)="onConfirm()"
          [disabled]="!isConfirmationValid()">
          Delete Permanently
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .dialog-container {
      min-width: 500px;
    }

    .warning-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 0 24px;
    }

    .warning-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #f44336;
    }

    h2 {
      margin: 0;
      color: #f44336;
    }

    mat-dialog-content {
      padding: 20px 24px;
    }

    .warning-box {
      background-color: #fff3e0;
      border: 2px solid #ff9800;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .warning-text {
      color: #e65100;
      margin-top: 0;
      font-size: 16px;
    }

    .warning-box ul {
      margin: 12px 0 0 0;
      padding-left: 24px;
    }

    .warning-box li {
      margin: 8px 0;
      color: #424242;
    }

    .confirmation-section {
      margin-top: 24px;
    }

    .confirmation-label {
      margin-bottom: 8px;
      color: #424242;
    }

    .full-width {
      width: 100%;
    }

    .error-message {
      color: #f44336;
      margin-top: 8px;
      font-size: 14px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class DeleteWorkspaceConfirmationDialogComponent {
  private dialogRef = inject(MatDialogRef<DeleteWorkspaceConfirmationDialogComponent>);
  data: DeleteWorkspaceDialogData = inject(MAT_DIALOG_DATA);
  
  confirmationText = '';
  errorMessage = '';

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    if (!this.isConfirmationValid()) {
      this.errorMessage = 'Please type DELETE to confirm';
      return;
    }

    this.dialogRef.close(true);
  }

  isConfirmationValid(): boolean {
    return this.confirmationText.trim().toUpperCase() === 'DELETE';
  }
}
