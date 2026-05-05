import { Component, inject } from '@angular/core';

import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MergeStrategy } from '../../../../core/models/sync.model';

export interface MergeDialogData {
  localIdeasCount: number;
}

export interface MergeDialogResult {
  strategy: MergeStrategy;
}

@Component({
    selector: 'app-merge-dialog',
    imports: [
    MatDialogModule,
    MatButtonModule,
    MatRadioModule,
    MatIconModule,
    FormsModule
],
    templateUrl: './merge-dialog.component.html',
    styleUrls: ['./merge-dialog.component.scss']
})
export class MergeDialogComponent {
  dialogRef = inject(MatDialogRef<MergeDialogComponent>);
  data: MergeDialogData = inject(MAT_DIALOG_DATA);

  selectedStrategy: MergeStrategy | null = null;

  strategies = [
    {
      value: 'upload' as MergeStrategy,
      title: 'Upload to Cloud',
      description: 'Keep your local ideas and upload them to the cloud',
      icon: 'cloud_upload',
      recommended: true
    },
    {
      value: 'download' as MergeStrategy,
      title: 'Download from Cloud',
      description: 'Replace local ideas with your cloud data',
      icon: 'cloud_download',
      recommended: false
    },
    {
      value: 'separate' as MergeStrategy,
      title: 'Keep Local Only',
      description: 'Archive local ideas and start fresh with cloud',
      icon: 'backup',
      recommended: false
    }
  ];

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onContinue(): void {
    if (this.selectedStrategy) {
      this.dialogRef.close({ strategy: this.selectedStrategy });
    }
  }

  get canContinue(): boolean {
    return this.selectedStrategy !== null;
  }
}
