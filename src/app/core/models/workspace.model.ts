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
