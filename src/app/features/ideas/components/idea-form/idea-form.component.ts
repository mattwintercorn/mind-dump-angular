import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Idea } from '../../../../core/models/idea.model';

@Component({
  selector: 'app-idea-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatSelectModule,
    MatRadioModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './idea-form.component.html',
  styleUrls: ['./idea-form.component.scss']
})
export class IdeaFormComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<IdeaFormComponent>);
  public data = inject<Idea | null>(MAT_DIALOG_DATA);

  ideaForm: FormGroup;
  keywords = signal<string[]>([]);

  constructor() {
    this.ideaForm = this.fb.group({
      title: [this.data?.title || '', Validators.required],
      description: [this.data?.description || ''],
      status: [this.data?.status || 'new'],
      priority: [this.data?.priority || 'medium']
    });

    if (this.data?.keywords) {
      this.keywords.set([...this.data.keywords]);
    }
  }

  get isEditMode(): boolean {
    return !!this.data;
  }

  addKeyword(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();

    if (event.key === 'Enter' && value) {
      event.preventDefault();
      if (!this.keywords().includes(value)) {
        this.keywords.set([...this.keywords(), value]);
      }
      input.value = '';
    }
  }

  removeKeyword(keyword: string): void {
    this.keywords.set(this.keywords().filter(k => k !== keyword));
  }

  onSave(): void {
    if (this.ideaForm.valid) {
      const formValue = {
        ...this.ideaForm.value,
        keywords: this.keywords()
      };
      this.dialogRef.close(formValue);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
