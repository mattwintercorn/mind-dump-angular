import { Injectable, signal, computed, inject } from '@angular/core';
import { ref, set, remove } from 'firebase/database';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { DatabaseService } from './database.service';
import { Workspace } from '../models/workspace.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {
  private authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);
  private db = inject(DatabaseService);

  // Signals
  private workspacesSignal = signal<Workspace[]>([]);
  private activeWorkspaceSignal = signal<Workspace | null>(null);
  
  readonly workspaces = this.workspacesSignal.asReadonly();
  readonly activeWorkspace = this.activeWorkspaceSignal.asReadonly();

  // Computed - workspaces user owns
  readonly ownedWorkspaces = computed(() => 
    this.workspaces().filter(w => w.ownerId === this.authService.currentUser()?.uid)
  );

  // Computed - workspaces shared with user
  readonly sharedWorkspaces = computed(() => 
    this.workspaces().filter(w => w.ownerId !== this.authService.currentUser()?.uid)
  );

  /**
   * Load all workspaces user has access to
   */
  async loadWorkspaces(): Promise<void> {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    const userId = this.authService.currentUser()?.uid;
    if (!userId) return;

    // Load from local Dexie
    const workspaces = await this.db.workspaces
      .where('ownerId')
      .equals(userId)
      .toArray();

    this.workspacesSignal.set(workspaces);

    // Set active workspace (default or first)
    if (!this.activeWorkspace()) {
      const defaultWs = workspaces.find(w => w.isDefault);
      this.activeWorkspaceSignal.set(defaultWs || workspaces[0] || null);
    }
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(name: string): Promise<Workspace> {
    const userId = this.authService.currentUser()?.uid;
    if (!userId) {
      throw new Error('Must be authenticated to create workspace');
    }

    const id = uuidv4();
    const now = new Date();

    const workspace: Workspace = {
      id,
      name,
      ownerId: userId,
      isDefault: false,
      members: {}, // Owner implicitly has access
      createdAt: now,
      updatedAt: now
    };

    // Save to local Dexie
    await this.db.workspaces.add(workspace);

    // Save to Firebase
    const workspaceRef = ref(this.firebaseService.database, `workspaces/${id}`);
    await set(workspaceRef, {
      name: workspace.name,
      ownerId: workspace.ownerId,
      isDefault: workspace.isDefault,
      members: workspace.members,
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString()
    });

    // Reload workspaces
    await this.loadWorkspaces();

    return workspace;
  }

  /**
   * Switch active workspace
   */
  async switchWorkspace(workspaceId: string): Promise<void> {
    const workspace = await this.db.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    this.activeWorkspaceSignal.set(workspace);

    // Store preference in localStorage
    localStorage.setItem('activeWorkspaceId', workspaceId);
  }

  /**
   * Delete workspace (owner only)
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    const workspace = await this.db.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    if (workspace.isDefault) {
      throw new Error('Cannot delete default workspace');
    }

    const userId = this.authService.currentUser()?.uid;
    if (workspace.ownerId !== userId) {
      throw new Error('Only workspace owner can delete');
    }

    // Delete from local Dexie
    await this.db.workspaces.delete(workspaceId);

    // Delete from Firebase
    const workspaceRef = ref(this.firebaseService.database, `workspaces/${workspaceId}`);
    await remove(workspaceRef);

    // If this was active workspace, switch to default
    if (this.activeWorkspace()?.id === workspaceId) {
      await this.loadWorkspaces();
      const defaultWs = this.workspaces().find(w => w.isDefault);
      if (defaultWs) {
        await this.switchWorkspace(defaultWs.id);
      }
    } else {
      await this.loadWorkspaces();
    }
  }

  /**
   * Rename workspace
   */
  async renameWorkspace(workspaceId: string, newName: string): Promise<void> {
    const workspace = await this.db.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const userId = this.authService.currentUser()?.uid;
    if (workspace.ownerId !== userId) {
      throw new Error('Only workspace owner can rename');
    }

    workspace.name = newName;
    workspace.updatedAt = new Date();

    // Update local
    await this.db.workspaces.put(workspace);

    // Update Firebase
    const workspaceRef = ref(this.firebaseService.database, `workspaces/${workspaceId}/name`);
    await set(workspaceRef, newName);

    await this.loadWorkspaces();
  }
}
