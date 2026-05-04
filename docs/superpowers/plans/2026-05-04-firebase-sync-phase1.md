# Firebase Sync Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable single-user cross-device sync with GitHub OAuth authentication, real-time bidirectional sync, offline queue management, and intelligent conflict resolution.

**Architecture:** Hybrid local-first architecture where IndexedDB (Dexie) remains the UI's source of truth, with Firebase Realtime Database providing cloud sync. SyncService manages a queue with 3-second batching for outbound changes, and Firebase listeners handle inbound real-time updates. AuthService manages GitHub OAuth via Firebase Auth.

**Tech Stack:** Angular 17, Firebase SDK v10, @angular/fire v17, Dexie v4, TypeScript

---

## File Structure

### New Files to Create

**Services:**
- `src/app/core/services/firebase.service.ts` - Firebase SDK wrapper
- `src/app/core/services/auth.service.ts` - GitHub OAuth management
- `src/app/core/services/sync.service.ts` - Queue, batching, conflict resolution

**Components:**
- `src/app/shared/components/auth/sign-in-button/sign-in-button.component.ts`
- `src/app/shared/components/auth/sign-in-button/sign-in-button.component.html`
- `src/app/shared/components/auth/sign-in-button/sign-in-button.component.scss`
- `src/app/shared/components/auth/sync-status/sync-status.component.ts`
- `src/app/shared/components/auth/sync-status/sync-status.component.html`
- `src/app/shared/components/auth/sync-status/sync-status.component.scss`
- `src/app/features/ideas/components/merge-dialog/merge-dialog.component.ts`
- `src/app/features/ideas/components/merge-dialog/merge-dialog.component.html`
- `src/app/features/ideas/components/merge-dialog/merge-dialog.component.scss`
- `src/app/features/ideas/components/conflict-dialog/conflict-dialog.component.ts`
- `src/app/features/ideas/components/conflict-dialog/conflict-dialog.component.html`
- `src/app/features/ideas/components/conflict-dialog/conflict-dialog.component.scss`

**Models:**
- `src/app/core/models/user.model.ts` - User profile
- `src/app/core/models/workspace.model.ts` - Workspace entity
- `src/app/core/models/sync.model.ts` - Sync types (Change, SyncStatus, etc.)

**Configuration:**
- `src/environments/environment.firebase.ts` - Firebase config (gitignored)

**Tests:**
- `src/app/core/services/firebase.service.spec.ts`
- `src/app/core/services/auth.service.spec.ts`
- `src/app/core/services/sync.service.spec.ts`
- `src/app/shared/components/auth/sign-in-button/sign-in-button.component.spec.ts`
- `src/app/shared/components/auth/sync-status/sync-status.component.spec.ts`
- `src/app/features/ideas/components/merge-dialog/merge-dialog.component.spec.ts`
- `src/app/features/ideas/components/conflict-dialog/conflict-dialog.component.spec.ts`

### Files to Modify

- `src/app/core/services/database.service.ts` - Add Dexie schema v4 (workspace fields)
- `src/app/core/services/idea.service.ts` - Hook sync after CRUD operations
- `src/app/core/models/idea.model.ts` - Add workspaceId, version, createdBy, lastModifiedBy
- `src/app/shared/components/layout/toolbar/toolbar.component.ts` - Add auth UI
- `src/app/shared/components/layout/toolbar/toolbar.component.html` - Add sign-in button and sync status
- `src/environments/environment.ts` - Import Firebase config
- `src/environments/environment.prod.ts` - Import Firebase config
- `package.json` - Add Firebase dependencies
- `.gitignore` - Ignore Firebase config file

---

## Task 1: Install Dependencies & Firebase Config

**Files:**
- Modify: `package.json`
- Create: `src/environments/environment.firebase.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Install Firebase dependencies**

```bash
npm install firebase@^10.0.0 @angular/fire@^17.0.0
```

Expected: Dependencies installed successfully

- [ ] **Step 2: Create Firebase config file (placeholder)**

Create `src/environments/environment.firebase.ts`:

```typescript
// src/environments/environment.firebase.ts
// TODO: Replace with actual Firebase config from Firebase Console
// Instructions: https://console.firebase.google.com → Project Settings → General → Your apps → Web app
export const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  databaseURL: "REPLACE_WITH_YOUR_DATABASE_URL",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};
```

- [ ] **Step 3: Update environment files**

Modify `src/environments/environment.ts`:

```typescript
import { firebaseConfig } from './environment.firebase';

export const environment = {
  production: false,
  firebase: firebaseConfig
};
```

Modify `src/environments/environment.prod.ts`:

```typescript
import { firebaseConfig } from './environment.firebase';

export const environment = {
  production: true,
  firebase: firebaseConfig
};
```

- [ ] **Step 4: Add Firebase config to .gitignore**

Append to `.gitignore`:

```
# Firebase config (contains API keys)
src/environments/environment.firebase.ts
```

- [ ] **Step 5: Verify build still works**

```bash
npm run build
```

Expected: Build succeeds (using placeholder Firebase config)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/environments/environment.ts src/environments/environment.prod.ts .gitignore
git commit -m "chore: add Firebase dependencies and config structure"
```

---

## Task 2: Create Data Models

**Files:**
- Create: `src/app/core/models/user.model.ts`
- Create: `src/app/core/models/workspace.model.ts`
- Create: `src/app/core/models/sync.model.ts`
- Modify: `src/app/core/models/idea.model.ts`

- [ ] **Step 1: Create User model**

Create `src/app/core/models/user.model.ts`:

```typescript
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  githubUsername: string | null;
  createdAt: Date;
}

export interface UserProfile extends User {
  workspaces: string[]; // Array of workspace IDs
}
```

- [ ] **Step 2: Create Workspace model**

Create `src/app/core/models/workspace.model.ts`:

```typescript
export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  isDefault: boolean;
  role: 'owner' | 'editor';
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMetadata {
  name: string;
  ownerId: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkspaceMembers {
  [userId: string]: 'owner' | 'editor';
}
```

- [ ] **Step 3: Create Sync models**

Create `src/app/core/models/sync.model.ts`:

```typescript
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export type ChangeType = 'create' | 'update' | 'delete';

export type EntityType = 'idea' | 'connection' | 'component' | 'project';

export interface Change {
  type: ChangeType;
  entity: EntityType;
  id: string;
  data: any;
  timestamp: Date;
  workspaceId: string;
}

export interface ConflictResolution {
  type: 'auto' | 'manual';
  field: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: Date;
  remoteTimestamp: Date;
  resolution?: any;
}

export type MergeStrategy = 'upload' | 'download' | 'separate';
```

- [ ] **Step 4: Update Idea model**

Modify `src/app/core/models/idea.model.ts` - add new fields:

```typescript
export interface Idea {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  status: IdeaStatus;
  priority: IdeaPriority;
  component?: string;
  project?: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  // NEW FIELDS FOR SYNC
  workspaceId: string;
  version: number;
  createdBy: string;
  lastModifiedBy: string;
}

export interface CreateIdeaData {
  title: string;
  description: string;
  keywords: string[];
  status: IdeaStatus;
  priority: IdeaPriority;
  component?: string;
  project?: string;
  color?: string;
  // NEW FIELDS FOR SYNC
  workspaceId?: string; // Optional - will use active workspace if not provided
}

export interface UpdateIdeaData {
  title?: string;
  description?: string;
  keywords?: string[];
  status?: IdeaStatus;
  priority?: IdeaPriority;
  component?: string;
  project?: string;
  color?: string;
  // version incremented automatically by service
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build
```

Expected: No TypeScript errors (services will need updates next)

- [ ] **Step 6: Commit**

```bash
git add src/app/core/models/
git commit -m "feat: add User, Workspace, and Sync models for Firebase integration"
```

---

## Task 3: Update Dexie Schema to v4

**Files:**
- Modify: `src/app/core/services/database.service.ts`
- Test: `src/app/core/services/database.service.spec.ts`

- [ ] **Step 1: Write test for Dexie v4 schema**

Modify `src/app/core/services/database.service.spec.ts` - add test:

```typescript
it('should have workspaces table in schema v4', async () => {
  const db = TestBed.inject(DatabaseService);
  
  expect(db.workspaces).toBeDefined();
  
  // Test workspace CRUD
  const workspace: SystemWorkspace = {
    id: 'ws-1',
    name: 'Personal',
    ownerId: 'user-1',
    isDefault: true,
    role: 'owner',
    syncStatus: 'synced',
    lastSyncedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  await db.workspaces.add(workspace);
  const retrieved = await db.workspaces.get('ws-1');
  
  expect(retrieved).toEqual(workspace);
});

it('should have workspaceId field on ideas in v4', async () => {
  const db = TestBed.inject(DatabaseService);
  
  const idea: Idea = {
    id: 'idea-1',
    title: 'Test',
    description: 'Test',
    keywords: [],
    status: 'backlog',
    priority: 'medium',
    color: '#000',
    createdAt: new Date(),
    updatedAt: new Date(),
    workspaceId: 'ws-1',
    version: 1,
    createdBy: 'user-1',
    lastModifiedBy: 'user-1'
  };
  
  await db.ideas.add(idea);
  const retrieved = await db.ideas.get('idea-1');
  
  expect(retrieved?.workspaceId).toBe('ws-1');
  expect(retrieved?.version).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --include='**/database.service.spec.ts'
```

Expected: FAIL - workspaces table undefined, workspaceId field missing

- [ ] **Step 3: Update Dexie schema to v4**

Modify `src/app/core/services/database.service.ts`:

```typescript
// Add interface for workspace storage
export interface SystemWorkspace {
  id: string;
  name: string;
  ownerId: string;
  isDefault: boolean;
  role: 'owner' | 'editor';
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService extends Dexie {
  ideas!: Table<Idea, string>;
  connections!: Table<Connection, string>;
  settings!: Table<Settings, string>;
  components!: Table<SystemComponent, string>;
  projects!: Table<Project, string>;
  workspaces!: Table<SystemWorkspace, string>; // NEW

  constructor() {
    super('MindDumpDB');
    
    // Version 1: Original schema
    this.version(1).stores({
      ideas: 'id, status, *keywords, createdAt',
      connections: 'id, sourceId, targetId',
      settings: 'id'
    });

    // Version 2: Add component field to ideas and components table
    this.version(2).stores({
      ideas: 'id, status, component, *keywords, createdAt',
      connections: 'id, sourceId, targetId',
      settings: 'id',
      components: 'id, name, createdAt'
    });

    // Version 3: Add project field to ideas and projects table
    this.version(3).stores({
      ideas: 'id, status, component, project, *keywords, createdAt',
      connections: 'id, sourceId, targetId',
      settings: 'id',
      components: 'id, name, createdAt',
      projects: 'id, name, createdAt'
    });

    // Version 4: Add workspace support and sync fields
    this.version(4).stores({
      ideas: 'id, status, component, project, workspaceId, *keywords, createdAt',
      connections: 'id, sourceId, targetId, workspaceId',
      settings: 'id',
      components: 'id, name, workspaceId, createdAt',
      projects: 'id, name, workspaceId, createdAt',
      workspaces: 'id, ownerId, isDefault, createdAt'
    }).upgrade(async (trans) => {
      // Migration: Add default values to existing records
      const ideas = await trans.table('ideas').toArray();
      const connections = await trans.table('connections').toArray();
      const components = await trans.table('components').toArray();
      const projects = await trans.table('projects').toArray();
      
      const defaultWorkspaceId = 'local-default';
      const defaultUserId = 'local-user';
      
      // Update ideas
      for (const idea of ideas) {
        await trans.table('ideas').update(idea.id, {
          workspaceId: defaultWorkspaceId,
          version: 1,
          createdBy: defaultUserId,
          lastModifiedBy: defaultUserId
        });
      }
      
      // Update connections
      for (const conn of connections) {
        await trans.table('connections').update(conn.id, {
          workspaceId: defaultWorkspaceId
        });
      }
      
      // Update components
      for (const comp of components) {
        await trans.table('components').update(comp.id, {
          workspaceId: defaultWorkspaceId
        });
      }
      
      // Update projects
      for (const proj of projects) {
        await trans.table('projects').update(proj.id, {
          workspaceId: defaultWorkspaceId
        });
      }
      
      // Create default local workspace
      await trans.table('workspaces').add({
        id: defaultWorkspaceId,
        name: 'Local (Not Synced)',
        ownerId: defaultUserId,
        isDefault: true,
        role: 'owner',
        syncStatus: 'synced',
        lastSyncedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --include='**/database.service.spec.ts'
```

Expected: PASS - All database tests pass

- [ ] **Step 5: Test migration manually**

```bash
# Start dev server
npm start

# Open browser console
# Check: await db.workspaces.toArray()
# Should show default workspace created
```

- [ ] **Step 6: Commit**

```bash
git add src/app/core/services/database.service.ts src/app/core/services/database.service.spec.ts
git commit -m "feat: upgrade Dexie schema to v4 with workspace support and sync fields"
```

---

## Task 4: Create FirebaseService

**Files:**
- Create: `src/app/core/services/firebase.service.ts`
- Create: `src/app/core/services/firebase.service.spec.ts`

- [ ] **Step 1: Write test for FirebaseService initialization**

Create `src/app/core/services/firebase.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { FirebaseService } from './firebase.service';

describe('FirebaseService', () => {
  let service: FirebaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have auth instance', () => {
    expect(service.auth).toBeDefined();
  });

  it('should have database instance', () => {
    expect(service.database).toBeDefined();
  });

  it('should expose connected signal', () => {
    expect(service.isConnected()).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --include='**/firebase.service.spec.ts'
```

Expected: FAIL - FirebaseService not found

- [ ] **Step 3: Implement FirebaseService**

Create `src/app/core/services/firebase.service.ts`:

```typescript
import { Injectable, signal } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getDatabase, Database, ref, onValue, off, connectDatabaseEmulator } from 'firebase/database';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp;
  public auth: Auth;
  public database: Database;
  
  private isConnectedSignal = signal<boolean>(false);
  readonly isConnected = this.isConnectedSignal.asReadonly();

  constructor() {
    // Initialize Firebase
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.database = getDatabase(this.app);
    
    // Connect to emulators in development (if available)
    if (!environment.production) {
      try {
        connectAuthEmulator(this.auth, 'http://localhost:9099', { disableWarnings: true });
        connectDatabaseEmulator(this.database, 'localhost', 9000);
      } catch (e) {
        // Emulators not running, use production Firebase
        console.log('Firebase emulators not available, using production');
      }
    }
    
    // Monitor connection status
    this.monitorConnection();
  }

  private monitorConnection(): void {
    const connectedRef = ref(this.database, '.info/connected');
    onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val() === true;
      this.isConnectedSignal.set(connected);
    });
  }

  /**
   * Clean up listeners on service destroy
   */
  ngOnDestroy(): void {
    const connectedRef = ref(this.database, '.info/connected');
    off(connectedRef);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --include='**/firebase.service.spec.ts'
```

Expected: PASS - All FirebaseService tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/firebase.service.ts src/app/core/services/firebase.service.spec.ts
git commit -m "feat: add FirebaseService wrapper for Firebase SDK"
```

---

## Task 5: Create AuthService

**Files:**
- Create: `src/app/core/services/auth.service.ts`
- Create: `src/app/core/services/auth.service.spec.ts`

- [ ] **Step 1: Write test for AuthService**

Create `src/app/core/services/auth.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { DatabaseService } from './database.service';

describe('AuthService', () => {
  let service: AuthService;
  let firebaseService: jasmine.SpyObj<FirebaseService>;
  let databaseService: jasmine.SpyObj<DatabaseService>;

  beforeEach(() => {
    const firebaseSpy = jasmine.createSpyObj('FirebaseService', ['auth', 'database']);
    const dbSpy = jasmine.createSpyObj('DatabaseService', ['workspaces', 'ideas']);

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: FirebaseService, useValue: firebaseSpy },
        { provide: DatabaseService, useValue: dbSpy }
      ]
    });
    
    service = TestBed.inject(AuthService);
    firebaseService = TestBed.inject(FirebaseService) as jasmine.SpyObj<FirebaseService>;
    databaseService = TestBed.inject(DatabaseService) as jasmine.SpyObj<DatabaseService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose currentUser signal', () => {
    expect(service.currentUser()).toBeNull();
  });

  it('should expose authState signal', () => {
    expect(service.authState()).toBe('anonymous');
  });

  it('should expose isAuthenticated computed signal', () => {
    expect(service.isAuthenticated()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --include='**/auth.service.spec.ts'
```

Expected: FAIL - AuthService not found

- [ ] **Step 3: Implement AuthService**

Create `src/app/core/services/auth.service.ts`:

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --include='**/auth.service.spec.ts'
```

Expected: PASS - All AuthService tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/auth.service.ts src/app/core/services/auth.service.spec.ts
git commit -m "feat: add AuthService for GitHub OAuth and user management"
```

---

## Task 6: Create SyncService (Part 1: Queue & Batching)

**Files:**
- Create: `src/app/core/services/sync.service.ts`
- Create: `src/app/core/services/sync.service.spec.ts`

- [ ] **Step 1: Write test for queue and batching**

Create `src/app/core/services/sync.service.spec.ts`:

```typescript
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { SyncService } from './sync.service';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { DatabaseService } from './database.service';

describe('SyncService', () => {
  let service: SyncService;
  let authService: jasmine.SpyObj<AuthService>;
  let firebaseService: jasmine.SpyObj<FirebaseService>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['currentUser', 'isAuthenticated']);
    const firebaseSpy = jasmine.createSpyObj('FirebaseService', ['database']);

    TestBed.configureTestingModule({
      providers: [
        SyncService,
        { provide: AuthService, useValue: authSpy },
        { provide: FirebaseService, useValue: firebaseSpy }
      ]
    });
    
    service = TestBed.inject(SyncService);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    firebaseService = TestBed.inject(FirebaseService) as jasmine.SpyObj<FirebaseService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should queue a change', () => {
    const change = {
      type: 'create' as const,
      entity: 'idea' as const,
      id: 'idea-1',
      data: { title: 'Test' },
      timestamp: new Date(),
      workspaceId: 'ws-1'
    };
    
    service.queueChange(change);
    
    expect(service.pendingCount()).toBe(1);
  });

  it('should batch changes after 3 seconds', fakeAsync(() => {
    spyOn(service as any, 'flushBatch');
    
    service.queueChange({
      type: 'create',
      entity: 'idea',
      id: 'idea-1',
      data: {},
      timestamp: new Date(),
      workspaceId: 'ws-1'
    });
    
    expect((service as any).flushBatch).not.toHaveBeenCalled();
    
    tick(3000);
    
    expect((service as any).flushBatch).toHaveBeenCalled();
  }));

  it('should reset batch timer on new change', fakeAsync(() => {
    spyOn(service as any, 'flushBatch');
    
    service.queueChange({
      type: 'create',
      entity: 'idea',
      id: 'idea-1',
      data: {},
      timestamp: new Date(),
      workspaceId: 'ws-1'
    });
    
    tick(2000);
    
    // Add another change before 3 seconds
    service.queueChange({
      type: 'update',
      entity: 'idea',
      id: 'idea-2',
      data: {},
      timestamp: new Date(),
      workspaceId: 'ws-1'
    });
    
    // Timer should reset
    tick(2000); // Total 4 seconds, but timer reset at 2s
    expect((service as any).flushBatch).not.toHaveBeenCalled();
    
    tick(1000); // Now 3 seconds since last change
    expect((service as any).flushBatch).toHaveBeenCalled();
  }));
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --include='**/sync.service.spec.ts'
```

Expected: FAIL - SyncService not found

- [ ] **Step 3: Implement SyncService (queue & batching only)**

Create `src/app/core/services/sync.service.ts`:

```typescript
import { Injectable, signal, inject } from '@angular/core';
import { ref, set, update, remove, onValue, off } from 'firebase/database';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { DatabaseService } from './database.service';
import { Change, SyncStatus } from '../models/sync.model';

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);
  private db = inject(DatabaseService);

  // Signals
  private syncStatusSignal = signal<SyncStatus>('idle');
  private pendingCountSignal = signal<number>(0);
  
  readonly syncStatus = this.syncStatusSignal.asReadonly();
  readonly pendingCount = this.pendingCountSignal.asReadonly();

  // Queue management
  private pendingChanges = new Map<string, Change>();
  private batchTimer: any = null;
  private readonly BATCH_DELAY = 3000; // 3 seconds

  /**
   * Queue a change for syncing
   */
  queueChange(change: Change): void {
    // Don't queue if not authenticated
    if (!this.authService.isAuthenticated()) {
      return;
    }

    // Add to queue (overwrites if same ID)
    const key = `${change.entity}-${change.id}`;
    this.pendingChanges.set(key, change);
    this.pendingCountSignal.set(this.pendingChanges.size);

    // Reset batch timer
    this.resetBatchTimer();
  }

  /**
   * Reset the batch timer
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
    if (this.pendingChanges.size === 0) {
      return;
    }

    const changes = Array.from(this.pendingChanges.values());
    this.syncStatusSignal.set('syncing');

    try {
      // Upload all changes
      for (const change of changes) {
        await this.uploadChange(change);
      }

      // Clear queue
      this.pendingChanges.clear();
      this.pendingCountSignal.set(0);
      this.syncStatusSignal.set('synced');

      // Auto-hide synced status after 3 seconds
      setTimeout(() => {
        if (this.syncStatusSignal() === 'synced') {
          this.syncStatusSignal.set('idle');
        }
      }, 3000);
    } catch (error) {
      console.error('Sync error:', error);
      this.syncStatusSignal.set('error');
      // Keep changes in queue for retry
    }
  }

  /**
   * Upload a single change to Firebase
   */
  private async uploadChange(change: Change): Promise<void> {
    const path = `workspaces/${change.workspaceId}/${change.entity}s/${change.id}`;
    const dbRef = ref(this.firebaseService.database, path);

    switch (change.type) {
      case 'create':
      case 'update':
        await set(dbRef, {
          ...change.data,
          updatedAt: change.timestamp.toISOString()
        });
        break;

      case 'delete':
        await remove(dbRef);
        break;
    }
  }

  /**
   * Start listening for remote changes
   */
  startListening(workspaceId: string): void {
    // Will implement in next task
  }

  /**
   * Stop listening for remote changes
   */
  stopListening(workspaceId: string): void {
    // Will implement in next task
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --include='**/sync.service.spec.ts'
```

Expected: PASS - All SyncService tests pass

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/sync.service.ts src/app/core/services/sync.service.spec.ts
git commit -m "feat: add SyncService with queue and batching (part 1)"
```

---

## Task 7: Integrate Sync with IdeaService

**Files:**
- Modify: `src/app/core/services/idea.service.ts`
- Test: `src/app/core/services/idea.service.spec.ts`

- [ ] **Step 1: Write test for sync integration**

Modify `src/app/core/services/idea.service.spec.ts` - add test:

```typescript
it('should queue sync after creating idea', async () => {
  const syncService = TestBed.inject(SyncService);
  spyOn(syncService, 'queueChange');
  
  const data: CreateIdeaData = {
    title: 'Test',
    description: 'Test',
    keywords: ['test'],
    status: 'backlog',
    priority: 'medium'
  };
  
  await service.addIdea(data);
  
  expect(syncService.queueChange).toHaveBeenCalledWith(
    jasmine.objectContaining({
      type: 'create',
      entity: 'idea'
    })
  );
});

it('should queue sync after updating idea', async () => {
  const syncService = TestBed.inject(SyncService);
  
  // Create idea first
  const id = await service.addIdea({
    title: 'Test',
    description: 'Test',
    keywords: [],
    status: 'backlog',
    priority: 'medium'
  });
  
  spyOn(syncService, 'queueChange');
  
  await service.updateIdea(id, { title: 'Updated' });
  
  expect(syncService.queueChange).toHaveBeenCalledWith(
    jasmine.objectContaining({
      type: 'update',
      entity: 'idea'
    })
  );
});

it('should queue sync after deleting idea', async () => {
  const syncService = TestBed.inject(SyncService);
  
  // Create idea first
  const id = await service.addIdea({
    title: 'Test',
    description: 'Test',
    keywords: [],
    status: 'backlog',
    priority: 'medium'
  });
  
  spyOn(syncService, 'queueChange');
  
  await service.deleteIdea(id);
  
  expect(syncService.queueChange).toHaveBeenCalledWith(
    jasmine.objectContaining({
      type: 'delete',
      entity: 'idea'
    })
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --include='**/idea.service.spec.ts'
```

Expected: FAIL - SyncService not injected, queueChange not called

- [ ] **Step 3: Inject SyncService into IdeaService**

Modify `src/app/core/services/idea.service.ts`:

```typescript
import { SyncService } from './sync.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class IdeaService {
  private db = inject(DatabaseService);
  private colorService = inject(ColorService);
  private componentService = inject(ComponentService);
  private projectService = inject(ProjectService);
  private syncService = inject(SyncService); // NEW
  private authService = inject(AuthService); // NEW

  // ... existing code ...

  /**
   * Get active workspace ID
   */
  private async getActiveWorkspaceId(): Promise<string> {
    // For Phase 1, use default workspace if authenticated
    if (this.authService.isAuthenticated()) {
      const user = this.authService.currentUser();
      if (user) {
        const workspaces = await this.db.workspaces
          .where('ownerId')
          .equals(user.uid)
          .and(w => w.isDefault === true)
          .toArray();
        
        if (workspaces.length > 0) {
          return workspaces[0].id;
        }
      }
    }
    
    // Fall back to local workspace
    return 'local-default';
  }

  /**
   * Add a new idea to the database
   */
  async addIdea(data: CreateIdeaData): Promise<string> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const id = uuidv4();
      const now = new Date();
      const workspaceId = data.workspaceId || await this.getActiveWorkspaceId();
      const userId = this.authService.currentUser()?.uid || 'local-user';

      const color = data.color || (data.keywords.length > 0 
        ? this.colorService.getKeywordColor(data.keywords[0])
        : '#3B82F6');

      const idea: Idea = {
        ...data,
        id,
        color,
        workspaceId,
        version: 1,
        createdBy: userId,
        lastModifiedBy: userId,
        createdAt: now,
        updatedAt: now
      };

      // Register component if provided
      if (data.component) {
        await this.componentService.getOrCreateComponent(data.component);
      }

      // Register project if provided
      if (data.project) {
        await this.projectService.getOrCreateProject(data.project);
      }

      await this.db.ideas.add(idea);
      await this.loadIdeas();

      // Queue for sync
      this.syncService.queueChange({
        type: 'create',
        entity: 'idea',
        id,
        data: idea,
        timestamp: now,
        workspaceId
      });

      return id;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add idea';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Update an existing idea
   */
  async updateIdea(id: string, updates: UpdateIdeaData): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const existing = await this.db.ideas.get(id);
      if (!existing) {
        throw new Error('Idea not found');
      }

      const now = new Date();
      const userId = this.authService.currentUser()?.uid || 'local-user';

      const updated: Partial<Idea> = {
        ...updates,
        version: existing.version + 1,
        lastModifiedBy: userId,
        updatedAt: now
      };

      // Register component if changed
      if (updates.component && updates.component !== existing.component) {
        await this.componentService.getOrCreateComponent(updates.component);
      }

      // Register project if changed
      if (updates.project && updates.project !== existing.project) {
        await this.projectService.getOrCreateProject(updates.project);
      }

      await this.db.ideas.update(id, updated);
      await this.loadIdeas();

      // Queue for sync
      this.syncService.queueChange({
        type: 'update',
        entity: 'idea',
        id,
        data: { ...existing, ...updated },
        timestamp: now,
        workspaceId: existing.workspaceId
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update idea';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Delete an idea
   */
  async deleteIdea(id: string): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const existing = await this.db.ideas.get(id);
      if (!existing) {
        throw new Error('Idea not found');
      }

      await this.db.ideas.delete(id);

      // Delete associated connections
      const connections = await this.db.connections
        .filter(c => c.sourceId === id || c.targetId === id)
        .toArray();

      for (const conn of connections) {
        await this.db.connections.delete(conn.id);
      }

      await this.loadIdeas();

      // Queue for sync
      this.syncService.queueChange({
        type: 'delete',
        entity: 'idea',
        id,
        data: null,
        timestamp: new Date(),
        workspaceId: existing.workspaceId
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete idea';
      this.errorSignal.set(message);
      throw error;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  // ... rest of existing code ...
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --include='**/idea.service.spec.ts'
```

Expected: PASS - All IdeaService tests pass

- [ ] **Step 5: Test manually**

```bash
npm start
# Create/edit/delete an idea
# Check browser console: should see queue count increase
```

- [ ] **Step 6: Commit**

```bash
git add src/app/core/services/idea.service.ts src/app/core/services/idea.service.spec.ts
git commit -m "feat: integrate SyncService with IdeaService CRUD operations"
```

---

## Task 8: SyncService Part 2 - Inbound Listeners

**Files:**
- Modify: `src/app/core/services/sync.service.ts`
- Modify: `src/app/core/services/sync.service.spec.ts`

- [ ] **Step 1: Write test for inbound listeners**

Add to `src/app/core/services/sync.service.spec.ts`:

```typescript
it('should start listening to Firebase changes', () => {
  const workspaceId = 'ws-1';
  
  service.startListening(workspaceId);
  
  // Verify listener is active (check internal state or mock Firebase)
  expect(service['listeners'].has(workspaceId)).toBe(true);
});

it('should stop listening when requested', () => {
  const workspaceId = 'ws-1';
  
  service.startListening(workspaceId);
  service.stopListening(workspaceId);
  
  expect(service['listeners'].has(workspaceId)).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --include='**/sync.service.spec.ts'
```

Expected: FAIL - listeners property undefined

- [ ] **Step 3: Implement inbound listeners**

Modify `src/app/core/services/sync.service.ts` - add listener methods:

```typescript
export class SyncService {
  // ... existing code ...

  private listeners = new Map<string, any>();

  /**
   * Start listening for remote changes in a workspace
   */
  startListening(workspaceId: string): void {
    if (!this.authService.isAuthenticated()) {
      return;
    }

    // Listen to ideas
    const ideasRef = ref(
      this.firebaseService.database,
      `workspaces/${workspaceId}/ideas`
    );

    const ideasListener = onValue(ideasRef, async (snapshot) => {
      const remoteIdeas = snapshot.val();
      if (!remoteIdeas) return;

      for (const [id, data] of Object.entries(remoteIdeas)) {
        await this.handleRemoteIdea(id, data as any, workspaceId);
      }
    });

    this.listeners.set(`${workspaceId}-ideas`, ideasListener);

    // Similar listeners for connections, components, projects
  }

  /**
   * Handle a remote idea change
   */
  private async handleRemoteIdea(
    id: string,
    remoteData: any,
    workspaceId: string
  ): Promise<void> {
    const localIdea = await this.db.ideas.get(id);

    if (!localIdea) {
      // New idea from remote - add locally
      await this.db.ideas.add({
        ...remoteData,
        id,
        workspaceId,
        createdAt: new Date(remoteData.createdAt),
        updatedAt: new Date(remoteData.updatedAt)
      });
    } else {
      // Existing idea - check for conflicts
      if (localIdea.version !== remoteData.version) {
        // Conflict detected - will handle in next task
        console.warn('Conflict detected for idea:', id);
      } else {
        // No conflict - update locally
        await this.db.ideas.update(id, {
          ...remoteData,
          updatedAt: new Date(remoteData.updatedAt)
        });
      }
    }
  }

  /**
   * Stop listening for remote changes
   */
  stopListening(workspaceId: string): void {
    const ideasKey = `${workspaceId}-ideas`;
    const ideasRef = ref(
      this.firebaseService.database,
      `workspaces/${workspaceId}/ideas`
    );

    if (this.listeners.has(ideasKey)) {
      off(ideasRef);
      this.listeners.delete(ideasKey);
    }

    // Similar for other entity types
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --include='**/sync.service.spec.ts'
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/sync.service.ts src/app/core/services/sync.service.spec.ts
git commit -m "feat: add inbound Firebase listeners to SyncService"
```

---

## Task 9: SyncService Part 3 - Conflict Resolution

**Files:**
- Modify: `src/app/core/services/sync.service.ts`
- Modify: `src/app/core/services/sync.service.spec.ts`

- [ ] **Step 1: Write test for conflict resolution**

Add to `src/app/core/services/sync.service.spec.ts`:

```typescript
describe('Conflict Resolution', () => {
  it('should auto-merge keywords', () => {
    const local = { keywords: ['bug', 'urgent'], version: 2 };
    const remote = { keywords: ['bug', 'testing'], version: 2 };
    
    const merged = service['mergeKeywords'](local.keywords, remote.keywords);
    
    expect(merged).toEqual(['bug', 'urgent', 'testing']);
  });

  it('should use newest status on conflict', () => {
    const local = { status: 'in-progress', updatedAt: new Date('2026-01-01') };
    const remote = { status: 'done', updatedAt: new Date('2026-01-02') };
    
    const merged = service['mergeMetadata'](local, remote, 'status');
    
    expect(merged).toBe('done');
  });

  it('should flag title conflict for manual resolution', () => {
    const local = { title: 'Fix bug', version: 2 };
    const remote = { title: 'Fix authentication', version: 2 };
    
    const needsManual = service['needsManualResolution']('title', local, remote);
    
    expect(needsManual).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --include='**/sync.service.spec.ts'
```

Expected: FAIL - merge methods undefined

- [ ] **Step 3: Implement conflict resolution**

Modify `src/app/core/services/sync.service.ts` - add conflict resolution methods:

```typescript
import { ConflictResolution } from '../models/sync.model';
import { Idea } from '../models/idea.model';

export class SyncService {
  // ... existing code ...

  /**
   * Resolve conflict between local and remote idea
   */
  private async resolveConflict(
    local: Idea,
    remote: any
  ): Promise<Idea | null> {
    const conflicts: ConflictResolution[] = [];

    // Auto-merge keywords (union)
    const mergedKeywords = this.mergeKeywords(local.keywords, remote.keywords);

    // Auto-merge metadata (newest wins)
    const status = this.mergeMetadata(local, remote, 'status');
    const priority = this.mergeMetadata(local, remote, 'priority');
    const component = this.mergeMetadata(local, remote, 'component');
    const project = this.mergeMetadata(local, remote, 'project');

    // Check for manual conflicts
    if (this.needsManualResolution('title', local, remote)) {
      conflicts.push({
        type: 'manual',
        field: 'title',
        localValue: local.title,
        remoteValue: remote.title,
        localTimestamp: local.updatedAt,
        remoteTimestamp: new Date(remote.updatedAt)
      });
    }

    if (this.needsManualResolution('description', local, remote)) {
      conflicts.push({
        type: 'manual',
        field: 'description',
        localValue: local.description,
        remoteValue: remote.description,
        localTimestamp: local.updatedAt,
        remoteTimestamp: new Date(remote.updatedAt)
      });
    }

    // If manual conflicts, return null (UI will show conflict dialog)
    if (conflicts.length > 0) {
      // TODO: Emit event for UI to show conflict dialog
      console.log('Manual conflicts detected:', conflicts);
      return null;
    }

    // Return auto-merged idea
    return {
      ...local,
      ...remote,
      keywords: mergedKeywords,
      status,
      priority,
      component,
      project,
      version: Math.max(local.version, remote.version) + 1,
      updatedAt: new Date()
    };
  }

  /**
   * Merge keywords (union of both sets)
   */
  private mergeKeywords(local: string[], remote: string[]): string[] {
    return [...new Set([...local, ...remote])];
  }

  /**
   * Merge metadata field (newest wins)
   */
  private mergeMetadata(local: any, remote: any, field: string): any {
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();
    
    return remoteTime > localTime ? remote[field] : local[field];
  }

  /**
   * Check if field needs manual resolution
   */
  private needsManualResolution(
    field: string,
    local: any,
    remote: any
  ): boolean {
    // Both changed from original (we don't have original, so check if different)
    return local[field] !== remote[field] && 
           local.version === remote.version;
  }

  /**
   * Update handleRemoteIdea to use conflict resolution
   */
  private async handleRemoteIdea(
    id: string,
    remoteData: any,
    workspaceId: string
  ): Promise<void> {
    const localIdea = await this.db.ideas.get(id);

    if (!localIdea) {
      // New idea from remote - add locally
      await this.db.ideas.add({
        ...remoteData,
        id,
        workspaceId,
        createdAt: new Date(remoteData.createdAt),
        updatedAt: new Date(remoteData.updatedAt)
      });
    } else {
      // Check for conflicts
      if (localIdea.version !== remoteData.version) {
        const resolved = await this.resolveConflict(localIdea, remoteData);
        
        if (resolved) {
          // Auto-merged successfully
          await this.db.ideas.update(id, resolved);
        } else {
          // Manual resolution needed - UI will handle
          // For now, keep local version
        }
      } else {
        // No conflict - update locally
        await this.db.ideas.update(id, {
          ...remoteData,
          updatedAt: new Date(remoteData.updatedAt)
        });
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --include='**/sync.service.spec.ts'
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/core/services/sync.service.ts src/app/core/services/sync.service.spec.ts
git commit -m "feat: add conflict resolution to SyncService"
```

---

## Task 10: Create SignInButtonComponent

**Files:**
- Create: `src/app/shared/components/auth/sign-in-button/sign-in-button.component.ts`
- Create: `src/app/shared/components/auth/sign-in-button/sign-in-button.component.html`
- Create: `src/app/shared/components/auth/sign-in-button/sign-in-button.component.scss`
- Create: `src/app/shared/components/auth/sign-in-button/sign-in-button.component.spec.ts`

- [ ] **Step 1: Generate component**

```bash
ng generate component shared/components/auth/sign-in-button --skip-tests
```

- [ ] **Step 2: Write component template**

Create `src/app/shared/components/auth/sign-in-button/sign-in-button.component.html`:

```html
<button 
  mat-raised-button 
  color="primary"
  (click)="onSignIn()"
  [disabled]="isLoading()"
  class="sign-in-button">
  
  @if (isLoading()) {
    <mat-spinner diameter="20"></mat-spinner>
    <span>Signing in...</span>
  } @else {
    <mat-icon>login</mat-icon>
    <span>Sign in with GitHub</span>
  }
</button>
```

- [ ] **Step 3: Write component styles**

Create `src/app/shared/components/auth/sign-in-button/sign-in-button.component.scss`:

```scss
.sign-in-button {
  display: flex;
  align-items: center;
  gap: 8px;

  mat-icon {
    margin-right: 8px;
  }

  mat-spinner {
    margin-right: 8px;
  }
}
```

- [ ] **Step 4: Implement component logic**

Modify `src/app/shared/components/auth/sign-in-button/sign-in-button.component.ts`:

```typescript
import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sign-in-button',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './sign-in-button.component.html',
  styleUrls: ['./sign-in-button.component.scss']
})
export class SignInButtonComponent {
  private authService = inject(AuthService);
  
  isLoading = signal(false);

  async onSignIn(): Promise<void> {
    this.isLoading.set(true);
    
    try {
      await this.authService.signInWithGitHub();
    } catch (error) {
      console.error('Sign in failed:', error);
      // TODO: Show error toast
    } finally {
      this.isLoading.set(false);
    }
  }
}
```

- [ ] **Step 5: Write component test**

Create `src/app/shared/components/auth/sign-in-button/sign-in-button.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignInButtonComponent } from './sign-in-button.component';
import { AuthService } from '../../../../core/services/auth.service';

describe('SignInButtonComponent', () => {
  let component: SignInButtonComponent;
  let fixture: ComponentFixture<SignInButtonComponent>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['signInWithGitHub']);

    await TestBed.configureTestingModule({
      imports: [SignInButtonComponent],
      providers: [
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    fixture = TestBed.createComponent(SignInButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call authService.signInWithGitHub on click', async () => {
    authService.signInWithGitHub.and.returnValue(Promise.resolve());

    await component.onSignIn();

    expect(authService.signInWithGitHub).toHaveBeenCalled();
  });

  it('should show loading state during sign in', () => {
    authService.signInWithGitHub.and.returnValue(
      new Promise(resolve => setTimeout(resolve, 100))
    );

    component.onSignIn();

    expect(component.isLoading()).toBe(true);
  });
});
```

- [ ] **Step 6: Run test**

```bash
npm test -- --include='**/sign-in-button.component.spec.ts'
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/shared/components/auth/sign-in-button/
git commit -m "feat: add SignInButtonComponent"
```

---

## Task 11: Create SyncStatusComponent

**Files:**
- Create: `src/app/shared/components/auth/sync-status/sync-status.component.ts`
- Create: `src/app/shared/components/auth/sync-status/sync-status.component.html`
- Create: `src/app/shared/components/auth/sync-status/sync-status.component.scss`
- Create: `src/app/shared/components/auth/sync-status/sync-status.component.spec.ts`

- [ ] **Step 1: Generate component**

```bash
ng generate component shared/components/auth/sync-status --skip-tests
```

- [ ] **Step 2: Write component template**

Create `src/app/shared/components/auth/sync-status/sync-status.component.html`:

```html
@if (shouldShow()) {
  <div class="sync-status" [class]="'sync-status-' + syncService.syncStatus()">
    @switch (syncService.syncStatus()) {
      @case ('syncing') {
        <mat-spinner diameter="16"></mat-spinner>
        <span>Syncing {{ syncService.pendingCount() }} changes...</span>
      }
      @case ('error') {
        <mat-icon>error</mat-icon>
        <span>Sync failed - <a (click)="onRetry()">Retry</a></span>
      }
      @case ('offline') {
        <mat-icon>cloud_off</mat-icon>
        <span>Offline - {{ syncService.pendingCount() }} pending</span>
      }
    }
  </div>
}
```

- [ ] **Step 3: Write component styles**

Create `src/app/shared/components/auth/sync-status/sync-status.component.scss`:

```scss
.sync-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  
  mat-icon {
    width: 16px;
    height: 16px;
    font-size: 16px;
  }

  &.sync-status-syncing {
    background-color: #e3f2fd;
    color: #1976d2;
  }

  &.sync-status-error {
    background-color: #ffebee;
    color: #c62828;
  }

  &.sync-status-offline {
    background-color: #fff3e0;
    color: #ef6c00;
  }

  a {
    color: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
}
```

- [ ] **Step 4: Implement component logic**

Modify `src/app/shared/components/auth/sync-status/sync-status.component.ts`:

```typescript
import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SyncService } from '../../../../core/services/sync.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './sync-status.component.html',
  styleUrls: ['./sync-status.component.scss']
})
export class SyncStatusComponent {
  syncService = inject(SyncService);
  private authService = inject(AuthService);

  // Only show when authenticated and status is not idle/synced
  shouldShow = computed(() => {
    const status = this.syncService.syncStatus();
    return this.authService.isAuthenticated() && 
           status !== 'idle' && 
           status !== 'synced';
  });

  onRetry(): void {
    // Trigger manual sync
    // TODO: Implement manual retry in SyncService
    console.log('Manual retry requested');
  }
}
```

- [ ] **Step 5: Write component test**

Create `src/app/shared/components/auth/sync-status/sync-status.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SyncStatusComponent } from './sync-status.component';
import { SyncService } from '../../../../core/services/sync.service';
import { AuthService } from '../../../../core/services/auth.service';
import { signal } from '@angular/core';

describe('SyncStatusComponent', () => {
  let component: SyncStatusComponent;
  let fixture: ComponentFixture<SyncStatusComponent>;

  beforeEach(async () => {
    const syncServiceStub = {
      syncStatus: signal('idle'),
      pendingCount: signal(0)
    };

    const authServiceStub = {
      isAuthenticated: signal(true)
    };

    await TestBed.configureTestingModule({
      imports: [SyncStatusComponent],
      providers: [
        { provide: SyncService, useValue: syncServiceStub },
        { provide: AuthService, useValue: authServiceStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SyncStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should hide when status is idle', () => {
    expect(component.shouldShow()).toBe(false);
  });

  it('should show when status is syncing', () => {
    component.syncService.syncStatus = signal('syncing');
    expect(component.shouldShow()).toBe(true);
  });
});
```

- [ ] **Step 6: Run test**

```bash
npm test -- --include='**/sync-status.component.spec.ts'
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/app/shared/components/auth/sync-status/
git commit -m "feat: add SyncStatusComponent"
```

---

## Task 12: Update Toolbar with Auth UI

**Files:**
- Modify: `src/app/shared/components/layout/toolbar/toolbar.component.html`
- Modify: `src/app/shared/components/layout/toolbar/toolbar.component.ts`
- Modify: `src/app/shared/components/layout/toolbar/toolbar.component.scss`

- [ ] **Step 1: Update toolbar template**

Modify `src/app/shared/components/layout/toolbar/toolbar.component.html` - add auth UI:

```html
<mat-toolbar color="primary" class="app-toolbar">
  <span class="app-title">Mind Dump</span>
  
  <span class="spacer"></span>
  
  <!-- View picker buttons (existing) -->
  <div class="view-controls">
    <!-- ... existing view buttons ... -->
  </div>
  
  <!-- NEW: Sync status (only when authenticated) -->
  <app-sync-status></app-sync-status>
  
  <!-- NEW: Auth UI -->
  @if (authService.isAuthenticated()) {
    <button 
      mat-icon-button 
      [matMenuTriggerFor]="userMenu"
      class="user-menu-button">
      @if (authService.currentUser()?.photoURL) {
        <img 
          [src]="authService.currentUser()!.photoURL!" 
          alt="User avatar"
          class="user-avatar">
      } @else {
        <mat-icon>account_circle</mat-icon>
      }
    </button>
    
    <mat-menu #userMenu="matMenu">
      <div class="user-menu-header">
        <div class="user-name">{{ authService.currentUser()?.displayName }}</div>
        <div class="user-email">{{ authService.currentUser()?.email }}</div>
      </div>
      <mat-divider></mat-divider>
      <button mat-menu-item (click)="onSignOut()">
        <mat-icon>logout</mat-icon>
        <span>Sign Out</span>
      </button>
    </mat-menu>
  } @else {
    <app-sign-in-button></app-sign-in-button>
  }
  
  <button mat-icon-button (click)="onNewIdea()">
    <mat-icon matTooltip="Create a new idea">add_circle</mat-icon>
  </button>
</mat-toolbar>
```

- [ ] **Step 2: Update toolbar component**

Modify `src/app/shared/components/layout/toolbar/toolbar.component.ts`:

```typescript
import { Component, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { SignInButtonComponent } from '../../auth/sign-in-button/sign-in-button.component';
import { SyncStatusComponent } from '../../auth/sync-status/sync-status.component';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatMenuModule,
    MatDividerModule,
    SignInButtonComponent,
    SyncStatusComponent
  ],
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss']
})
export class ToolbarComponent {
  authService = inject(AuthService);
  
  newIdea = output<void>();
  viewModeChange = output<'grid' | 'graph' | 'cluster'>();

  onNewIdea(): void {
    this.newIdea.emit();
  }

  async onSignOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  }

  onViewModeChange(mode: 'grid' | 'graph' | 'cluster'): void {
    this.viewModeChange.emit(mode);
  }
}
```

- [ ] **Step 3: Update toolbar styles**

Modify `src/app/shared/components/layout/toolbar/toolbar.component.scss` - add:

```scss
.user-menu-button {
  margin-left: 16px;
  
  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
  }
}

.user-menu-header {
  padding: 16px;
  min-width: 200px;
  
  .user-name {
    font-weight: 500;
    font-size: 16px;
    margin-bottom: 4px;
  }
  
  .user-email {
    font-size: 14px;
    color: rgba(0, 0, 0, 0.6);
  }
}
```

- [ ] **Step 4: Test manually**

```bash
npm start
# Check toolbar shows sign-in button when not authenticated
# Sign in
# Check toolbar shows user avatar and menu
# Check sync status appears when syncing
```

- [ ] **Step 5: Commit**

```bash
git add src/app/shared/components/layout/toolbar/
git commit -m "feat: integrate auth UI into toolbar"
```

---

## Task 13: Create MergeDialogComponent

**Files:**
- Create: `src/app/features/ideas/components/merge-dialog/merge-dialog.component.ts`
- Create: `src/app/features/ideas/components/merge-dialog/merge-dialog.component.html`
- Create: `src/app/features/ideas/components/merge-dialog/merge-dialog.component.scss`

- [ ] **Step 1: Generate component**

```bash
ng generate component features/ideas/components/merge-dialog --skip-tests
```

- [ ] **Step 2: Write dialog template**

Create `src/app/features/ideas/components/merge-dialog/merge-dialog.component.html`:

```html
<h2 mat-dialog-title>Welcome to Mind Dump!</h2>

<mat-dialog-content>
  <p>You have <strong>{{ data.localIdeasCount }} ideas</strong> stored locally.</p>
  <p>What would you like to do with them?</p>
  
  <mat-radio-group [(ngModel)]="selectedStrategy" class="strategy-group">
    <mat-radio-button value="upload" class="strategy-option">
      <div class="strategy-label">Upload to Cloud</div>
      <div class="strategy-description">
        Keep your local ideas and sync them to the cloud.
        Your ideas will be available on all your devices.
      </div>
    </mat-radio-button>
    
    <mat-radio-button value="download" class="strategy-option">
      <div class="strategy-label">Download from Cloud</div>
      <div class="strategy-description">
        Replace local ideas with data from the cloud.
        Your local ideas will be archived.
      </div>
    </mat-radio-button>
    
    <mat-radio-button value="separate" class="strategy-option">
      <div class="strategy-label">Keep Separate</div>
      <div class="strategy-description">
        Archive local ideas and start fresh with the cloud.
        Local ideas saved to IndexedDB backup.
      </div>
    </mat-radio-button>
  </mat-radio-group>
</mat-dialog-content>

<mat-dialog-actions align="end">
  <button mat-button (click)="onCancel()">Cancel</button>
  <button 
    mat-raised-button 
    color="primary" 
    (click)="onContinue()"
    [disabled]="!selectedStrategy">
    Continue
  </button>
</mat-dialog-actions>
```

- [ ] **Step 3: Write dialog styles**

Create `src/app/features/ideas/components/merge-dialog/merge-dialog.component.scss`:

```scss
mat-dialog-content {
  min-width: 480px;
  
  p {
    margin-bottom: 16px;
  }
}

.strategy-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-top: 24px;
}

.strategy-option {
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s;
  
  &:hover {
    background-color: #f5f5f5;
  }
  
  &.mat-radio-checked {
    border-color: #1976d2;
    background-color: #e3f2fd;
  }
}

.strategy-label {
  font-weight: 500;
  font-size: 16px;
  margin-bottom: 4px;
}

.strategy-description {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
  margin-left: 32px;
}
```

- [ ] **Step 4: Implement dialog logic**

Modify `src/app/features/ideas/components/merge-dialog/merge-dialog.component.ts`:

```typescript
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MergeStrategy } from '../../../../core/models/sync.model';

export interface MergeDialogData {
  localIdeasCount: number;
}

@Component({
  selector: 'app-merge-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatRadioModule
  ],
  templateUrl: './merge-dialog.component.html',
  styleUrls: ['./merge-dialog.component.scss']
})
export class MergeDialogComponent {
  data = inject<MergeDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<MergeDialogComponent>);
  
  selectedStrategy: MergeStrategy = 'upload'; // Default to upload (safest)

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onContinue(): void {
    this.dialogRef.close(this.selectedStrategy);
  }
}
```

- [ ] **Step 5: Open dialog on first sign-in**

Modify `src/app/core/services/auth.service.ts` - update signInWithGitHub:

```typescript
import { MatDialog } from '@angular/material/dialog';
import { MergeDialogComponent } from '../../features/ideas/components/merge-dialog/merge-dialog.component';

export class AuthService {
  private dialog = inject(MatDialog);
  
  // ... existing code ...
  
  async signInWithGitHub(): Promise<void> {
    try {
      this.authStateSignal.set('loading');
      
      const provider = new GithubAuthProvider();
      provider.addScope('read:user');
      
      const result = await signInWithPopup(this.firebaseService.auth, provider);
      
      const isFirstTime = await this.isFirstTimeSignIn(result.user.uid);
      
      if (isFirstTime) {
        const localIdeas = await this.db.ideas.toArray();
        const hasLocalData = localIdeas.length > 0;
        
        if (hasLocalData) {
          // Show merge dialog
          const dialogRef = this.dialog.open(MergeDialogComponent, {
            data: { localIdeasCount: localIdeas.length },
            disableClose: true
          });
          
          const strategy = await dialogRef.afterClosed().toPromise();
          
          if (strategy) {
            await this.handleMergeStrategy(strategy);
          } else {
            // User canceled - sign out
            await this.signOut();
          }
        } else {
          await this.createDefaultWorkspace(result.user.uid);
        }
      }
    } catch (error) {
      console.error('Sign in error:', error);
      this.authStateSignal.set('anonymous');
      throw error;
    }
  }
}
```

- [ ] **Step 6: Test manually**

```bash
# Create some local ideas
# Sign in with GitHub
# Check merge dialog appears
# Select strategy
# Verify ideas handled correctly
```

- [ ] **Step 7: Commit**

```bash
git add src/app/features/ideas/components/merge-dialog/ src/app/core/services/auth.service.ts
git commit -m "feat: add MergeDialogComponent for first-time sign-in"
```

---

## Task 14: End-to-End Testing

**Files:**
- N/A (manual testing)

- [ ] **Step 1: Test authentication flow**

```bash
npm start
```

Manual test checklist:
- [ ] App loads without sign-in
- [ ] Can create ideas locally
- [ ] Click "Sign in with GitHub"
- [ ] GitHub OAuth popup appears
- [ ] After sign-in, user avatar appears in toolbar
- [ ] Merge dialog appears if local ideas exist
- [ ] Select "Upload to Cloud" strategy
- [ ] Local ideas migrate to personal workspace

- [ ] **Step 2: Test cross-device sync**

- [ ] Sign in on Device A (desktop browser)
- [ ] Create 3 ideas on Device A
- [ ] Sign in on Device B (mobile browser or incognito)
- [ ] Verify 3 ideas appear on Device B within 5 seconds
- [ ] Edit idea on Device B (change title)
- [ ] Verify Device A sees updated title within 5 seconds

- [ ] **Step 3: Test offline sync**

- [ ] On Device A, turn off WiFi (go offline)
- [ ] Create 2 ideas while offline
- [ ] Verify ideas appear in local UI
- [ ] Turn on WiFi (go online)
- [ ] Verify sync status shows "Syncing..."
- [ ] Verify ideas appear on Device B

- [ ] **Step 4: Test conflict resolution**

- [ ] On Device A, go offline
- [ ] On Device B, go offline
- [ ] Edit same idea on both devices (change different fields)
- [ ] Device A: Change keywords
- [ ] Device B: Change status
- [ ] Bring both online
- [ ] Verify auto-merge (both changes preserved)

- [ ] **Step 5: Test sign out**

- [ ] Sign out on Device A
- [ ] Verify ideas still visible locally
- [ ] Verify no sync activity
- [ ] Close and reopen app
- [ ] Verify ideas still there (local persistence)

- [ ] **Step 6: Document issues**

Create `TESTING_NOTES.md` with any bugs or issues found

---

## Task 15: Deploy to GitHub Pages

**Files:**
- Modify: `.gitignore` (ensure environment.firebase.ts is ignored)
- Create: `src/environments/environment.firebase.ts` (with real config)

- [ ] **Step 1: Set up Firebase project**

Follow Firebase setup guide from design doc:
- [ ] Create Firebase project at console.firebase.google.com
- [ ] Enable GitHub authentication
- [ ] Create GitHub OAuth app
- [ ] Enable Realtime Database
- [ ] Deploy security rules

- [ ] **Step 2: Add real Firebase config**

Replace placeholder in `src/environments/environment.firebase.ts` with real config from Firebase Console.

- [ ] **Step 3: Build production**

```bash
npm run build
```

Expected: Build succeeds without errors

- [ ] **Step 4: Test production build locally**

```bash
cd dist/mind-dump-angular/browser
http-server -p 8080
```

Open http://localhost:8080 and verify:
- [ ] App loads
- [ ] Sign in works
- [ ] Sync works

- [ ] **Step 5: Deploy to GitHub Pages**

```bash
npm run deploy
```

- [ ] **Step 6: Test on GitHub Pages**

Open https://mattwintercorn.github.io/mind-dump-angular/

Verify:
- [ ] App loads
- [ ] PWA install works
- [ ] Sign in works
- [ ] Sync works across devices

- [ ] **Step 7: Commit deployment config**

```bash
git add .gitignore
git commit -m "chore: finalize Firebase sync deployment configuration"
git push origin main
```

- [ ] **Step 8: Create GitHub release**

```bash
git tag v2.0.0-sync
git push origin v2.0.0-sync
```

Create release on GitHub with notes:
- Phase 1: Personal Sync complete
- GitHub OAuth authentication
- Real-time cross-device sync
- Offline queue with auto-flush
- Intelligent conflict resolution

---

## Completion

✅ **Phase 1 Complete!**

**What's Working:**
- GitHub OAuth authentication
- Cross-device sync (real-time, <5 seconds)
- Offline queue with auto-flush when online
- Conflict resolution (auto-merge + manual for title/description)
- Merge dialog on first sign-in
- Sync status indicator in toolbar
- Local-first architecture (works without auth)

**Next Steps (Phase 2):**
- Workspace switcher UI
- Create/share workspaces
- Multi-user collaboration
- Per-workspace access control

**Firebase Usage:**
- Check Firebase Console for usage stats
- Should be well within free tier limits

**Monitoring:**
- Check Firebase Authentication → Users
- Check Realtime Database → Data (view synced ideas)
- Check Realtime Database → Usage (bandwidth/storage)
