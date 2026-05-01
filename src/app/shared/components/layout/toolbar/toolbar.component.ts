// src/app/shared/components/layout/toolbar/toolbar.component.ts
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';

export type ViewMode = 'grid' | 'graph' | 'cluster';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatTooltipModule
  ],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss'
})
export class ToolbarComponent {
  @Input() title = 'Mind Dump';
  @Output() newIdea = new EventEmitter<void>();
  @Output() viewModeChange = new EventEmitter<ViewMode>();

  currentViewMode: ViewMode = 'grid';

  onNewIdea(): void {
    this.newIdea.emit();
  }

  onViewModeChange(mode: ViewMode): void {
    this.currentViewMode = mode;
    this.viewModeChange.emit(mode);
  }
}
