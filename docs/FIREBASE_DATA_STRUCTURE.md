# Firebase Data Structure

## Overview

Mind Dump Angular uses Firebase Realtime Database with a **nested structure** where all workspace-related data is organized under `/workspaces/{workspaceId}/`.

This document defines the canonical data structure for all Firebase paths and entities.

---

## Root Structure

```
/users/
  {userId}/
    profile/
    workspaces/

/workspaces/
  {workspaceId}/
    [metadata]
    members/
    ideas/
    connections/
    components/
    projects/
```

---

## Detailed Schema

### 1. User Profile (`/users/{userId}/profile/`)

```typescript
{
  uid: string;              // Firebase Auth user ID
  email: string;            // User email
  displayName: string;      // User display name
  photoURL?: string;        // Profile photo URL
  createdAt: string;        // ISO 8601 timestamp
  updatedAt: string;        // ISO 8601 timestamp
}
```

**Access Control:**
- Read: Own profile only (`auth.uid === userId`)
- Write: Own profile only (`auth.uid === userId`)

---

### 2. User Workspaces Map (`/users/{userId}/workspaces/`)

```typescript
{
  [workspaceId]: true       // Boolean flag indicating access
}
```

**Purpose:** Quick lookup of all workspaces a user has access to (owned or shared).

**Access Control:**
- Read: Own workspaces only (`auth.uid === userId`)
- Write: Own workspaces only (`auth.uid === userId`)

---

### 3. Workspace Metadata (`/workspaces/{workspaceId}/`)

```typescript
{
  id: string;               // UUID v4
  name: string;             // Workspace name
  ownerId: string;          // User ID of workspace owner
  isDefault: boolean;       // Whether this is user's default workspace
  createdAt: string;        // ISO 8601 timestamp
  updatedAt: string;        // ISO 8601 timestamp
  members?: {               // Optional: collaborators
    [userId]: "editor" | "viewer"
  }
}
```

**Access Control:**
- Read: Owner OR member (`ownerId === auth.uid` OR `members/{auth.uid}` exists)
- Write: Owner only (`ownerId === auth.uid`)

**Notes:**
- `isDefault` can be true for only ONE workspace per user
- Members map omitted if workspace has no collaborators

---

### 4. Ideas (`/workspaces/{workspaceId}/ideas/{ideaId}/`)

```typescript
{
  id: string;               // UUID v4
  title: string;            // Idea title (required)
  description: string;      // Idea description (can be empty)
  keywords: string[];       // Array of keyword strings
  status: "new" | "active" | "completed" | "archived";
  priority: "low" | "medium" | "high";
  color: string;            // Hex color code (e.g., "#6366F1")
  component?: string;       // Optional: system component name
  project?: string;         // Optional: project name
  workspaceId: string;      // Parent workspace ID
  version: number;          // Optimistic locking version (starts at 1)
  createdBy: string;        // User ID who created the idea
  lastModifiedBy: string;   // User ID who last modified
  createdAt: string;        // ISO 8601 timestamp
  updatedAt: string;        // ISO 8601 timestamp
  attachments?: string[];   // Optional: array of attachment URLs
}
```

**Access Control:**
- Read: Owner OR member of workspace
- Write: Owner OR member with 'editor' role

**Notes:**
- `keywords` must always be an array (empty array if no keywords)
- `version` increments on each update for conflict detection
- `color` auto-generated from first keyword if not provided

---

### 5. Connections (`/workspaces/{workspaceId}/connections/{connectionId}/`)

```typescript
{
  id: string;               // UUID v4
  sourceId: string;         // Idea ID (source of connection)
  targetId: string;         // Idea ID (target of connection)
  type?: string;            // Optional: connection type
  workspaceId: string;      // Parent workspace ID
  createdAt: string;        // ISO 8601 timestamp
  createdBy: string;        // User ID who created
}
```

**Access Control:**
- Read: Owner OR member of workspace
- Write: Owner OR member with 'editor' role

**Notes:**
- Connections are directional (source → target)
- Both sourceId and targetId must reference ideas in same workspace

---

### 6. Components (`/workspaces/{workspaceId}/components/{componentId}/`)

```typescript
{
  id: string;               // UUID v4
  name: string;             // Component name (e.g., "Auth System")
  description?: string;     // Optional description
  workspaceId: string;      // Parent workspace ID
  createdAt: string;        // ISO 8601 timestamp
  createdBy: string;        // User ID who created
}
```

**Access Control:**
- Read: Owner OR member of workspace
- Write: Owner OR member with 'editor' role

**Notes:**
- Components represent system/architecture modules
- Used to categorize and filter ideas

---

### 7. Projects (`/workspaces/{workspaceId}/projects/{projectId}/`)

```typescript
{
  id: string;               // UUID v4
  name: string;             // Project name (e.g., "Mobile App Redesign")
  description?: string;     // Optional description
  workspaceId: string;      // Parent workspace ID
  status?: string;          // Optional: project status
  createdAt: string;        // ISO 8601 timestamp
  createdBy: string;        // User ID who created
}
```

**Access Control:**
- Read: Owner OR member of workspace
- Write: Owner OR member with 'editor' role

**Notes:**
- Projects group related ideas together
- Used to organize work by initiative/milestone

---

## Path Patterns

### Canonical Paths

All Firebase operations use these path patterns:

```typescript
// Workspace metadata
`/workspaces/{workspaceId}`

// Workspace entities (nested under workspace)
`/workspaces/{workspaceId}/ideas/{ideaId}`
`/workspaces/{workspaceId}/connections/{connectionId}`
`/workspaces/{workspaceId}/components/{componentId}`
`/workspaces/{workspaceId}/projects/{projectId}`

// User data
`/users/{userId}/profile`
`/users/{userId}/workspaces/{workspaceId}`
```

### Code Reference

**Upload Path** (SyncService.getFirebasePath):
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

**Listener Path** (SyncService.startListeningToWorkspace):
```typescript
const ideasPath = `workspaces/${workspaceId}/ideas`;
const ideasRef = ref(this.firebaseService.database, ideasPath);
```

---

## Why Nested Structure?

### Advantages

1. **Data Isolation**
   - All workspace data lives under one path
   - Easy to query all entities for a workspace
   - Clear data ownership hierarchy

2. **Easier Management**
   - Delete workspace = delete one node (cascading delete)
   - Backup/restore workspace by exporting single path
   - Simpler security rules (check parent workspace access)

3. **Intuitive Mental Model**
   - Matches object-oriented thinking
   - Clear parent-child relationships
   - Reduces cognitive load

4. **Performance Benefits**
   - Single listener can watch all workspace changes
   - Fewer database rules to evaluate
   - Better query locality

5. **Prevents Orphaned Data**
   - No orphaned ideas/connections after workspace deletion
   - Referential integrity maintained by structure
   - Cleanup happens automatically

### Trade-offs

**Pros:**
- ✅ Better organization and data locality
- ✅ Simpler security rules
- ✅ Cascading deletes built-in
- ✅ Clear ownership model

**Cons:**
- ⚠️ Slightly deeper path depth (minimal impact)
- ⚠️ Cannot query ideas across all workspaces (intentional isolation)

---

## Migration Notes

### Previous Structure (Deprecated)

The flat structure was used initially:

```
/ideas/{workspaceId}/{ideaId}
/connections/{workspaceId}/{connectionId}
/components/{workspaceId}/{componentId}
/projects/{workspaceId}/{projectId}
```

**Migration:** Any data in the old flat structure should be migrated to the nested structure. Use `window.debugFirebase.migrateNestedIdeas()` to migrate old data.

### Breaking Changes

- **Listener Paths**: Changed from `/ideas/{workspaceId}` to `/workspaces/{workspaceId}/ideas`
- **Upload Paths**: Changed from `/ideas/{workspaceId}/{ideaId}` to `/workspaces/{workspaceId}/ideas/{ideaId}`
- **Security Rules**: Moved from top-level `/ideas/` to nested `/workspaces/{workspaceId}/ideas/`

---

## Security Rules

See `database.rules.json` for complete rules.

**Key Principles:**
1. All operations require authentication (`auth != null`)
2. Workspace-level access control (owner or member)
3. Role-based permissions (owner vs editor vs viewer)
4. No anonymous access to any data

**Rule Structure:**
```json
{
  "workspaces": {
    "$workspaceId": {
      ".read": "owner OR member",
      ".write": "owner only",
      
      "ideas": {
        ".read": "owner OR member",
        "$ideaId": {
          ".write": "owner OR editor"
        }
      }
    }
  }
}
```

---

## Best Practices

### Creating New Entities

1. **Always set `workspaceId`**: Every entity must reference its parent workspace
2. **Generate UUIDs**: Use `crypto.randomUUID()` or similar for IDs
3. **Set timestamps**: Use `new Date().toISOString()` for consistency
4. **Set creator IDs**: Track `createdBy` and `lastModifiedBy`
5. **Initialize arrays**: Empty arrays for `keywords`, `attachments`, etc.

### Updating Entities

1. **Increment version**: For optimistic locking on updates
2. **Update timestamps**: Set `updatedAt` on every change
3. **Set lastModifiedBy**: Track who made the change
4. **Batch updates**: Use transactions for related changes

### Deleting Entities

1. **Soft delete option**: Consider adding `deletedAt` timestamp instead
2. **Cascade awareness**: Understand what gets deleted automatically
3. **Cleanup orphans**: Remove related entities (connections to deleted ideas)

### Querying Data

1. **Scope to workspace**: Always filter by `workspaceId`
2. **Use indexes**: Compound indexes for complex queries
3. **Limit results**: Use `.limitToFirst()` for large datasets
4. **Cache locally**: Leverage Dexie for offline-first

---

## Testing

### Manual Testing Paths

Use Firebase Console → Realtime Database to inspect:

```
/users/{your-user-id}/workspaces/
  → Should show map of workspace IDs

/workspaces/{workspace-id}/
  → Should show workspace metadata
  → Check ownerId matches your user ID
  
/workspaces/{workspace-id}/ideas/
  → Should show all ideas in workspace
  → Verify each idea has correct structure
```

### Programmatic Testing

```javascript
// In browser console
await window.debugFirebase.diagnostics()
await window.debugFirebase.getUserWorkspaces()
await window.debugFirebase.searchForWorkspaces()
```

---

## Common Issues

### Issue: Ideas not syncing

**Diagnosis:**
1. Check listener path: Should be `/workspaces/{id}/ideas`
2. Check upload path: Should be `/workspaces/{id}/ideas/{ideaId}`
3. Verify security rules allow read/write

**Solution:** Ensure code uses nested paths consistently.

### Issue: Permission denied errors

**Diagnosis:**
1. Check if user is member of workspace
2. Verify security rules are deployed
3. Check `/users/{userId}/workspaces/` includes workspace ID

**Solution:** Add user to workspace members or fix security rules.

### Issue: Orphaned data

**Diagnosis:**
1. Check for data at old flat structure paths
2. Look for ideas without `workspaceId` field

**Solution:** Run migration script to move data to nested structure.

---

## Related Documentation

- `FIREBASE_SETUP.md` - Firebase configuration and security rules
- `database.rules.json` - Complete security rules specification
- `src/app/core/services/sync.service.ts` - Firebase sync implementation
- `src/app/core/models/` - TypeScript interfaces for all entities

---

**Last Updated:** 2026-05-05  
**Structure Version:** 2.0 (Nested)  
**Breaking Changes:** Yes (migrated from flat structure)
