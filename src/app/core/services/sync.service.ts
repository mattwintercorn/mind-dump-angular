import { Injectable, signal, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { ref, set } from 'firebase/database';
import { Change, SyncStatus } from '../models/sync.model';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);

  // Private writable signals
  private syncStatusSignal = signal<SyncStatus>('idle');
  private pendingCountSignal = signal<number>(0);

  // Public readonly signals
  readonly syncStatus = this.syncStatusSignal.asReadonly();
  readonly pendingCount = this.pendingCountSignal.asReadonly();

  // Queue for pending changes
  private changeQueue: Change[] = [];
  
  // Timer for batching
  private batchTimer: any = null;
  private readonly BATCH_DELAY = 3000; // 3 seconds

  constructor() {
    // Service initialized
  }

  /**
   * Queue a change for syncing
   * Resets the batch timer on each new change
   */
  queueChange(change: Change): void {
    this.changeQueue.push(change);
    this.pendingCountSignal.set(this.changeQueue.length);
    
    // Reset the batch timer
    this.resetBatchTimer();
  }

  /**
   * Reset the batch timer
   * Clears existing timer and starts a new one
   */
  private resetBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, this.BATCH_DELAY);
  }

  /**
   * Flush all pending changes to Firebase
   */
  private async flushBatch(): Promise<void> {
    if (this.changeQueue.length === 0) {
      return;
    }

    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      this.syncStatusSignal.set('offline');
      return;
    }

    this.syncStatusSignal.set('syncing');

    try {
      // Upload all changes
      const uploadPromises = this.changeQueue.map(change => 
        this.uploadChange(change)
      );

      await Promise.all(uploadPromises);

      // Clear the queue on success
      this.changeQueue = [];
      this.pendingCountSignal.set(0);
      this.syncStatusSignal.set('synced');
    } catch (error) {
      console.error('Sync error:', error);
      this.syncStatusSignal.set('error');
      // Keep changes in queue on error
    }
  }

  /**
   * Upload a single change to Firebase
   */
  private async uploadChange(change: Change): Promise<void> {
    const user = this.authService.currentUser();
    if (!user) {
      throw new Error('No authenticated user');
    }

    // Construct Firebase path based on entity type
    const path = this.getFirebasePath(change);
    const firebaseRef = ref(this.firebaseService.database, path);

    if (change.type === 'delete') {
      await set(firebaseRef, null);
    } else {
      await set(firebaseRef, change.data);
    }
  }

  /**
   * Get Firebase path for a change
   */
  private getFirebasePath(change: Change): string {
    const { entity, workspaceId, id } = change;
    
    switch (entity) {
      case 'idea':
        return `workspaces/${workspaceId}/ideas/${id}`;
      case 'connection':
        return `workspaces/${workspaceId}/connections/${id}`;
      case 'component':
        return `workspaces/${workspaceId}/components/${id}`;
      case 'project':
        return `workspaces/${workspaceId}/projects/${id}`;
      default:
        throw new Error(`Unknown entity type: ${entity}`);
    }
  }

  /**
   * Start listening for remote changes (stub for Task 8)
   */
  startListening(): void {
    // TODO: Implement in Task 8
  }

  /**
   * Stop listening for remote changes (stub for Task 8)
   */
  stopListening(): void {
    // TODO: Implement in Task 8
  }

  /**
   * Clean up on service destroy
   */
  ngOnDestroy(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    this.stopListening();
  }
}
