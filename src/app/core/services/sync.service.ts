import { Injectable, signal, inject } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';
import { ref, set, onValue, off } from 'firebase/database';
import { Change, SyncStatus } from '../models/sync.model';
import { Idea } from '../models/idea.model';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);
  private databaseService = inject(DatabaseService);

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

  // Map to track active Firebase listeners
  private listeners = new Map<string, any>();

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
   * Start listening for remote changes
   */
  startListening(workspaceId: string): void {
    // Only listen if authenticated
    if (!this.authService.isAuthenticated()) {
      return;
    }

    // Don't create duplicate listeners
    if (this.listeners.has(workspaceId)) {
      return;
    }

    // Create Firebase reference for ideas in this workspace
    const ideasPath = `workspaces/${workspaceId}/ideas`;
    const ideasRef = ref(this.firebaseService.database, ideasPath);

    // Set up listener for real-time updates
    const unsubscribe = onValue(ideasRef, (snapshot) => {
      const ideas = snapshot.val();
      if (ideas) {
        Object.values(ideas).forEach((idea: any) => {
          this.handleRemoteIdea(idea, workspaceId);
        });
      }
    });

    // Store listener info for cleanup
    this.listeners.set(workspaceId, {
      ref: ideasRef,
      unsubscribe
    });
  }

  /**
   * Handle incoming remote idea
   */
  private async handleRemoteIdea(remoteIdea: any, workspaceId: string): Promise<void> {
    try {
      // Get local version of the idea if it exists
      const localIdea = await this.databaseService.ideas.get(remoteIdea.id);

      if (!localIdea) {
        // New idea - add to local database
        await this.databaseService.ideas.put(remoteIdea);
        return;
      }

      // Check for version conflict
      if (this.detectConflict(localIdea, remoteIdea)) {
        console.warn(`Version conflict detected for idea ${remoteIdea.id}: local=${localIdea.version}, remote=${remoteIdea.version}`);
        
        // Attempt to resolve conflict automatically
        const resolved = this.resolveConflict(localIdea, remoteIdea);
        
        if (resolved) {
          // Auto-merge succeeded
          await this.databaseService.ideas.put(resolved);
          console.log(`Auto-merged conflict for idea ${remoteIdea.id}`);
        } else {
          // Manual resolution needed
          console.error(`Manual conflict resolution needed for idea ${remoteIdea.id}`);
          // TODO: In later tasks, trigger UI dialog for manual resolution
        }
        return;
      }

      // Versions match - safe to update
      await this.databaseService.ideas.put(remoteIdea);
    } catch (error) {
      console.error('Error handling remote idea:', error);
    }
  }

  /**
   * Detect if there's a version conflict between local and remote ideas
   */
  private detectConflict(localIdea: Idea, remoteIdea: Idea): boolean {
    return localIdea.version !== remoteIdea.version;
  }

  /**
   * Resolve conflict between local and remote ideas
   * Returns merged idea if auto-merge successful, null if manual resolution needed
   */
  private resolveConflict(localIdea: Idea, remoteIdea: Idea): Idea | null {
    // Check if title or description conflicts require manual resolution
    if (this.needsManualResolution('title', localIdea.title, remoteIdea.title)) {
      return null;
    }
    
    if (this.needsManualResolution('description', localIdea.description, remoteIdea.description)) {
      return null;
    }

    // Auto-merge keywords (union)
    const mergedKeywords = this.mergeKeywords(localIdea.keywords, remoteIdea.keywords);

    // Use newest values for metadata fields
    const mergedStatus = this.mergeMetadata(localIdea, remoteIdea, 'status');
    const mergedPriority = this.mergeMetadata(localIdea, remoteIdea, 'priority');
    const mergedComponent = this.mergeMetadata(localIdea, remoteIdea, 'component');
    const mergedProject = this.mergeMetadata(localIdea, remoteIdea, 'project');

    // Create merged idea with newest version number
    return {
      ...remoteIdea, // Start with remote (typically has higher version)
      keywords: mergedKeywords,
      status: mergedStatus,
      priority: mergedPriority,
      component: mergedComponent,
      project: mergedProject,
      version: Math.max(localIdea.version || 0, remoteIdea.version || 0)
    };
  }

  /**
   * Merge keywords from local and remote (union of both sets)
   */
  private mergeKeywords(localKeywords: string[], remoteKeywords: string[]): string[] {
    const merged = new Set([...localKeywords, ...remoteKeywords]);
    return Array.from(merged);
  }

  /**
   * Merge metadata field by selecting the newest value based on timestamp
   */
  private mergeMetadata(localIdea: Idea, remoteIdea: Idea, field: keyof Idea): any {
    const localTimestamp = new Date(localIdea.updatedAt).getTime();
    const remoteTimestamp = new Date(remoteIdea.updatedAt).getTime();
    
    // Use newest value
    if (remoteTimestamp >= localTimestamp) {
      return remoteIdea[field];
    } else {
      return localIdea[field];
    }
  }

  /**
   * Check if a field needs manual resolution
   * Returns true if both values differ and require user decision
   */
  private needsManualResolution(field: string, localValue: any, remoteValue: any): boolean {
    // For title and description, any difference requires manual resolution
    if (field === 'title' || field === 'description') {
      return localValue !== remoteValue;
    }
    
    return false;
  }

  /**
   * Stop listening for remote changes
   */
  stopListening(workspaceId?: string): void {
    if (workspaceId) {
      // Stop listening to specific workspace
      const listener = this.listeners.get(workspaceId);
      if (listener) {
        off(listener.ref);
        this.listeners.delete(workspaceId);
      }
    } else {
      // Stop all listeners
      this.listeners.forEach((listener) => {
        off(listener.ref);
      });
      this.listeners.clear();
    }
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
