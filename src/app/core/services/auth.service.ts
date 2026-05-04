import { Injectable, signal, computed, inject } from '@angular/core';
import { 
  signInWithPopup, 
  GithubAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { ref, set, get } from 'firebase/database';
import { FirebaseService } from './firebase.service';
import { DatabaseService } from './database.service';
import { User, UserProfile } from '../models/user.model';
import { MergeStrategy } from '../models/sync.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private firebaseService = inject(FirebaseService);
  private db = inject(DatabaseService);

  // Private writable signals
  private currentUserSignal = signal<User | null>(null);
  private authStateSignal = signal<'anonymous' | 'authenticated' | 'loading'>('loading');

  // Public readonly signals
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly authState = this.authStateSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.authStateSignal() === 'authenticated');

  constructor() {
    this.initAuthListener();
  }

  /**
   * Listen for Firebase auth state changes
   */
  private initAuthListener(): void {
    onAuthStateChanged(this.firebaseService.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = this.mapFirebaseUser(firebaseUser);
        this.currentUserSignal.set(user);
        this.authStateSignal.set('authenticated');
        
        // Ensure user profile exists in Firebase
        await this.ensureUserProfile(user);
      } else {
        this.currentUserSignal.set(null);
        this.authStateSignal.set('anonymous');
      }
    });
  }

  /**
   * Map Firebase User to our User model
   */
  private mapFirebaseUser(firebaseUser: FirebaseUser): User {
    // Extract GitHub username from providerData
    const githubProvider = firebaseUser.providerData.find(
      p => p.providerId === 'github.com'
    );
    
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName,
      photoURL: firebaseUser.photoURL,
      githubUsername: githubProvider?.uid || null, // GitHub UID is the username
      createdAt: new Date(firebaseUser.metadata.creationTime!)
    };
  }

  /**
   * Sign in with GitHub
   */
  async signInWithGitHub(): Promise<void> {
    try {
      this.authStateSignal.set('loading');
      
      const provider = new GithubAuthProvider();
      provider.addScope('read:user');
      
      const result = await signInWithPopup(this.firebaseService.auth, provider);
      
      // User is set via onAuthStateChanged listener
      
      // Check if this is first-time sign in
      const isFirstTime = await this.isFirstTimeSignIn(result.user.uid);
      
      if (isFirstTime) {
        // Check for existing local data
        const localIdeas = await this.db.ideas.toArray();
        const hasLocalData = localIdeas.length > 0;
        
        if (hasLocalData) {
          // User will be prompted via MergeDialog in UI
          // Return to let UI handle merge strategy
          return;
        } else {
          // No local data, create default workspace
          await this.createDefaultWorkspace(result.user.uid);
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      this.authStateSignal.set('anonymous');
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(this.firebaseService.auth);
      // Auth state updated via listener
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Check if user profile exists in Firebase
   */
  private async isFirstTimeSignIn(uid: string): Promise<boolean> {
    const userRef = ref(this.firebaseService.database, `users/${uid}/profile`);
    const snapshot = await get(userRef);
    return !snapshot.exists();
  }

  /**
   * Ensure user profile exists in Firebase
   */
  private async ensureUserProfile(user: User): Promise<void> {
    const userRef = ref(this.firebaseService.database, `users/${user.uid}/profile`);
    const snapshot = await get(userRef);
    
    if (!snapshot.exists()) {
      // Create profile
      await set(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        githubUsername: user.githubUsername,
        createdAt: user.createdAt.toISOString()
      });
    }
  }

  /**
   * Create default "Personal" workspace
   */
  async createDefaultWorkspace(userId: string): Promise<string> {
    const workspaceId = uuidv4();
    
    // Create workspace in Firebase
    const workspaceRef = ref(
      this.firebaseService.database, 
      `workspaces/${workspaceId}/metadata`
    );
    
    await set(workspaceRef, {
      name: 'Personal',
      ownerId: userId,
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    // Add user as owner
    const memberRef = ref(
      this.firebaseService.database,
      `workspaces/${workspaceId}/members/${userId}`
    );
    
    await set(memberRef, 'owner');
    
    // Add workspace to user's list
    const userWorkspaceRef = ref(
      this.firebaseService.database,
      `users/${userId}/workspaces/${workspaceId}`
    );
    
    await set(userWorkspaceRef, true);
    
    // Create workspace in local Dexie
    await this.db.workspaces.add({
      id: workspaceId,
      name: 'Personal',
      ownerId: userId,
      isDefault: true,
      role: 'owner',
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return workspaceId;
  }

  /**
   * Handle first-time sign in with local data
   * Called by MergeDialog after user selects strategy
   */
  async handleMergeStrategy(strategy: MergeStrategy): Promise<void> {
    const user = this.currentUserSignal();
    if (!user) throw new Error('No authenticated user');
    
    const workspaceId = await this.createDefaultWorkspace(user.uid);
    
    switch (strategy) {
      case 'upload':
        // Migrate local ideas to user's workspace
        await this.migrateLocalIdeasToWorkspace(workspaceId, user.uid);
        break;
        
      case 'download':
        // Clear local ideas, download from cloud
        await this.clearLocalData();
        // SyncService will download from cloud
        break;
        
      case 'separate':
        // Archive local data, start fresh
        await this.archiveLocalData();
        break;
    }
  }

  /**
   * Migrate local ideas to user's workspace
   */
  private async migrateLocalIdeasToWorkspace(
    workspaceId: string, 
    userId: string
  ): Promise<void> {
    const localIdeas = await this.db.ideas
      .where('workspaceId')
      .equals('local-default')
      .toArray();
    
    for (const idea of localIdeas) {
      await this.db.ideas.update(idea.id, {
        workspaceId,
        createdBy: userId,
        lastModifiedBy: userId
      });
    }
    
    // Similar for connections, components, projects
    const localConnections = await this.db.connections
      .where('workspaceId')
      .equals('local-default')
      .toArray();
    
    for (const conn of localConnections) {
      await this.db.connections.update(conn.id, { workspaceId });
    }
  }

  /**
   * Clear local data (download strategy)
   */
  private async clearLocalData(): Promise<void> {
    await this.db.ideas.where('workspaceId').equals('local-default').delete();
    await this.db.connections.where('workspaceId').equals('local-default').delete();
    await this.db.components.where('workspaceId').equals('local-default').delete();
    await this.db.projects.where('workspaceId').equals('local-default').delete();
  }

  /**
   * Archive local data (separate strategy)
   */
  private async archiveLocalData(): Promise<void> {
    // For now, same as clear (could add export/backup in future)
    await this.clearLocalData();
  }
}
