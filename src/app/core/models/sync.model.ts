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
