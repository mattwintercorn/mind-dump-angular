// src/app/shared/components/layout/toolbar/toolbar.component.ts
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../../core/services/auth.service';
import { SignInButtonComponent } from '../../auth/sign-in-button/sign-in-button.component';
import { SyncStatusComponent } from '../../auth/sync-status/sync-status.component';

export type ViewMode = 'grid' | 'graph' | 'cluster';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    SignInButtonComponent,
    SyncStatusComponent
  ],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss'
})
export class ToolbarComponent {
  @Input() title = 'Mind Dump';
  @Output() newIdea = new EventEmitter<void>();
  @Output() viewModeChange = new EventEmitter<ViewMode>();

  authService = inject(AuthService);

  currentViewMode: ViewMode = 'grid';

  onNewIdea(): void {
    this.newIdea.emit();
  }

  onViewModeChange(mode: ViewMode): void {
    this.currentViewMode = mode;
    this.viewModeChange.emit(mode);
  }

  async onSignOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }
}
