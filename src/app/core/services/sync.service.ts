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

  // Map to track active Firebase listeners (legacy)
  private listeners = new Map<string, any>();
  
  // Map to track per-workspace listeners
  private workspaceListeners = new Map<string, any>();
  
  // Track if we've synced at least once per workspace (to avoid deleting on first load)
  private workspaceSyncedOnce = new Map<string, boolean>();

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
   * Start listening for remote changes (LEGACY - use startListeningToWorkspace)
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
    const ideasPath = `ideas/${workspaceId}`;
    const ideasRef = ref(this.firebaseService.database, ideasPath);

    // Set up listener for real-time updates
    const unsubscribe = onValue(ideasRef, async (snapshot) => {
      const ideas = snapshot.val();
      if (ideas) {
        for (const idea of Object.values(ideas) as any[]) {
          await this.handleRemoteIdea(idea, workspaceId);
        }
        // Trigger UI reload
        this.notifyIdeasChanged();
      }
    });

    // Store listener info for cleanup
    this.listeners.set(workspaceId, {
      ref: ideasRef,
      unsubscribe
    });
  }

  /**
   * Notify IdeaService that ideas have changed
   */
  private notifyIdeasChanged(): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ideas-changed'));
    }
  }

  /**
   * Handle incoming remote idea
   */
  private async handleRemoteIdea(remoteIdea: any, workspaceId: string): Promise<void> {
    try {
      // Normalize the remote idea to ensure all required fields exist
      const normalizedIdea = this.normalizeIdea(remoteIdea);
      
      // Get local version of the idea if it exists
      const localIdea = await this.databaseService.ideas.get(normalizedIdea.id);

      if (!localIdea) {
        // New idea - add to local database
        await this.databaseService.ideas.put(normalizedIdea);
        return;
      }

      // Check for version conflict
      if (this.detectConflict(localIdea, normalizedIdea)) {
        const localVersion = localIdea.version || 1;
        const remoteVersion = normalizedIdea.version || 1;
        
        console.warn(`Version mismatch for idea ${normalizedIdea.id}: local=${localVersion}, remote=${remoteVersion}`);
        
        // If remote version is newer, accept it (normal update case)
        if (remoteVersion > localVersion) {
          console.log(`Accepting newer remote version for idea ${normalizedIdea.id}`);
          await this.databaseService.ideas.put(normalizedIdea);
          return;
        }
        
        // If local version is newer, keep local (should not happen in normal flow)
        if (localVersion > remoteVersion) {
          console.log(`Local version is newer for idea ${normalizedIdea.id}, keeping local`);
          return;
        }
        
        // Versions are equal but conflict detected - this shouldn't happen
        // but if it does, attempt to resolve
        console.warn(`Same version but conflict detected for idea ${normalizedIdea.id}`);
        const resolved = this.resolveConflict(localIdea, normalizedIdea);
        
        if (resolved) {
          // Auto-merge succeeded
          await this.databaseService.ideas.put(resolved);
          console.log(`Auto-merged conflict for idea ${normalizedIdea.id}`);
        } else {
          // Manual resolution needed
          console.error(`Manual conflict resolution needed for idea ${normalizedIdea.id}`);
          // TODO: In later tasks, trigger UI dialog for manual resolution
        }
        return;
      }

      // Versions match - safe to update
      await this.databaseService.ideas.put(normalizedIdea);
    } catch (error) {
      console.error('Error handling remote idea:', error);
    }
  }

  /**
   * Normalize idea data from Firebase to ensure all required fields exist
   */
  private normalizeIdea(remoteIdea: any): Idea {
    return {
      ...remoteIdea,
      keywords: Array.isArray(remoteIdea.keywords) ? remoteIdea.keywords : [],
      attachments: Array.isArray(remoteIdea.attachments) ? remoteIdea.attachments : [],
      createdAt: remoteIdea.createdAt instanceof Date 
        ? remoteIdea.createdAt 
        : new Date(remoteIdea.createdAt),
      updatedAt: remoteIdea.updatedAt instanceof Date 
        ? remoteIdea.updatedAt 
        : new Date(remoteIdea.updatedAt),
    };
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
   * Start listening to a workspace (new per-workspace method)
   */
  startListeningToWorkspace(workspaceId: string): void {
    console.log('[SyncService] Starting listener for workspace:', workspaceId);
    
    // Only listen if authenticated
    if (!this.authService.isAuthenticated()) {
      console.error('[SyncService] Not authenticated, skipping listener');
      return;
    }

    // Don't create duplicate listeners
    if (this.workspaceListeners.has(workspaceId)) {
      console.log('[SyncService] Listener already exists');
      return;
    }

    // Create Firebase reference for ideas in this workspace
    const ideasPath = `workspaces/${workspaceId}/ideas`;
    console.log('[SyncService] Listening to Firebase path:', ideasPath);
    const ideasRef = ref(this.firebaseService.database, ideasPath);

    // Set up listener for real-time updates
    const unsubscribe = onValue(ideasRef, async (snapshot) => {
      console.log('[SyncService] ✅ Firebase listener triggered!');
      console.log('[SyncService] Snapshot exists:', snapshot.exists());
      
      const ideas = snapshot.val();
      const remoteIdeaIds = new Set<string>();
      
      if (ideas) {
        const ideaIds = Object.keys(ideas);
        console.log('[SyncService] Processing', ideaIds.length, 'ideas:', ideaIds);
        
        // Track remote idea IDs
        ideaIds.forEach(id => remoteIdeaIds.add(id));
        
        // Handle adds/updates
        for (const idea of Object.values(ideas) as any[]) {
          console.log('[SyncService] Handling idea:', idea.id, idea.title);
          await this.handleRemoteIdea(idea, workspaceId);
        }
      } else {
        console.log('[SyncService] No ideas in snapshot');
      }
      
      // Detect deletions: find local ideas that aren't in remote snapshot
      // IMPORTANT: Only detect deletions after the first sync to avoid deleting
      // all local ideas if Firebase is empty on initial load
      const hasSyncedBefore = this.workspaceSyncedOnce.get(workspaceId);
      
      if (hasSyncedBefore && ideas) {
        // Only detect deletions if we've synced before AND Firebase has ideas
        const localIdeas = await this.databaseService.ideas
          .where('workspaceId')
          .equals(workspaceId)
          .toArray();
        
        const deletedIdeas = localIdeas.filter(localIdea => !remoteIdeaIds.has(localIdea.id));
        
        if (deletedIdeas.length > 0) {
          console.log('[SyncService] Detected', deletedIdeas.length, 'deleted ideas:', deletedIdeas.map(i => i.id));
          for (const deletedIdea of deletedIdeas) {
            console.log('[SyncService] Deleting local idea:', deletedIdea.id, deletedIdea.title);
            await this.databaseService.ideas.delete(deletedIdea.id);
          }
        }
      } else if (!hasSyncedBefore) {
        console.log('[SyncService] First sync for workspace - skipping deletion detection');
      }
      
      // Mark this workspace as synced
      if (ideas) {
        this.workspaceSyncedOnce.set(workspaceId, true);
      }
      
      // Trigger UI reload
      console.log('[SyncService] Triggering UI reload...');
      this.notifyIdeasChanged();
    }, (error) => {
      console.error('[SyncService] Firebase listener error:', error);
    });

    // Store listener info for cleanup
    this.workspaceListeners.set(workspaceId, {
      ref: ideasRef,
      unsubscribe
    });
    
    console.log('[SyncService] ✅ Listener registered successfully');
  }

  /**
   * Stop listening to a workspace
   */
  stopListeningToWorkspace(workspaceId: string): void {
    const listener = this.workspaceListeners.get(workspaceId);
    if (listener) {
      off(listener.ref);
      this.workspaceListeners.delete(workspaceId);
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
    
    // Clean up workspace listeners
    this.workspaceListeners.forEach((listener) => {
      off(listener.ref);
    });
    this.workspaceListeners.clear();
  }
}
