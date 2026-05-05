import { Injectable, inject } from '@angular/core';
import { ref, get, set } from 'firebase/database';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';

/**
 * Firebase debugging utilities
 * Access via window.debugFirebase in browser console
 */
@Injectable({
  providedIn: 'root'
})
export class FirebaseDebugService {
  private firebaseService = inject(FirebaseService);
  private authService = inject(AuthService);
  private db = inject(DatabaseService);

  /**
   * Dump entire database structure (use with caution!)
   */
  async dumpDatabase(): Promise<any> {
    const rootRef = ref(this.firebaseService.database, '/');
    const snapshot = await get(rootRef);
    const data = snapshot.val();
    console.log('=== FIREBASE DATABASE DUMP ===');
    console.log(JSON.stringify(data, null, 2));
    return data;
  }

  /**
   * Get current user's workspaces from Firebase
   */
  async getUserWorkspaces(): Promise<any> {
    const userId = this.authService.currentUser()?.uid;
    if (!userId) {
      console.error('Not authenticated');
      return null;
    }

    console.log('=== USER WORKSPACES ===');
    console.log('User ID:', userId);

    // Get workspace IDs from user profile
    const userWorkspacesRef = ref(this.firebaseService.database, `users/${userId}/workspaces`);
    const workspaceIdsSnapshot = await get(userWorkspacesRef);
    
    console.log('Workspace IDs in user profile:', workspaceIdsSnapshot.exists() ? workspaceIdsSnapshot.val() : 'NONE');

    if (!workspaceIdsSnapshot.exists()) {
      console.warn('No workspaces found in user profile!');
      return null;
    }

    const workspaceIds = Object.keys(workspaceIdsSnapshot.val());
    console.log('Found workspace IDs:', workspaceIds);

    // Fetch each workspace
    const workspaces: any[] = [];
    for (const wsId of workspaceIds) {
      const wsRef = ref(this.firebaseService.database, `workspaces/${wsId}`);
      const wsSnapshot = await get(wsRef);
      
      if (wsSnapshot.exists()) {
        const wsData = wsSnapshot.val();
        workspaces.push({
          id: wsId,
          ...wsData
        });
        console.log(`Workspace ${wsId}:`, wsData);
      } else {
        console.warn(`Workspace ${wsId} NOT FOUND in Firebase!`);
      }
    }

    return workspaces;
  }

  /**
   * Get user profile from Firebase
   */
  async getUserProfile(): Promise<any> {
    const userId = this.authService.currentUser()?.uid;
    if (!userId) {
      console.error('Not authenticated');
      return null;
    }

    console.log('=== USER PROFILE ===');
    console.log('User ID:', userId);

    const userRef = ref(this.firebaseService.database, `users/${userId}`);
    const snapshot = await get(userRef);
    const data = snapshot.val();
    
    console.log('User data:', JSON.stringify(data, null, 2));
    return data;
  }

  /**
   * Get all workspaces in database (admin view)
   */
  async getAllWorkspaces(): Promise<any> {
    console.log('=== ALL WORKSPACES ===');
    
    const workspacesRef = ref(this.firebaseService.database, 'workspaces');
    const snapshot = await get(workspacesRef);
    const data = snapshot.val();
    
    if (!data) {
      console.warn('No workspaces in database!');
      return null;
    }

    console.log('Total workspaces:', Object.keys(data).length);
    console.log('Workspaces:', JSON.stringify(data, null, 2));
    return data;
  }

  /**
   * Get ideas for a specific workspace
   */
  async getWorkspaceIdeas(workspaceId: string): Promise<any> {
    console.log(`=== IDEAS FOR WORKSPACE ${workspaceId} ===`);
    
    const ideasRef = ref(this.firebaseService.database, `ideas/${workspaceId}`);
    const snapshot = await get(ideasRef);
    const data = snapshot.val();
    
    if (!data) {
      console.log('No ideas in this workspace');
      return null;
    }

    console.log('Total ideas:', Object.keys(data).length);
    console.log('Ideas:', JSON.stringify(data, null, 2));
    return data;
  }

  /**
   * Check database connectivity
   */
  async checkConnectivity(): Promise<boolean> {
    try {
      const testRef = ref(this.firebaseService.database, '.info/connected');
      const snapshot = await get(testRef);
      const isConnected = snapshot.val();
      
      console.log('=== FIREBASE CONNECTIVITY ===');
      console.log('Connected:', isConnected);
      console.log('Database URL:', this.firebaseService.database.app.options.databaseURL);
      
      return isConnected;
    } catch (error) {
      console.error('Connectivity check failed:', error);
      return false;
    }
  }

  /**
   * Complete diagnostic report
   */
  async diagnostics(): Promise<void> {
    console.clear();
    console.log('🔍 FIREBASE DIAGNOSTICS REPORT');
    console.log('================================\n');

    // 1. Auth status
    const user = this.authService.currentUser();
    console.log('1. Authentication:');
    console.log('   Authenticated:', this.authService.isAuthenticated());
    console.log('   User ID:', user?.uid || 'N/A');
    console.log('   Email:', user?.email || 'N/A');
    console.log('   Display Name:', user?.displayName || 'N/A\n');

    // 2. Connectivity
    console.log('2. Database Connectivity:');
    await this.checkConnectivity();
    console.log('');

    // 3. User data
    if (user?.uid) {
      console.log('3. User Profile Data:');
      await this.getUserProfile();
      console.log('');

      console.log('4. User Workspaces:');
      await this.getUserWorkspaces();
      console.log('');
    }

    // 5. All workspaces
    console.log('5. All Workspaces in Database:');
    await this.getAllWorkspaces();
    console.log('');

    // 6. Ideas comparison
    console.log('6. Ideas Comparison (Local vs Firebase):');
    await this.compareIdeas();
    console.log('');

    console.log('================================');
    console.log('✅ Diagnostics complete!\n');
  }

  /**
   * Compare local IndexedDB ideas with Firebase ideas
   */
  async compareIdeas(): Promise<void> {
    try {
      // Get active workspace - need to access through a hacky way since we can't inject WorkspaceService
      const localIdeas = await this.db.ideas.toArray();
      console.log('   Total local ideas:', localIdeas.length);

      // Group by workspace
      const byWorkspace = new Map<string, any[]>();
      localIdeas.forEach(idea => {
        const wsId = idea.workspaceId || 'unknown';
        if (!byWorkspace.has(wsId)) {
          byWorkspace.set(wsId, []);
        }
        byWorkspace.get(wsId)!.push(idea);
      });

      console.log('   Ideas by workspace:');
      for (const [wsId, ideas] of byWorkspace.entries()) {
        console.log(`     ${wsId}: ${ideas.length} idea(s)`);
      }

      // Check Firebase for each workspace
      console.log('\n   Firebase ideas by workspace:');
      const ideasRef = ref(this.firebaseService.database, 'ideas');
      const snapshot = await get(ideasRef);
      
      if (snapshot.exists()) {
        const firebaseIdeas = snapshot.val();
        const workspaceIds = Object.keys(firebaseIdeas);
        
        for (const wsId of workspaceIds) {
          const ideas = firebaseIdeas[wsId];
          const count = Object.keys(ideas).length;
          console.log(`     ${wsId}: ${count} idea(s)`);
          
          const localCount = byWorkspace.get(wsId)?.length || 0;
          if (localCount !== count) {
            console.warn(`     ⚠️ MISMATCH for ${wsId}: Local=${localCount}, Firebase=${count}`);
          }
        }
      } else {
        console.log('     No ideas in Firebase');
      }
    } catch (error) {
      console.error('   Failed to compare ideas:', error);
    }
  }

  /**
   * Force pull all ideas from Firebase to local IndexedDB
   */
  async syncIdeasFromFirebase(workspaceId?: string): Promise<void> {
    console.log('📥 SYNCING IDEAS FROM FIREBASE');
    console.log('==============================\n');

    try {
      if (!workspaceId) {
        // Sync all workspaces
        const ideasRef = ref(this.firebaseService.database, 'ideas');
        const snapshot = await get(ideasRef);

        if (!snapshot.exists()) {
          console.log('No ideas found in Firebase');
          return;
        }

        const allIdeas = snapshot.val();
        const workspaceIds = Object.keys(allIdeas);
        console.log(`Found ideas in ${workspaceIds.length} workspace(s)`);

        let totalSynced = 0;
        for (const wsId of workspaceIds) {
          const ideas = allIdeas[wsId];
          console.log(`\nWorkspace: ${wsId}`);
          
          for (const ideaId of Object.keys(ideas)) {
            const idea = ideas[ideaId];
            console.log(`  Syncing: ${idea.title}`);
            await this.db.ideas.put(idea);
            totalSynced++;
          }
        }

        console.log('\n==============================');
        console.log(`✅ Synced ${totalSynced} idea(s) from ${workspaceIds.length} workspace(s)\n`);
      } else {
        // Sync specific workspace
        const firebaseIdeasRef = ref(this.firebaseService.database, `ideas/${workspaceId}`);
        const snapshot = await get(firebaseIdeasRef);

        if (!snapshot.exists()) {
          console.log(`No ideas found in Firebase for workspace ${workspaceId}`);
          return;
        }

        const firebaseIdeas = snapshot.val();
        const ideaIds = Object.keys(firebaseIdeas);
        console.log(`Found ${ideaIds.length} idea(s) in Firebase`);

        for (const ideaId of ideaIds) {
          const idea = firebaseIdeas[ideaId];
          console.log(`  Syncing: ${idea.title} (${ideaId})`);
          await this.db.ideas.put(idea);
        }

        console.log('\n==============================');
        console.log(`✅ Synced ${ideaIds.length} idea(s)\n`);
      }

      console.log('Reloading page to display ideas...');
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      console.error('Sync failed:', error);
    }
  }

  /**
   * Migrate workspaces from old structure to new structure
   * OLD: /users/{userId}/workspaces/{workspaceId}/metadata/...
   * NEW: /workspaces/{workspaceId}/... + /users/{userId}/workspaces/{workspaceId}: true
   */
  async migrateWorkspaces(): Promise<void> {
    const userId = this.authService.currentUser()?.uid;
    if (!userId) {
      console.error('Not authenticated');
      return;
    }

    console.log('🔄 WORKSPACE MIGRATION');
    console.log('======================\n');

    try {
      // Get workspaces from old location
      const userWorkspacesRef = ref(this.firebaseService.database, `users/${userId}/workspaces`);
      const snapshot = await get(userWorkspacesRef);

      if (!snapshot.exists()) {
        console.log('No workspaces found in users/{userId}/workspaces');
        console.log('Checking database structure...\n');
        
        // Debug: show what's actually there
        const userRef = ref(this.firebaseService.database, `users/${userId}`);
        const userSnapshot = await get(userRef);
        console.log('User data structure:', JSON.stringify(userSnapshot.val(), null, 2));
        return;
      }

      const workspacesData = snapshot.val();
      console.log('Raw workspaces data:', JSON.stringify(workspacesData, null, 2));
      
      const workspaceIds = Object.keys(workspacesData);
      console.log(`\nFound ${workspaceIds.length} workspace(s) to check:`, workspaceIds);

      let migratedCount = 0;

      for (const wsId of workspaceIds) {
        const wsData = workspacesData[wsId];
        console.log(`\n--- Workspace: ${wsId} ---`);
        console.log('Current structure:', JSON.stringify(wsData, null, 2));

        // Check if this is old structure (has metadata or full object)
        if (wsData && typeof wsData === 'object' && wsData !== true) {
          // This is the old structure - full object or nested metadata
          const workspaceMetadata = wsData.metadata || wsData;
          
          console.log('  📦 Old structure detected');
          console.log('  Metadata:', workspaceMetadata);

          // Write to new location: /workspaces/{workspaceId}/
          const newWorkspaceRef = ref(this.firebaseService.database, `workspaces/${wsId}`);
          await set(newWorkspaceRef, workspaceMetadata);
          console.log('  ✅ Created at /workspaces/' + wsId);

          // Update user's workspace list to just be a reference
          const userWorkspaceRef = ref(this.firebaseService.database, `users/${userId}/workspaces/${wsId}`);
          await set(userWorkspaceRef, true);
          console.log('  ✅ Updated user reference to "true"');
          
          migratedCount++;

        } else if (wsData === true) {
          // Already migrated (just a reference)
          console.log('  ✓ Already migrated (reference only)');
          
          // Verify workspace exists at new location
          const newWorkspaceRef = ref(this.firebaseService.database, `workspaces/${wsId}`);
          const wsSnapshot = await get(newWorkspaceRef);
          if (!wsSnapshot.exists()) {
            console.warn('  ⚠️ Reference exists but workspace not found at /workspaces/' + wsId);
          } else {
            console.log('  ✓ Workspace exists at /workspaces/' + wsId);
          }
        } else {
          console.warn('  ⚠️ Unexpected structure:', wsData);
        }
      }

      console.log('\n======================');
      console.log(`✅ Migration complete! Migrated ${migratedCount} workspace(s)\n`);
      console.log('Reloading page to apply changes...');
      
      // Reload the page after migration
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      console.error('Migration failed:', error);
    }
  }

  /**
   * Search entire database for any workspace data
   */
  async searchForWorkspaces(): Promise<void> {
    console.log('🔍 SEARCHING FOR WORKSPACES');
    console.log('===========================\n');

    const userId = this.authService.currentUser()?.uid;
    console.log('Current User ID:', userId);
    console.log('');

    try {
      // 1. Check /workspaces/
      console.log('1. Checking /workspaces/ (correct location)');
      const workspacesRef = ref(this.firebaseService.database, 'workspaces');
      const workspacesSnapshot = await get(workspacesRef);
      if (workspacesSnapshot.exists()) {
        const data = workspacesSnapshot.val();
        console.log('   Found:', Object.keys(data).length, 'workspace(s)');
        console.log('   Data:', JSON.stringify(data, null, 2));
      } else {
        console.log('   ❌ No workspaces found at /workspaces/');
      }
      console.log('');

      // 2. Check /users/{userId}/workspaces/
      if (userId) {
        console.log('2. Checking /users/' + userId + '/workspaces/');
        const userWorkspacesRef = ref(this.firebaseService.database, `users/${userId}/workspaces`);
        const userWorkspacesSnapshot = await get(userWorkspacesRef);
        if (userWorkspacesSnapshot.exists()) {
          const data = userWorkspacesSnapshot.val();
          console.log('   Found:', Object.keys(data).length, 'workspace(s)');
          console.log('   Data:', JSON.stringify(data, null, 2));
        } else {
          console.log('   ❌ No workspaces found at /users/' + userId + '/workspaces/');
        }
        console.log('');
      }

      // 3. Check entire /users/ node for ANY workspace data
      console.log('3. Searching all users for workspace data...');
      const allUsersRef = ref(this.firebaseService.database, 'users');
      const allUsersSnapshot = await get(allUsersRef);
      if (allUsersSnapshot.exists()) {
        const usersData = allUsersSnapshot.val();
        const userIds = Object.keys(usersData);
        console.log('   Total users in database:', userIds.length);
        
        for (const uid of userIds) {
          const userData = usersData[uid];
          if (userData.workspaces) {
            console.log(`   \n   User ${uid}:`);
            console.log('   - Workspaces:', JSON.stringify(userData.workspaces, null, 2));
          }
        }
      }
      console.log('');

      // 4. Check entire database for workspace-related paths
      console.log('4. Full database structure:');
      const rootRef = ref(this.firebaseService.database, '/');
      const rootSnapshot = await get(rootRef);
      if (rootSnapshot.exists()) {
        const data = rootSnapshot.val();
        console.log('   Root keys:', Object.keys(data));
        console.log('   Full structure:', JSON.stringify(data, null, 2));
      }

      console.log('\n===========================');
      console.log('✅ Search complete!\n');

    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  /**
   * Manually create workspace at correct location
   */
  async createTestWorkspace(): Promise<void> {
    const userId = this.authService.currentUser()?.uid;
    if (!userId) {
      console.error('Not authenticated');
      return;
    }

    console.log('🏗️ CREATING TEST WORKSPACE');
    console.log('==========================\n');

    const workspaceId = '9482e845-d60b-4c8a-b8fd-666d0a8af232'; // Your existing workspace ID
    const now = new Date().toISOString();

    try {
      // Create workspace at correct location
      console.log('Creating workspace at /workspaces/' + workspaceId);
      const workspaceRef = ref(this.firebaseService.database, `workspaces/${workspaceId}`);
      await set(workspaceRef, {
        name: 'Personal',
        ownerId: userId,
        isDefault: true,
        members: {
          [userId]: 'owner'
        },
        createdAt: '2026-05-04T19:33:32.306Z',
        updatedAt: now
      });
      console.log('✅ Workspace created');

      // Add reference to user profile
      console.log('Adding reference at /users/' + userId + '/workspaces/' + workspaceId);
      const userWorkspaceRef = ref(this.firebaseService.database, `users/${userId}/workspaces/${workspaceId}`);
      await set(userWorkspaceRef, true);
      console.log('✅ User reference created');

      console.log('\n==========================');
      console.log('✅ Test workspace created!\n');
      console.log('Reloading page...');
      
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      console.error('Failed to create workspace:', error);
    }
  }

  /**
   * Clear all local IndexedDB data and restart fresh
   */
  async clearLocalData(): Promise<void> {
    console.log('🗑️ CLEARING LOCAL DATA');
    console.log('======================\n');

    try {
      console.log('Clearing workspaces from IndexedDB...');
      const workspaceCount = await this.db.workspaces.count();
      await this.db.workspaces.clear();
      console.log(`✅ Cleared ${workspaceCount} workspace(s)`);

      console.log('Clearing ideas from IndexedDB...');
      const ideaCount = await this.db.ideas.count();
      await this.db.ideas.clear();
      console.log(`✅ Cleared ${ideaCount} idea(s)`);

      console.log('Clearing connections from IndexedDB...');
      const connectionCount = await this.db.connections.count();
      await this.db.connections.clear();
      console.log(`✅ Cleared ${connectionCount} connection(s)`);

      console.log('Clearing components from IndexedDB...');
      const componentCount = await this.db.components.count();
      await this.db.components.clear();
      console.log(`✅ Cleared ${componentCount} component(s)`);

      console.log('Clearing projects from IndexedDB...');
      const projectCount = await this.db.projects.count();
      await this.db.projects.clear();
      console.log(`✅ Cleared ${projectCount} project(s)`);

      console.log('\n======================');
      console.log('✅ All local IndexedDB data cleared!\n');
      
      // Clear localStorage
      console.log('Clearing localStorage...');
      localStorage.clear();
      console.log('✅ localStorage cleared\n');
      
      console.log('⚠️ NOTE: This only cleared LOCAL data.');
      console.log('Firebase data is still intact.\n');
      console.log('Reloading page to start fresh...');
      
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      console.error('Failed to clear local data:', error);
    }
  }

  /**
   * Clear EVERYTHING - local IndexedDB AND Firebase data
   */
  async nukeEverything(): Promise<void> {
    const userId = this.authService.currentUser()?.uid;
    if (!userId) {
      console.error('Not authenticated');
      return;
    }

    console.log('💣 NUKING EVERYTHING (LOCAL + FIREBASE)');
    console.log('=========================================\n');
    console.warn('⚠️ WARNING: This will delete ALL your data!\n');

    try {
      // 1. Clear local IndexedDB
      console.log('1. Clearing local IndexedDB...');
      await this.clearLocalDataSilent();
      console.log('   ✅ Local data cleared\n');

      // 2. Delete Firebase user workspaces
      console.log('2. Deleting Firebase user workspaces...');
      const userWorkspacesRef = ref(this.firebaseService.database, `users/${userId}/workspaces`);
      await set(userWorkspacesRef, null);
      console.log('   ✅ User workspaces deleted\n');

      // 3. Delete all workspaces user owns from /workspaces/
      console.log('3. Finding and deleting owned workspaces...');
      const workspacesRef = ref(this.firebaseService.database, 'workspaces');
      const snapshot = await get(workspacesRef);
      if (snapshot.exists()) {
        const workspaces = snapshot.val();
        let deletedCount = 0;
        for (const wsId of Object.keys(workspaces)) {
          const ws = workspaces[wsId];
          if (ws.ownerId === userId) {
            const wsRef = ref(this.firebaseService.database, `workspaces/${wsId}`);
            await set(wsRef, null);
            console.log(`   Deleted workspace: ${wsId} (${ws.name})`);
            deletedCount++;
          }
        }
        console.log(`   ✅ Deleted ${deletedCount} workspace(s)\n`);
      }

      // 4. Delete all ideas in user's workspaces
      console.log('4. Deleting all ideas...');
      const ideasRef = ref(this.firebaseService.database, 'ideas');
      const ideasSnapshot = await get(ideasRef);
      if (ideasSnapshot.exists()) {
        const ideas = ideasSnapshot.val();
        for (const wsId of Object.keys(ideas)) {
          const ideasWsRef = ref(this.firebaseService.database, `ideas/${wsId}`);
          await set(ideasWsRef, null);
        }
        console.log('   ✅ All ideas deleted\n');
      }

      console.log('=========================================');
      console.log('✅ NUKE COMPLETE! Everything deleted.\n');
      console.log('Reloading page to start completely fresh...');
      
      setTimeout(() => window.location.reload(), 2000);

    } catch (error) {
      console.error('Nuke failed:', error);
    }
  }

  /**
   * Clear local data without logging (internal use)
   */
  private async clearLocalDataSilent(): Promise<void> {
    await this.db.workspaces.clear();
    await this.db.ideas.clear();
    await this.db.connections.clear();
    await this.db.components.clear();
    await this.db.projects.clear();
    localStorage.clear();
  }

  /**
   * Migrate nested ideas from /workspaces/{id}/ideas/ to /ideas/{id}/
   */
  async migrateNestedIdeas(): Promise<void> {
    console.log('=== MIGRATING NESTED IDEAS TO FLAT STRUCTURE ===\n');
    
    try {
      // Get all workspaces
      const workspacesRef = ref(this.firebaseService.database, 'workspaces');
      const workspacesSnapshot = await get(workspacesRef);
      
      if (!workspacesSnapshot.exists()) {
        console.log('No workspaces found');
        return;
      }
      
      const workspaces = workspacesSnapshot.val();
      let totalMigrated = 0;
      
      for (const [workspaceId, workspace] of Object.entries(workspaces)) {
        const nestedIdeas = (workspace as any).ideas;
        
        if (!nestedIdeas) {
          console.log(`Workspace ${workspaceId}: No nested ideas`);
          continue;
        }
        
        const ideaIds = Object.keys(nestedIdeas);
        console.log(`\nWorkspace ${workspaceId}: Found ${ideaIds.length} nested ideas`);
        
        for (const [ideaId, ideaData] of Object.entries(nestedIdeas)) {
          // Write to flat structure
          const flatPath = `ideas/${workspaceId}/${ideaId}`;
          await set(ref(this.firebaseService.database, flatPath), ideaData);
          console.log(`  ✓ Migrated ${ideaId} to ${flatPath}`);
          
          // Remove from nested structure
          const nestedPath = `workspaces/${workspaceId}/ideas/${ideaId}`;
          await set(ref(this.firebaseService.database, nestedPath), null);
          
          totalMigrated++;
        }
      }
      
      console.log(`\n✅ Migration complete! Migrated ${totalMigrated} ideas`);
      console.log('Reloading page...');
      
      setTimeout(() => window.location.reload(), 1000);
      
    } catch (error) {
      console.error('Migration failed:', error);
    }
  }
}

