// src/app/core/models/idea.model.ts
export interface Idea {
  id: string;
  title: string;
  description: string;
  keywords: string[];
  status: IdeaStatus;
  priority: IdeaPriority;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  attachments?: string[];
}

export type IdeaStatus = 'new' | 'active' | 'completed' | 'archived';
export type IdeaPriority = 'low' | 'medium' | 'high';

export type CreateIdeaData = Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateIdeaData = Partial<Omit<Idea, 'id' | 'createdAt' | 'updatedAt'>>;
