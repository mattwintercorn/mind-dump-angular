import { Injectable, signal, computed, inject } from '@angular/core';
import { ref, set, remove, get, query, orderByChild, equalTo } from 'firebase/database';
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

  // LocalStorage key for active workspace
  private readonly ACTIVE_WORKSPACE_KEY = 'mind-dump-active-workspace';

  // Signals
  private workspacesSignal = signal<Workspace[]>([]);
  private activeWorkspaceSignal = signal<Workspace | null>(null);
  private isLoadingSignal = signal<boolean>(false);
  
  readonly workspaces = this.workspacesSignal.asReadonly();
  readonly activeWorkspace = this.activeWorkspaceSignal.asReadonly();
  readonly isLoading = this.isLoadingSignal.asReadonly();

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

    this.isLoadingSignal.set(true);

    try {
      // First, get workspace IDs from user profile
      const userWorkspacesRef = ref(this.firebaseService.database, `users/${userId}/workspaces`);
      const snapshot = await get(userWorkspacesRef);
      
      if (snapshot.exists()) {
        const workspaceIds = Object.keys(snapshot.val());
        
        // Load each workspace from Firebase
        for (const wsId of workspaceIds) {
          const wsRef = ref(this.firebaseService.database, `workspaces/${wsId}`);
          const wsSnapshot = await get(wsRef);
          
          if (wsSnapshot.exists()) {
            const wsData = wsSnapshot.val();
            const workspace: any = {
              id: wsId,
              name: wsData.name,
              ownerId: wsData.ownerId,
              isDefault: wsData.isDefault || false,
              members: wsData.members || {},
              role: wsData.ownerId === userId ? 'owner' : 'editor',
              syncStatus: 'synced',
              createdAt: new Date(wsData.createdAt),
              updatedAt: new Date(wsData.updatedAt)
            };
            
            // Upsert to local Dexie
            await this.db.workspaces.put(workspace);
          }
        }
      }
    } catch (error) {
      console.error('Error loading workspaces from Firebase:', error);
    }

    // Load from local Dexie - ALL workspaces user has access to
    // (Already filtered by user's workspace list from Firebase above)
    const allWorkspaces = await this.db.workspaces.toArray();
    
    // Filter for workspaces where user is owner OR member
    const workspaces = allWorkspaces.filter(w => 
      w.ownerId === userId || (w.members && w.members[userId])
    );

    this.workspacesSignal.set(workspaces);

    // Set active workspace (restore last, or default, or first)
    if (!this.activeWorkspace()) {
      // Try to restore last active workspace from localStorage
      const lastActiveId = this.getLastActiveWorkspaceId();
      let workspaceToActivate: Workspace | undefined;

      if (lastActiveId) {
        workspaceToActivate = workspaces.find(w => w.id === lastActiveId);
      }

      // Fallback to default or first workspace
      if (!workspaceToActivate) {
        const defaultWs = workspaces.find(w => w.isDefault);
        workspaceToActivate = defaultWs || workspaces[0] || null;
      }

      if (workspaceToActivate) {
        this.activeWorkspaceSignal.set(workspaceToActivate);
      }
    }

    this.isLoadingSignal.set(false);
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

    const workspace: any = {
      id,
      name,
      ownerId: userId,
      isDefault: false,
      members: {}, // Owner implicitly has access
      role: 'owner',
      syncStatus: 'synced',
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

    // Add workspace ID to user's profile
    const userWorkspaceRef = ref(this.firebaseService.database, `users/${userId}/workspaces/${id}`);
    await set(userWorkspaceRef, true);

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
    this.saveLastActiveWorkspaceId(workspaceId);
  }

  /**
   * Get last active workspace ID from localStorage
   */
  private getLastActiveWorkspaceId(): string | null {
    return localStorage.getItem(this.ACTIVE_WORKSPACE_KEY);
  }

  /**
   * Save last active workspace ID to localStorage
   */
  private saveLastActiveWorkspaceId(workspaceId: string): void {
    localStorage.setItem(this.ACTIVE_WORKSPACE_KEY, workspaceId);
  }

  /**
   * Clear last active workspace from localStorage
   */
  private clearLastActiveWorkspaceId(): void {
    localStorage.removeItem(this.ACTIVE_WORKSPACE_KEY);
  }

  /**
   * Delete workspace (owner only)
   * Deletes workspace and ALL associated data (ideas, connections, components, projects)
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

    // Delete all local data associated with this workspace
    await this.db.ideas.where('workspaceId').equals(workspaceId).delete();
    await this.db.connections.where('workspaceId').equals(workspaceId).delete();
    await this.db.components.where('workspaceId').equals(workspaceId).delete();
    await this.db.projects.where('workspaceId').equals(workspaceId).delete();
    
    // Delete workspace from local Dexie
    await this.db.workspaces.delete(workspaceId);

    // Delete from Firebase (cascades to all nested data)
    const workspaceRef = ref(this.firebaseService.database, `workspaces/${workspaceId}`);
    await remove(workspaceRef);
    
    // Remove from user's workspace list
    const userWorkspaceRef = ref(this.firebaseService.database, `users/${userId}/workspaces/${workspaceId}`);
    await remove(userWorkspaceRef);

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
   * Get idea count for a workspace
   */
  async getWorkspaceIdeaCount(workspaceId: string): Promise<number> {
    return await this.db.ideas.where('workspaceId').equals(workspaceId).count();
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

  /**
   * Share workspace with collaborator by email
   */
  async shareWorkspace(workspaceId: string, email: string): Promise<void> {
    const workspace = await this.db.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const userId = this.authService.currentUser()?.uid;
    if (workspace.ownerId !== userId) {
      throw new Error('Only workspace owner can share');
    }

    // Look up user by email in Firebase
    const usersRef = ref(this.firebaseService.database, 'users');
    const userQuery = query(usersRef, orderByChild('email'), equalTo(email));
    const snapshot = await get(userQuery);

    if (!snapshot.exists()) {
      throw new Error('User not found');
    }

    // Get the user ID from the snapshot
    const userData = snapshot.val();
    const collaboratorId = Object.keys(userData)[0];

    // Add member to workspace
    if (!workspace.members) {
      workspace.members = {};
    }
    workspace.members[collaboratorId] = 'editor';
    workspace.updatedAt = new Date();

    // Update local Dexie
    await this.db.workspaces.put(workspace);

    // Update Firebase workspace
    const memberRef = ref(this.firebaseService.database, `workspaces/${workspaceId}/members/${collaboratorId}`);
    await set(memberRef, 'editor');

    // Update user's workspace list in Firebase
    const userWorkspaceRef = ref(this.firebaseService.database, `users/${collaboratorId}/workspaces/${workspaceId}`);
    await set(userWorkspaceRef, true);
  }

  /**
   * Share workspace with collaborator by user ID
   */
  async shareWorkspaceWithUser(workspaceId: string, collaboratorId: string): Promise<void> {
    const workspace = await this.db.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const userId = this.authService.currentUser()?.uid;
    if (workspace.ownerId !== userId) {
      throw new Error('Only workspace owner can share');
    }

    // Check if user exists
    const userProfileRef = ref(this.firebaseService.database, `users/${collaboratorId}/profile`);
    const snapshot = await get(userProfileRef);
    
    if (!snapshot.exists()) {
      throw new Error('User not found');
    }

    // Add member to workspace
    if (!workspace.members) {
      workspace.members = {};
    }
    workspace.members[collaboratorId] = 'editor';
    workspace.updatedAt = new Date();

    // Update local Dexie
    await this.db.workspaces.put(workspace);

    // Update Firebase workspace
    const memberRef = ref(this.firebaseService.database, `workspaces/${workspaceId}/members/${collaboratorId}`);
    await set(memberRef, 'editor');

    // Update user's workspace list in Firebase
    const userWorkspaceRef = ref(this.firebaseService.database, `users/${collaboratorId}/workspaces/${workspaceId}`);
    await set(userWorkspaceRef, true);
  }

  /**
   * Remove collaborator from workspace
   */
  async removeCollaborator(workspaceId: string, collaboratorId: string): Promise<void> {
    const workspace = await this.db.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const userId = this.authService.currentUser()?.uid;
    if (workspace.ownerId !== userId) {
      throw new Error('Only workspace owner can remove collaborators');
    }

    if (collaboratorId === workspace.ownerId) {
      throw new Error('Cannot remove workspace owner');
    }

    // Remove from workspace.members
    if (workspace.members && workspace.members[collaboratorId]) {
      delete workspace.members[collaboratorId];
    }
    workspace.updatedAt = new Date();

    // Update local Dexie
    await this.db.workspaces.put(workspace);

    // Update Firebase workspace
    const memberRef = ref(this.firebaseService.database, `workspaces/${workspaceId}/members/${collaboratorId}`);
    await remove(memberRef);

    // Remove workspace from user's list in Firebase
    const userWorkspaceRef = ref(this.firebaseService.database, `users/${collaboratorId}/workspaces/${workspaceId}`);
    await remove(userWorkspaceRef);
  }

  /**
   * Leave a shared workspace (collaborator only)
   */
  async leaveWorkspace(workspaceId: string): Promise<void> {
    const workspace = await this.db.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error('Workspace not found');
    }

    const userId = this.authService.currentUser()?.uid;
    if (!userId) {
      throw new Error('Must be authenticated');
    }

    if (workspace.ownerId === userId) {
      throw new Error('Workspace owner cannot leave, use delete instead');
    }

    // Remove from local Dexie
    await this.db.workspaces.delete(workspaceId);

    // Update Firebase to remove member
    const memberRef = ref(this.firebaseService.database, `workspaces/${workspaceId}/members/${userId}`);
    await remove(memberRef);

    // Remove workspace from user's list in Firebase
    const userWorkspaceRef = ref(this.firebaseService.database, `users/${userId}/workspaces/${workspaceId}`);
    await remove(userWorkspaceRef);

    // Reload workspaces
    await this.loadWorkspaces();
  }
}
