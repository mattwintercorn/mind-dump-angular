export type ConnectionType = 
  | 'related'      // General relationship
  | 'blocks'       // This idea blocks another
  | 'blocked-by'   // This idea is blocked by another
  | 'parent'       // Parent-child relationship
  | 'child'        // Child-parent relationship
  | 'duplicate'    // Potential duplicate
  | 'alternative'; // Alternative approach

export interface Connection {
  id: string;
  sourceId: string;  // ID of the source idea
  targetId: string;  // ID of the target idea
  type: ConnectionType;
  description?: string;
  createdAt: Date;
  metadata?: {
    strength?: number; // 1-10 scale of relationship strength
    [key: string]: any;
  };
}
