// src/app/core/models/idea.model.ts
export interface Idea {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  status: IdeaStatus;
  priority: IdeaPriority;
  color: string;
  component?: string; // System component this idea relates to
  project?: string; // Project this idea belongs to
  createdAt: Date;
  updatedAt: Date;
  attachments?: string[];
  // Sync fields for Firebase integration (optional during migration)
  workspaceId?: string;
  version?: number;
  createdBy?: string;
  lastModifiedBy?: string;
}

export type IdeaStatus = 'new' | 'active' | 'completed' | 'archived';
export type IdeaPriority = 'low' | 'medium' | 'high';

export type CreateIdeaData = Omit<Idea, 'id' | 'color' | 'createdAt' | 'updatedAt' | 'workspaceId' | 'version' | 'createdBy' | 'lastModifiedBy'> & {
  color?: string;
  workspaceId?: string; // Optional - will use active workspace if not provided
};
// version, createdBy, lastModifiedBy incremented/updated automatically by service
export type UpdateIdeaData = Partial<Omit<Idea, 'id' | 'createdAt' | 'updatedAt' | 'workspaceId' | 'version' | 'createdBy' | 'lastModifiedBy'>>;
