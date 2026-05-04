export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  isDefault: boolean;
  members?: WorkspaceMembers; // Optional for Phase 2
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
