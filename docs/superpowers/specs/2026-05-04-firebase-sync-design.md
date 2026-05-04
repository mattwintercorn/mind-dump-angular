# Firebase Sync & Multi-User Collaboration Design

**Date:** 2026-05-04  
**Status:** Approved  
**Implementation Phases:** Phase 1 (Personal Sync), Phase 2 (Workspace Sharing)

## Overview

Add cross-device synchronization to the Mind Dump PWA using Firebase Realtime Database with GitHub authentication. Enable users to sync their ideas across multiple devices with real-time updates, offline queue management, and intelligent conflict resolution. Future-proof the architecture to support multi-user workspaces with collaborative editing.

## Goals

**Phase 1 (Personal Sync - MVP):**
- Single user can sync ideas across their own devices
- GitHub OAuth authentication
- Real-time bidirectional sync (3-5 second batching)
- Offline-first with queue management
- Intelligent conflict resolution (auto-merge + manual)
- Works without authentication (backwards compatible)

**Phase 2 (Workspace Sharing - Future):**
- Users can create multiple workspaces
- Share workspaces with collaborators for real-time collaboration
- Default "Personal" workspace (private)
- Per-workspace isolation and access control
- Full collaborative editing (all members can create/edit/delete)

## Non-Goals

- Advanced permissions (view-only, comment-only) - Phase 2 keeps it simple with editor role only
- Offline conflict resolution UI for every field - Only title/description trigger manual resolution
- Real-time presence indicators (who's currently online) - Nice-to-have for Phase 2+
- Version history / time travel - Not in scope
- End-to-end encryption - Firebase handles transport encryption

## Architecture

### Hybrid Local-First + Cloud Sync

The app maintains a dual-layer data system:

**1. Local Layer (Primary) - IndexedDB via Dexie**
- Source of truth for the UI
- All reads/writes go through local database first
- Instant UI updates (no network latency)
- Works offline seamlessly

**2. Cloud Layer (Sync) - Firebase Realtime Database**
- Syncs data across user's devices
- Listens for remote changes via WebSocket
- Queues local changes for batch upload
- Handles conflict resolution

**3. Workspace Organization**
- Every user gets a default "Personal" workspace (private)
- Phase 2: Users can create additional workspaces and share them
- Each workspace has its own ideas, connections, components, projects

### Data Flow

**Solo User (Phase 1):**
```
User Action → IdeaService → Dexie (local write) → SyncService (queue) → Firebase
                    ↑                                                        ↓
                    └──────────── (batch every 3-5s) ──────────────────────┘

Remote Change → Firebase Listener → SyncService (merge) → Dexie → Signal update
```

**Multi-User Collaboration (Phase 2):**
```
User A edits idea in shared workspace
    ↓
Firebase (/workspaces/{workspaceId}/ideas)
    ↓
User B's Firebase listener detects change
    ↓
User B's Dexie updates → UI refreshes (real-time collaboration)
```

### Key Principles

- **Local-first:** Every operation works offline immediately
- **Eventually consistent:** Changes propagate when online
- **Non-blocking:** Sync never blocks the UI
- **Backwards compatible:** Works without authentication (local-only mode)
- **Workspace isolation:** Users only sync workspaces they have access to (Phase 2)

## Data Model

### Firebase Realtime Database Schema

```
/users/{userId}
  /profile
    - email: string
    - displayName: string
    - photoURL: string
    - githubUsername: string
    - createdAt: timestamp
  /workspaces
    - {workspaceId}: true  // List of workspace IDs user has access to

/workspaces/{workspaceId}
  /metadata
    - name: string
    - ownerId: string
    - createdAt: timestamp
    - updatedAt: timestamp
    - isDefault: boolean  // True for user's personal workspace
  /members
    - {userId}: "owner" | "editor"
  /ideas/{ideaId}
    - title: string
    - description: string
    - keywords: string[]
    - status: string
    - priority: string
    - component: string
    - project: string
    - color: string
    - createdAt: timestamp
    - updatedAt: timestamp
    - createdBy: string (userId)
    - lastModifiedBy: string (userId)
    - version: number  // For conflict detection
  /connections/{connectionId}
    - sourceId: string
    - targetId: string
    - createdAt: timestamp
  /components/{componentId}
    - id: string
    - name: string
    - description: string
    - createdAt: timestamp
  /projects/{projectId}
    - id: string
    - name: string
    - description: string
    - createdAt: timestamp
  /settings
    - theme: string
    - defaultView: string
```

### Local IndexedDB Schema (Enhanced)

**New Table:**
```typescript
workspaces: {
  id: string;              // workspaceId
  name: string;
  ownerId: string;
  isDefault: boolean;
  role: 'owner' | 'editor';
  syncStatus: 'synced' | 'pending' | 'error';
  lastSyncedAt: Date;
}
```

**Enhanced Existing Tables:**
```typescript
ideas: {
  // ...existing fields (id, title, description, keywords, status, priority, component, project, color, createdAt, updatedAt)
  workspaceId: string;        // NEW: links idea to workspace
  version: number;            // NEW: for conflict detection
  createdBy: string;          // NEW: userId who created it
  lastModifiedBy: string;     // NEW: userId of last edit
}

// Similar additions for connections, components, projects
connections: {
  // ...existing fields
  workspaceId: string;
}

components: {
  // ...existing fields
  workspaceId: string;
}

projects: {
  // ...existing fields
  workspaceId: string;
}
```

**Migration Strategy (Dexie v4):**
- Add new fields to existing schema
- Auto-migrate existing ideas on upgrade
- Create default workspace on first auth
- Prompt user for merge strategy if local data exists

## Authentication & User Management

### GitHub OAuth Flow

**1. Anonymous State (No Auth)**
- App works normally with local IndexedDB only
- No sync, no cloud backup
- Toolbar shows "Sign In with GitHub" button

**2. First-Time Sign In**
- User clicks "Sign In with GitHub"
- Firebase Auth popup opens → GitHub OAuth
- On success:
  - Create user profile in `/users/{userId}`
  - Create default "Personal" workspace in `/workspaces/{workspaceId}`
  - Check for existing local data:
    - If local ideas exist → Show merge dialog:
      - **"Upload to Cloud"** - Migrate local ideas to personal workspace
      - **"Download from Cloud"** - Replace local with cloud data
      - **"Keep Separate"** - Archive local, start fresh with cloud
  - Subscribe to Firebase listeners for user's workspaces

**3. Subsequent Sign Ins**
- Auto-sign in if session persists (Firebase token)
- Load user's workspaces from Firebase
- Sync local IndexedDB with cloud
- Show sync status indicator

**4. Sign Out**
- Unsubscribe from Firebase listeners
- Keep local data intact (for offline access)
- Revert to local-only mode
- Show "Sign In with GitHub" button again

### AuthService (New)

```typescript
@Injectable({ providedIn: 'root' })
class AuthService {
  // Signals
  private currentUserSignal = signal<User | null>(null);
  private authStateSignal = signal<'anonymous' | 'authenticated' | 'loading'>('anonymous');
  
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly authState = this.authStateSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.authStateSignal() === 'authenticated');
  
  // Methods
  async signInWithGitHub(): Promise<void>;
  async signOut(): Promise<void>;
  async handleFirstTimeSignIn(localIdeas: Idea[]): Promise<MergeStrategy>;
  
  // Private
  private async createUserProfile(user: User): Promise<void>;
  private async createDefaultWorkspace(userId: string): Promise<string>;
}
```

### Firebase Security Rules

```javascript
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "workspaces": {
      "$workspaceId": {
        ".read": "data.child('members').child(auth.uid).exists()",
        ".write": "data.child('members').child(auth.uid).val() === 'owner' || 
                   data.child('members').child(auth.uid).val() === 'editor'",
        "metadata": {
          ".validate": "newData.hasChildren(['name', 'ownerId', 'createdAt', 'isDefault'])"
        },
        "members": {
          "$memberId": {
            ".validate": "newData.val() === 'owner' || newData.val() === 'editor'"
          }
        }
      }
    }
  }
}
```

**Security Guarantees:**
- Users can only read/write their own profile
- Users can only access workspaces they're members of
- Only workspace owners can modify member list (Phase 2)
- No public access to any data

## Sync Engine & Conflict Resolution

### SyncService (New)

Core service managing bidirectional sync between Dexie and Firebase.

```typescript
@Injectable({ providedIn: 'root' })
class SyncService {
  // Signals
  private syncStatusSignal = signal<SyncStatus>('idle');
  private pendingCountSignal = signal<number>(0);
  
  readonly syncStatus = this.syncStatusSignal.asReadonly();
  readonly pendingCount = this.pendingCountSignal.asReadonly();
  
  // Queue management
  private pendingChanges = new Map<string, Change>();
  private batchTimer: Timer | null = null;
  private BATCH_DELAY = 3000; // 3 seconds
  
  // Methods
  queueChange(change: Change): void;
  async flushBatch(): Promise<void>;
  startListening(workspaceId: string): void;
  stopListening(workspaceId: string): void;
  
  // Conflict resolution
  async resolveConflict(local: Idea, remote: Idea): Promise<Idea>;
}
```

### Outbound Sync (Local → Cloud)

**Queue & Batching:**
1. User performs action (create/edit/delete idea)
2. IdeaService updates Dexie immediately
3. IdeaService calls `SyncService.queueChange()`
4. Change added to queue, batch timer reset to 3 seconds
5. After 3 seconds of no activity, `flushBatch()` uploads all pending changes
6. On success: Clear queue, update sync status
7. On failure: Retry with exponential backoff (1s, 5s, 15s)

**Change Types:**
```typescript
type Change = {
  type: 'create' | 'update' | 'delete';
  entity: 'idea' | 'connection' | 'component' | 'project';
  id: string;
  data: any;
  timestamp: Date;
  workspaceId: string;
};
```

### Inbound Sync (Cloud → Local)

**Real-time Listeners:**
1. On authentication, subscribe to Firebase paths:
   - `/workspaces/{workspaceId}/ideas`
   - `/workspaces/{workspaceId}/connections`
   - `/workspaces/{workspaceId}/components`
   - `/workspaces/{workspaceId}/projects`
2. Firebase listener fires on any remote change
3. SyncService receives change event
4. Check for conflicts (compare versions)
5. Apply to Dexie (merge if needed)
6. Trigger Signal updates → UI refreshes

### Conflict Resolution Strategy

**Automatic Merging (No user prompt):**
- **Keywords:** Union of both sets
  - Device A adds "testing", Device B adds "urgent" → Result has both
- **Status/Priority/Component/Project/Color:** Take newest timestamp
- **Connections:** Merge both (no duplicates)

**Manual Resolution (Show conflict dialog):**
- **Title:** Changed on both devices → Show both versions, user picks or combines
- **Description:** Changed on both devices → Show diff, user resolves

**Conflict Detection:**
```typescript
interface ConflictResolution {
  type: 'auto' | 'manual';
  field: string;
  localValue: any;
  remoteValue: any;
  localTimestamp: Date;
  remoteTimestamp: Date;
  resolution?: any; // User's choice if manual
}

async resolveConflict(local: Idea, remote: Idea): Promise<Idea> {
  const conflicts: ConflictResolution[] = [];
  
  // Check version numbers (concurrent edits)
  if (local.version !== remote.version - 1) {
    // Auto-merge: keywords
    const mergedKeywords = [...new Set([...local.keywords, ...remote.keywords])];
    
    // Auto-merge: metadata (newest wins)
    const status = local.updatedAt > remote.updatedAt ? local.status : remote.status;
    const priority = local.updatedAt > remote.updatedAt ? local.priority : remote.priority;
    
    // Manual: title if both changed
    if (local.title !== remote.title && 
        local.title !== original.title && 
        remote.title !== original.title) {
      conflicts.push({ 
        type: 'manual', 
        field: 'title', 
        localValue: local.title, 
        remoteValue: remote.title,
        localTimestamp: local.updatedAt,
        remoteTimestamp: remote.updatedAt
      });
    }
    
    // Manual: description if both changed
    if (local.description !== remote.description &&
        local.description !== original.description &&
        remote.description !== original.description) {
      conflicts.push({ 
        type: 'manual', 
        field: 'description',
        localValue: local.description,
        remoteValue: remote.description,
        localTimestamp: local.updatedAt,
        remoteTimestamp: remote.updatedAt
      });
    }
  }
  
  // If manual conflicts exist, show dialog
  if (conflicts.some(c => c.type === 'manual')) {
    return await showConflictDialog(conflicts);
  }
  
  // Return auto-merged result
  return {
    ...local,
    keywords: mergedKeywords,
    status,
    priority,
    version: Math.max(local.version, remote.version) + 1
  };
}
```

**Version Tracking:**
- Every edit increments `version` number
- Helps detect concurrent modifications
- Enables intelligent merging
- Version stored in both Dexie and Firebase

## Workspace Management & Sharing

### WorkspaceService (New - Phase 2)

```typescript
@Injectable({ providedIn: 'root' })
class WorkspaceService {
  // Signals
  private workspacesSignal = signal<Workspace[]>([]);
  private activeWorkspaceSignal = signal<Workspace | null>(null);
  
  readonly workspaces = this.workspacesSignal.asReadonly();
  readonly activeWorkspace = this.activeWorkspaceSignal.asReadonly();
  
  // CRUD operations
  async createWorkspace(name: string): Promise<Workspace>;
  async switchWorkspace(workspaceId: string): Promise<void>;
  async deleteWorkspace(workspaceId: string): Promise<void>;
  
  // Sharing (Phase 2)
  async shareWorkspace(workspaceId: string, userEmail: string): Promise<void>;
  async removeCollaborator(workspaceId: string, userId: string): Promise<void>;
  async leaveWorkspace(workspaceId: string): Promise<void>;
  
  // Migration
  async migrateLocalIdeasToWorkspace(ideas: Idea[], workspaceId: string): Promise<void>;
}
```

### Phase 1: Personal Sync Only

**Scope:**
- Single default "Personal" workspace per user
- No sharing UI
- All ideas belong to user's personal workspace
- Sync user's ideas across their own devices

**What users get:**
- Sign in with GitHub
- Ideas sync between laptop and phone
- Works offline with queue
- Conflict resolution for their own edits

### Phase 2: Workspace Sharing

**Scope:**
- Create multiple workspaces
- Invite collaborators by GitHub username/email
- Real-time collaborative editing
- Workspace switcher in toolbar
- Per-workspace filters and views

**Sharing Flow:**
```
1. Owner creates workspace "Team Sprint Ideas"
2. Owner clicks "Share" → enters collaborator's email
3. System looks up user by email in /users
4. Add to /workspaces/{id}/members/{userId}: "editor"
5. Add to /users/{userId}/workspaces/{workspaceId}: true
6. Collaborator's app auto-syncs workspace on next load
7. Both see same ideas in real-time
```

**Access Control:**
- **Owner:** Can add/remove collaborators, delete workspace
- **Editor:** Can create/edit/delete ideas, but cannot manage collaborators
- **Removed collaborator:** Loses access, workspace removed from local device
- **Deleted workspace:** All members lose access

## UI/UX Changes

### Phase 1 UI Changes (Personal Sync)

#### Toolbar Additions

**When Not Authenticated:**
- Add "Sign In with GitHub" button (right side of toolbar, after view pickers)
- Material button with GitHub icon
- No visual changes to existing features

**When Authenticated:**
- Replace "Sign In" with user avatar + dropdown menu:
  - User's GitHub avatar (circle, 32px)
  - Dropdown on click:
    - Display name
    - Email
    - "Sign Out"
    - "Sync Settings" (future)
- Show sync status indicator (to left of avatar):
  - **Syncing:** "Syncing 3 changes..." with spinner
  - **Error:** "Sync failed - Retry" with error icon (clickable)
  - **Synced:** No indicator (auto-hide after 3 seconds)
  - **Offline:** "Offline - 5 pending changes" with offline icon

#### First Sign-In Dialog

**Merge Strategy Dialog (if local data exists):**

Material dialog, 480px wide, centered:

```
┌─────────────────────────────────────────────────────────┐
│  Welcome to Mind Dump!                                  │
│                                                         │
│  You have 12 ideas stored locally.                      │
│  What would you like to do with them?                   │
│                                                         │
│  ○ Upload to Cloud                                      │
│    Keep your local ideas and sync them to the cloud.    │
│    Your ideas will be available on all your devices.    │
│                                                         │
│  ○ Download from Cloud                                  │
│    Replace local ideas with data from the cloud.        │
│    Your local ideas will be archived.                   │
│                                                         │
│  ○ Keep Separate                                        │
│    Archive local ideas and start fresh with the cloud.  │
│    Local ideas saved to IndexedDB backup.               │
│                                                         │
│  [Cancel]                              [Continue]       │
└─────────────────────────────────────────────────────────┘
```

**Component:** `MergeDialogComponent`
- Material radio buttons for options
- Default selection: "Upload to Cloud" (safest)
- Cannot close without choosing
- Shows count of local ideas

#### Conflict Resolution Dialog

**When title/description conflicts detected:**

Material dialog, 600px wide:

```
┌──────────────────────────────────────────────────────────┐
│  Conflict Detected                                       │
│                                                          │
│  The idea "Fix authentication" was edited on multiple    │
│  devices while offline.                                  │
│                                                          │
│  Title:                                                  │
│  ○ This device: "Fix login bug"                          │
│  ○ Other device: "Fix authentication issue"              │
│  ○ Combine: [editable text input]                        │
│                                                          │
│  Description:                                            │
│  ┌────────────────────────────────────────┐             │
│  │ [Diff view with changes highlighted]   │             │
│  │ - Old: Check password validation       │             │
│  │ + New: Validate password and session   │             │
│  └────────────────────────────────────────┘             │
│  ○ Keep this device's version                            │
│  ○ Keep other device's version                           │
│  ○ Edit manually: [Show editor]                          │
│                                                          │
│  [Cancel]                              [Resolve]         │
└──────────────────────────────────────────────────────────┘
```

**Component:** `ConflictDialogComponent`
- Shows both versions side-by-side
- Timestamps for context ("This device: 2 minutes ago")
- "Combine" option for title (user edits text)
- Diff view for description (red/green highlighting)
- Cannot close without resolving

### Phase 2 UI Changes (Workspace Sharing)

#### Workspace Switcher

- Dropdown button in toolbar (between filters and "New Idea")
- Shows current workspace name + chevron icon
- Dropdown menu:
  - List of workspaces (Personal + shared)
  - Workspace name + icon (lock for personal, people for shared)
  - Badge showing idea count per workspace
  - Divider
  - "+ Create Workspace" option at bottom

#### Share Workspace UI

- "Share" button in toolbar (visible when workspace selected, owner only)
- Share icon from Material Icons
- Dialog on click:
  - Title: "Share [Workspace Name]"
  - Email/username input with autocomplete
  - "Add Collaborator" button
  - List of current collaborators:
    - Avatar + name + email
    - Role badge (Owner/Editor)
    - Remove button (X icon, only for owner)
  - "Done" button

**Component:** `ShareWorkspaceDialogComponent`

## Error Handling & Edge Cases

### Network & Connectivity

**Offline Detection:**
- Monitor `navigator.onLine` event
- Monitor Firebase `.info/connected` path
- Both must agree before considering "online"

**Offline Behavior:**
- All operations continue working locally
- Changes queue in SyncService
- Sync status shows "Offline - X pending changes"
- Queue persisted to IndexedDB (survives app close)

**Back Online:**
- Auto-detect connection restored
- Flush queued changes (batch upload)
- Resume Firebase listeners
- Show "Syncing..." then "Synced"

**Sync Failures:**
- Retry logic: 3 attempts with exponential backoff
  - Attempt 1: Immediate
  - Attempt 2: 1 second delay
  - Attempt 3: 5 seconds delay
  - Attempt 4: 15 seconds delay
- After 3 failures: Show persistent error banner
  - "Sync failed - Retry" (clickable)
  - Manual retry button
  - Log error details to console

**Firebase Connection Issues:**
- If disconnected > 30 seconds: Show warning toast
- Gracefully degrade to local-only mode
- Attempt reconnection automatically every 30s
- Don't spam user with reconnection attempts

### Authentication Edge Cases

**Session Expiration:**
- Firebase token expires after 1 hour
- Auto-refresh token in background (Firebase SDK handles this)
- If refresh fails: Prompt re-authentication dialog
- Don't lose local changes during re-auth

**Multi-Device Sign-In:**
- User signs in on Device A, then Device B with same account
- Both devices sync independently
- Conflicts resolved via version numbers + timestamps
- No data loss if both edit offline simultaneously

**Account Deletion (External):**
- User deletes their GitHub account (outside app)
- Firebase auth becomes invalid
- App detects auth failure on next operation
- Revert to local-only mode
- Data remains in local IndexedDB
- Show message: "Authentication expired. Sign in to sync."

### Data Integrity

**Orphaned Connections:**
- If Idea A is deleted, remove all connections referencing it
- Run cleanup on sync: Remove connections to non-existent ideas
- Prevent broken graph visualization

**Duplicate Prevention:**
- Use UUIDs for all IDs (already implemented with `uuid` package)
- Prevents ID collisions across devices
- Firebase upsert: `set()` overwrites, no duplicates

**Large Datasets:**
- Firebase Realtime DB free tier: 1GB storage, 10GB/month bandwidth
- Estimate: ~1KB per idea = ~1 million ideas (unrealistic for personal use)
- If approaching limits: Show warning in UI
- Phase 2: Archive old/completed workspaces

### Security Edge Cases

**Malicious Data:**
- Validate all incoming data from Firebase in SyncService
- Sanitize HTML in titles/descriptions (prevent XSS)
- Enforce character limits client-side and in Firebase rules
- Firebase rules: `.validate` for schema enforcement

**Access Revocation (Phase 2):**
- User is removed from shared workspace
- Firebase listeners auto-unsubscribe (permission denied error)
- SyncService catches error, removes workspace from local Dexie
- Show toast: "Access removed from [workspace name]"

**Firebase Security Rules (Phase 2):**
```javascript
{
  "rules": {
    "workspaces": {
      "$workspaceId": {
        "members": {
          ".write": "data.child(auth.uid).val() === 'owner'"
        }
      }
    }
  }
}
```
Only owners can modify member list.

## Testing Strategy

### Unit Tests (Jasmine/Karma)

**AuthService Tests:**
```typescript
describe('AuthService', () => {
  it('should sign in with GitHub', async () => {});
  it('should create user profile on first sign-in', async () => {});
  it('should show merge dialog if local data exists', async () => {});
  it('should keep local data on sign out', async () => {});
  it('should handle token refresh', async () => {});
});
```

**SyncService Tests:**
```typescript
describe('SyncService', () => {
  it('should queue changes', () => {});
  it('should batch changes after 3 seconds', fakeAsync(() => {
    // Use fakeAsync + tick(3000)
  }));
  it('should retry on failure with exponential backoff', fakeAsync(() => {});
  it('should detect version conflicts', () => {});
  it('should auto-merge keywords', () => {});
  it('should flag title conflicts for manual resolution', () => {});
});
```

**WorkspaceService Tests (Phase 2):**
```typescript
describe('WorkspaceService', () => {
  it('should create workspace', async () => {});
  it('should switch active workspace', async () => {});
  it('should share workspace with user', async () => {});
  it('should remove collaborator', async () => {});
});
```

**Conflict Resolution Tests:**
```typescript
describe('Conflict Resolution', () => {
  it('should merge keywords from both devices', () => {
    const local = { keywords: ['bug', 'urgent'] };
    const remote = { keywords: ['bug', 'testing'] };
    const result = mergeKeywords(local, remote);
    expect(result).toEqual(['bug', 'urgent', 'testing']);
  });
  
  it('should use newest status', () => {});
  it('should flag title conflict', () => {});
});
```

### Integration Tests

**Sync Flow (Mock Firebase):**
```typescript
describe('Sync Integration', () => {
  it('should sync idea from local to cloud', async () => {
    // Create idea locally
    // Verify queued in SyncService
    // Flush batch
    // Verify Firebase write called
  });
  
  it('should receive remote change and update local', async () => {
    // Simulate Firebase listener event
    // Verify Dexie updated
    // Verify Signal emitted
  });
  
  it('should handle offline queue', async () => {
    // Go offline
    // Create 3 ideas
    // Verify queued
    // Go online
    // Verify all uploaded
  });
});
```

**Multi-Device Simulation:**
```typescript
describe('Multi-Device Sync', () => {
  it('should resolve conflict when both devices edit same idea', async () => {
    // Device A edits idea offline (change title)
    // Device B edits same idea offline (change description)
    // Both come online
    // Verify auto-merge (both changes preserved)
  });
  
  it('should show conflict dialog for title change on both devices', async () => {
    // Device A changes title
    // Device B changes title
    // Verify manual resolution triggered
  });
});
```

### E2E Tests (Optional - Playwright/Cypress)

**Real Firebase Connection (Use Firebase Emulator):**
```typescript
describe('E2E Sync', () => {
  it('should sync idea across two browser windows', async () => {
    // Open two browser contexts
    // Sign in with same user on both
    // Create idea in Browser A
    // Wait 5 seconds
    // Verify idea appears in Browser B
  });
  
  it('should handle offline/online transitions', async () => {
    // Create idea while offline
    // Verify queued
    // Go online
    // Verify synced
  });
});
```

### Manual Testing Checklist

**Phase 1 (Personal Sync):**
- [ ] Sign in with GitHub on Device A (desktop browser)
- [ ] Create 5 ideas on Device A
- [ ] Sign in with same account on Device B (mobile browser)
- [ ] Verify 5 ideas appear on Device B within 5 seconds
- [ ] Edit idea on Device B (change title to "Updated from mobile")
- [ ] Verify Device A sees updated title within 5 seconds
- [ ] Go offline on Device A (turn off WiFi)
- [ ] Create 2 ideas on Device A while offline
- [ ] Go back online
- [ ] Verify 2 new ideas sync to Device B
- [ ] Edit same idea on both devices while both offline
- [ ] Go online on both devices
- [ ] Verify conflict dialog appears (manual resolution)
- [ ] Sign out on Device A
- [ ] Verify ideas still visible locally on Device A
- [ ] Close and reopen app
- [ ] Verify auto-sign in works

**Phase 2 (Workspace Sharing):**
- [ ] User A creates workspace "Team Sprint Ideas"
- [ ] User A shares workspace with User B (by email)
- [ ] User B sees workspace appear in switcher automatically
- [ ] User B switches to shared workspace
- [ ] User B creates idea in shared workspace
- [ ] User A sees new idea appear in real-time (within 5 seconds)
- [ ] User A edits the idea
- [ ] User B sees edit reflected
- [ ] User A removes User B from workspace
- [ ] User B sees workspace disappear from switcher
- [ ] User B can no longer access workspace ideas

## Implementation Phases

### Phase 1: Personal Sync (MVP) - Weeks 1-3

**Goal:** Single-user cross-device sync with GitHub auth

#### Week 1: Firebase Setup & Authentication

**Tasks:**
1. Create Firebase project (console.firebase.google.com)
2. Enable GitHub OAuth provider in Firebase Auth
3. Configure Firebase Realtime Database
4. Install dependencies: `npm install firebase @angular/fire`
5. Add Firebase config to `environment.ts` and `environment.prod.ts`
6. Create `AuthService` with GitHub sign-in/out
7. Create `SignInButtonComponent` for toolbar
8. Update `ToolbarComponent` to show sign-in button when unauthenticated
9. Write unit tests for `AuthService`

**Deliverables:**
- Firebase project configured
- GitHub OAuth working (sign in/out)
- User profile created in Firebase on first sign-in
- Unit tests passing (80%+ coverage for AuthService)

#### Week 2: Sync Engine & Data Migration

**Tasks:**
1. Create `FirebaseService` (wrapper for Firebase SDK)
2. Create `SyncService` with queue and batching logic
3. Update Dexie schema to v4:
   - Add `workspaces` table
   - Add `workspaceId`, `version`, `createdBy`, `lastModifiedBy` to ideas/connections/components/projects
4. Implement migration logic (v3 → v4)
5. Create default workspace on first auth
6. Implement `MergeDialogComponent` for first sign-in
7. Hook IdeaService CRUD operations to queue changes
8. Implement outbound sync (local → Firebase)
9. Write unit tests for SyncService queue/batch logic

**Deliverables:**
- Database schema migrated to v4
- SyncService queues and batches changes (3-second delay)
- Outbound sync working (local changes upload to Firebase)
- Merge dialog shows on first sign-in with local data
- Unit tests passing

#### Week 3: Real-time Sync & Conflict Resolution

**Tasks:**
1. Implement Firebase listeners (inbound sync)
2. Implement conflict detection (version number comparison)
3. Implement auto-merge logic (keywords, metadata)
4. Create `ConflictDialogComponent` for manual resolution
5. Implement manual conflict resolution flow
6. Create `SyncStatusComponent` for toolbar
7. Update toolbar to show sync status indicator
8. Implement offline queue persistence (survive app close)
9. Handle network transitions (offline → online)
10. Write integration tests for sync flow
11. End-to-end manual testing

**Deliverables:**
- Inbound sync working (remote changes appear locally)
- Conflict resolution (auto-merge + manual dialog)
- Sync status indicator in toolbar
- Offline queue persists and flushes when online
- All tests passing (80%+ coverage)
- Phase 1 feature-complete and tested

### Phase 2: Workspace Sharing - Weeks 4-5

**Goal:** Multi-user collaboration with workspace isolation

#### Week 4: Workspace Management

**Tasks:**
1. Create `WorkspaceService` (CRUD operations)
2. Create `WorkspaceSwitcherComponent` for toolbar
3. Implement create/delete/switch workspace functionality
4. Update Firebase schema to support multiple workspaces per user
5. Update sync logic to filter by active workspace
6. Handle workspace switching (unsubscribe old, subscribe new listeners)
7. Update UI to show current workspace
8. Write unit tests for WorkspaceService

**Deliverables:**
- Users can create multiple workspaces
- Workspace switcher in toolbar
- Switching workspace loads correct ideas
- Each workspace isolated (no data leakage)
- Unit tests passing

#### Week 5: Collaboration & Sharing

**Tasks:**
1. Create `ShareWorkspaceDialogComponent`
2. Implement share workspace flow:
   - Look up user by email
   - Add to workspace members
   - Update Firebase user's workspace list
3. Implement remove collaborator functionality
4. Implement leave workspace functionality
5. Update Firebase security rules for workspace access
6. Handle access revocation (remove workspace locally)
7. Add "Share" button to toolbar (owner only)
8. Test real-time collaboration (two users, one workspace)
9. Write integration tests for sharing
10. End-to-end manual testing with two accounts

**Deliverables:**
- Users can share workspaces by email
- Collaborators see workspace appear automatically
- Real-time collaborative editing works
- Access control enforced (only members can access)
- All tests passing (80%+ coverage)
- Phase 2 feature-complete and tested

### Phase 3: Polish & Optimization - Week 6

**Goal:** Performance, UX enhancements, monitoring

**Tasks:**
1. Lazy-load Firebase SDK (reduce initial bundle size)
2. Optimize sync frequency based on activity
3. Add service worker caching for Firebase SDK
4. Implement pagination for large workspaces (>1000 ideas)
5. Add keyboard shortcuts for workspace switching
6. Implement bulk operations (move ideas between workspaces)
7. Add Firebase Analytics for monitoring
8. Track sync success/failure rates
9. Monitor conflict resolution frequency
10. Alert user if approaching Firebase quota limits
11. Performance profiling and optimization
12. Final round of user acceptance testing

**Deliverables:**
- App remains fast (no blocking operations)
- Bundle size optimized
- Monitoring in place (Analytics)
- Polish features (keyboard shortcuts, bulk ops)
- Production-ready

## Success Criteria

### Phase 1: Personal Sync

**Functional:**
- ✅ User can sign in with GitHub
- ✅ Ideas sync between 2+ devices within 5 seconds (real-time)
- ✅ Offline changes queue and sync when online (no data loss)
- ✅ Conflicts detected and resolved (auto-merge + manual dialog)
- ✅ Merge dialog shown on first sign-in if local data exists
- ✅ Sign out preserves local data (can still use offline)

**Non-Functional:**
- ✅ App remains fast (no blocking operations, sync is async)
- ✅ Works offline seamlessly (local-first maintained)
- ✅ Backwards compatible (existing users unaffected, can skip auth)
- ✅ Firebase free tier sufficient (<10GB/month bandwidth for typical use)
- ✅ Test coverage 80%+ (unit + integration)

### Phase 2: Workspace Sharing

**Functional:**
- ✅ User can create multiple workspaces
- ✅ User can share workspace with collaborators by email
- ✅ Collaborators see changes in real-time (<5 seconds)
- ✅ Access control works (only members can access workspace)
- ✅ Workspace isolation (no data leakage between workspaces)
- ✅ Owner can remove collaborators
- ✅ Collaborators can leave workspace

**Non-Functional:**
- ✅ Real-time collaboration feels responsive
- ✅ Switching workspaces is fast (<1 second)
- ✅ Firebase security rules enforced (server-side validation)
- ✅ Test coverage 80%+ for workspace features

## Open Questions & Future Considerations

**Open Questions:**
- None remaining (all clarified during design)

**Future Enhancements (Beyond Phase 2):**
1. **Presence Indicators:** Show which collaborators are currently online
2. **Granular Permissions:** Add view-only, comment-only roles
3. **Activity Feed:** Show recent changes in workspace (who edited what)
4. **Workspace Templates:** Create workspace from template (e.g., "Agile Sprint", "Research Project")
5. **Bulk Operations:** Move/copy ideas between workspaces
6. **Version History:** View previous versions of an idea (time travel)
7. **Export/Import:** Export workspace to JSON, import from file
8. **Workspace Search:** Search across all workspaces
9. **Notifications:** Push notifications when collaborators edit shared ideas
10. **Anonymous Link Sharing:** Generate shareable link (view-only, no auth required)

**Known Limitations:**
- Firebase Realtime Database queries are limited (no complex filtering) - We filter locally in Dexie
- Free tier bandwidth limit (10GB/month) - Should be sufficient for text-based app with reasonable usage
- Conflict resolution is field-level, not character-level (for descriptions) - Good enough for typical use
- No offline conflict resolution UI preview - User sees conflict dialog only after coming online

## Dependencies

**Production Dependencies:**
```json
{
  "firebase": "^10.x",
  "@angular/fire": "^17.x"
}
```

**No Additional Dev Dependencies Required**

**External Services:**
- Firebase project (free tier)
- GitHub OAuth app (for authentication)

## Security Considerations

**Data Privacy:**
- User data stored in Firebase Realtime Database (cloud-hosted by Google)
- Data encrypted in transit (HTTPS/WSS)
- Data encrypted at rest (Firebase default)
- No end-to-end encryption (Firebase has access)

**Authentication:**
- GitHub OAuth (delegated to GitHub)
- Firebase handles token management
- Tokens expire after 1 hour, auto-refreshed

**Authorization:**
- Firebase Security Rules enforce access control (server-side)
- Users can only access their own data + shared workspaces
- No public access to any data

**Client-Side Validation:**
- Sanitize all user input (XSS prevention)
- Validate data structure before syncing
- Enforce character limits

**Server-Side Validation:**
- Firebase Rules validate schema (`.validate`)
- Enforce access permissions (`.read`, `.write`)
- Prevent unauthorized data access

## Deployment

**Firebase Deployment:**
1. Deploy Firebase Security Rules:
   ```bash
   firebase deploy --only database:rules
   ```
2. No backend code to deploy (Firebase Realtime Database is serverless)

**Frontend Deployment:**
- Existing GitHub Pages deployment remains unchanged
- Add Firebase config to `environment.prod.ts`
- Firebase SDK loads from CDN (no self-hosting needed)

**Environment Variables:**
```typescript
// environment.prod.ts
export const environment = {
  production: true,
  firebase: {
    apiKey: "...",
    authDomain: "mind-dump-angular.firebaseapp.com",
    databaseURL: "https://mind-dump-angular.firebaseio.com",
    projectId: "mind-dump-angular",
    storageBucket: "mind-dump-angular.appspot.com",
    messagingSenderId: "...",
    appId: "..."
  }
};
```

## Rollback Plan

**If Phase 1 needs to be rolled back:**
1. Remove Firebase SDK from `package.json`
2. Remove `AuthService`, `SyncService`, `FirebaseService`
3. Remove auth UI components (SignInButton, MergeDialog, ConflictDialog)
4. Revert Dexie schema to v3 (or keep v4, ignore new fields)
5. Remove Firebase config from environment files
6. App reverts to local-only mode (original functionality)

**User Impact:**
- Users who signed in: Lose sync capability, but local data intact
- Users who didn't sign in: No impact (never saw auth features)

## Conclusion

This design provides a robust foundation for cross-device sync using Firebase Realtime Database with intelligent conflict resolution. Phase 1 delivers personal sync for individual users, while Phase 2 enables true multi-user collaboration with workspace sharing. The architecture is local-first, ensuring the app remains fast and works offline, while adding cloud sync as a non-blocking enhancement.

The phased approach allows for iterative development and validation, with clear success criteria and rollback options. Firebase's free tier is sufficient for typical use, and the security model ensures data privacy and access control.
