# Code Reference: Firebase Paths

Quick reference for developers working with Firebase sync in Mind Dump Angular.

## Import Statements

```typescript
import { ref, get, set, onValue, off } from 'firebase/database';
import { FirebaseService } from './firebase.service';
```

## Path Constants

### Reading Data

```typescript
// Get workspace metadata
const workspaceRef = ref(db, `workspaces/${workspaceId}`);
const snapshot = await get(workspaceRef);

// Get all ideas in workspace
const ideasRef = ref(db, `workspaces/${workspaceId}/ideas`);
const ideasSnapshot = await get(ideasRef);

// Get specific idea
const ideaRef = ref(db, `workspaces/${workspaceId}/ideas/${ideaId}`);
const ideaSnapshot = await get(ideaRef);

// Get user's workspaces
const userWorkspacesRef = ref(db, `users/${userId}/workspaces`);
const workspacesSnapshot = await get(userWorkspacesRef);
```

### Writing Data

```typescript
// Create/update workspace
await set(ref(db, `workspaces/${workspaceId}`), workspaceData);

// Create/update idea
await set(ref(db, `workspaces/${workspaceId}/ideas/${ideaId}`), ideaData);

// Delete idea (set to null)
await set(ref(db, `workspaces/${workspaceId}/ideas/${ideaId}`), null);

// Add user to workspace members
await set(ref(db, `workspaces/${workspaceId}/members/${userId}`), 'editor');

// Update user's workspace list
await set(ref(db, `users/${userId}/workspaces/${workspaceId}`), true);
```

### Real-Time Listeners

```typescript
// Listen to all ideas in workspace
const ideasRef = ref(db, `workspaces/${workspaceId}/ideas`);
const unsubscribe = onValue(ideasRef, (snapshot) => {
  const ideas = snapshot.val();
  // Process ideas...
});

// Clean up listener
off(ideasRef);
unsubscribe();
```

## SyncService Methods

### getFirebasePath

**Location:** `src/app/core/services/sync.service.ts`

```typescript
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
```

**Usage:**
- Called by `uploadChange()` when syncing local changes to Firebase
- Returns the canonical Firebase path for any entity type
- All writes MUST use this method to ensure consistent paths

### startListeningToWorkspace

**Location:** `src/app/core/services/sync.service.ts`

```typescript
startListeningToWorkspace(workspaceId: string): void {
  const ideasPath = `workspaces/${workspaceId}/ideas`;
  const ideasRef = ref(this.firebaseService.database, ideasPath);
  
  const unsubscribe = onValue(ideasRef, async (snapshot) => {
    // Handle remote changes...
  });
  
  this.workspaceListeners.set(workspaceId, {
    ref: ideasRef,
    unsubscribe
  });
}
```

**Usage:**
- Called when switching to a workspace
- Sets up real-time listener for all ideas
- Detects adds, updates, and deletes
- Triggers UI reload after processing changes

## Common Patterns

### Creating a New Idea

```typescript
// 1. Save to local Dexie first (offline-first)
await this.db.ideas.put(idea);

// 2. Queue sync change
this.syncService.queueChange({
  type: 'create',
  entity: 'idea',
  id: idea.id,
  workspaceId: idea.workspaceId,
  timestamp: new Date(),
  data: idea
});

// 3. SyncService automatically uploads to:
// → workspaces/{workspaceId}/ideas/{ideaId}
```

### Updating an Idea

```typescript
// 1. Update local first
await this.db.ideas.update(id, {
  ...updates,
  version: currentVersion + 1,  // Increment version!
  updatedAt: new Date()
});

// 2. Queue sync
this.syncService.queueChange({
  type: 'update',
  entity: 'idea',
  id,
  workspaceId,
  timestamp: new Date(),
  data: updatedIdea
});
```

### Deleting an Idea

```typescript
// 1. Delete from local
await this.db.ideas.delete(id);

// 2. Queue sync (data is null for deletes)
this.syncService.queueChange({
  type: 'delete',
  entity: 'idea',
  id,
  workspaceId,
  timestamp: new Date(),
  data: null  // null = delete operation
});

// 3. Firebase path will be set to null:
// → workspaces/{workspaceId}/ideas/{ideaId}: null
```

### Handling Remote Changes

```typescript
// Listener receives snapshot
const ideas = snapshot.val();  // Object of ideas

// Process each idea
for (const [ideaId, ideaData] of Object.entries(ideas)) {
  // Compare versions
  const localIdea = await this.db.ideas.get(ideaId);
  
  if (!localIdea) {
    // New idea from remote
    await this.db.ideas.put(ideaData);
  } else if (ideaData.version > localIdea.version) {
    // Remote is newer, accept update
    await this.db.ideas.put(ideaData);
  }
  // If local is newer, keep local (shouldn't happen normally)
}

// Detect deletions
const remoteIds = new Set(Object.keys(ideas));
const localIdeas = await this.db.ideas.where('workspaceId').equals(workspaceId).toArray();
const deleted = localIdeas.filter(idea => !remoteIds.has(idea.id));

for (const idea of deleted) {
  await this.db.ideas.delete(idea.id);
}
```

## Path Validation Checklist

When adding new entity types or modifying sync logic:

- [ ] Update `getFirebasePath()` switch statement
- [ ] Update listener in `startListeningToWorkspace()`
- [ ] Update `database.rules.json` with new path rules
- [ ] Deploy security rules to Firebase
- [ ] Update TypeScript interfaces in `src/app/core/models/`
- [ ] Update this documentation
- [ ] Update `docs/FIREBASE_DATA_STRUCTURE.md`

## Common Mistakes

### ❌ Using Flat Paths (Old Structure)

```typescript
// WRONG - This was the old structure
const path = `ideas/${workspaceId}/${ideaId}`;
```

### ✅ Using Nested Paths (Current Structure)

```typescript
// CORRECT - Current nested structure
const path = `workspaces/${workspaceId}/ideas/${ideaId}`;
```

### ❌ Hardcoding Paths

```typescript
// WRONG - Hardcoded path
await set(ref(db, `ideas/${workspaceId}/${id}`), data);
```

### ✅ Using getFirebasePath

```typescript
// CORRECT - Use helper method
const path = this.getFirebasePath({
  entity: 'idea',
  workspaceId,
  id
});
await set(ref(db, path), data);
```

### ❌ Forgetting workspaceId

```typescript
// WRONG - Missing workspace context
const idea: Idea = {
  id: uuid(),
  title: 'My Idea',
  // Missing workspaceId!
};
```

### ✅ Always Include workspaceId

```typescript
// CORRECT - Include workspace context
const idea: Idea = {
  id: uuid(),
  title: 'My Idea',
  workspaceId: this.workspaceService.activeWorkspace()!.id,
  // ... other fields
};
```

## Debugging Firebase Paths

### Console Commands

```javascript
// Check what's at a specific path
const snapshot = await get(ref(firebase.database(), 'workspaces/YOUR_WORKSPACE_ID/ideas'));
console.log(snapshot.val());

// Check listener path
window.debugFirebase.diagnostics()

// Verify security rules
const testPath = 'workspaces/YOUR_WORKSPACE_ID/ideas/TEST_ID';
try {
  await set(ref(firebase.database(), testPath), { test: true });
  console.log('✅ Write succeeded');
} catch (err) {
  console.error('❌ Write failed:', err.message);
}
```

### Firebase Console Inspection

1. Open https://console.firebase.google.com
2. Select your project
3. Go to Realtime Database → Data
4. Navigate to: `workspaces/{your-workspace-id}/ideas`
5. Verify ideas are stored there (not at `/ideas/`)

## Related Files

- `src/app/core/services/sync.service.ts` - Main sync logic
- `src/app/core/services/idea.service.ts` - Idea CRUD operations
- `src/app/core/services/workspace.service.ts` - Workspace management
- `src/app/core/services/firebase.service.ts` - Firebase initialization
- `database.rules.json` - Security rules
- `docs/FIREBASE_DATA_STRUCTURE.md` - Complete schema documentation

---

**Last Updated:** 2026-05-05  
**Structure Version:** 2.0 (Nested)
