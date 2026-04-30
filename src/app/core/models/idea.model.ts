export type IdeaStatus = 'active' | 'archived' | 'implemented';
export type IdeaPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Idea {
  id: string;
  title: string;
  description: string;
  status: IdeaStatus;
  priority: IdeaPriority;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  connections?: string[]; // IDs of connected ideas
  metadata?: {
    estimatedEffort?: number;
    actualEffort?: number;
    completedAt?: Date;
    [key: string]: any;
  };
}
