// src/app/core/models/connection.model.ts
export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  bidirectional: boolean;
  createdAt: Date;
  workspaceId?: string;
}

export type CreateConnectionData = Omit<Connection, 'id' | 'createdAt' | 'workspaceId'>;
