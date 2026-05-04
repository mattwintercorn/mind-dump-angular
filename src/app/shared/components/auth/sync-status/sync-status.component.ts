import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SyncService } from '../../../../core/services/sync.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './sync-status.component.html',
  styleUrl: './sync-status.component.scss'
})
export class SyncStatusComponent {
  private syncService = inject(SyncService);
  private authService = inject(AuthService);

  // Expose signals from services
  syncStatus = this.syncService.syncStatus;
  pendingCount = this.syncService.pendingCount;
  isAuthenticated = this.authService.isAuthenticated;

  // Computed signal to determine if component should be visible
  shouldShow = computed(() => {
    const status = this.syncStatus();
    const authenticated = this.isAuthenticated();
    
    // Only show when authenticated AND status is not idle/synced
    return authenticated && status !== 'idle' && status !== 'synced';
  });

  /**
   * Retry syncing when in error state
   */
  retry(): void {
    // Trigger a manual flush by queuing an empty operation
    // The sync service will attempt to flush the existing queue
    console.log('Retry sync requested');
    // TODO: Implement explicit retry method in SyncService
  }
}
