// src/app/features/ideas/components/idea-card/idea-card.component.ts
import { Component, Input, Output, EventEmitter, inject } from '@angular/core';

import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Idea } from '../../../../core/models/idea.model';
import { ColorService } from '../../../../core/services/color.service';

@Component({
    selector: 'app-idea-card',
    imports: [
    MatCardModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule
],
    templateUrl: './idea-card.component.html',
    styleUrl: './idea-card.component.scss'
})
export class IdeaCardComponent {
  @Input({ required: true }) idea!: Idea;
  @Output() select = new EventEmitter<Idea>();
  @Output() edit = new EventEmitter<Idea>();
  @Output() delete = new EventEmitter<string>();
  @Output() keywordClick = new EventEmitter<string>();

  private colorService = inject(ColorService);

  onCardClick(): void {
    this.select.emit(this.idea);
  }

  onEditClick(event: Event): void {
    event.stopPropagation();
    this.edit.emit(this.idea);
  }

  onDeleteClick(event: Event): void {
    event.stopPropagation();
    this.delete.emit(this.idea.id);
  }

  onKeywordClick(event: Event, keyword: string): void {
    event.stopPropagation();
    this.keywordClick.emit(keyword);
  }

  getKeywordColor(keyword: string): string {
    return this.colorService.getKeywordColor(keyword);
  }

  getPriorityBorderColor(): string {
    const colors = {
      high: '#EF4444',
      medium: '#F59E0B',
      low: '#3B82F6'
    };
    return colors[this.idea.priority];
  }
}
