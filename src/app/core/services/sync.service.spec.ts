import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SyncService } from './sync.service';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';
import { ref, set, onValue } from 'firebase/database';
import { Change } from '../models/sync.model';

describe('SyncService', () => {
  let service: SyncService;
  let authService: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        SyncService,
        FirebaseService,
        AuthService,
        DatabaseService
      ]
    });

    service = TestBed.inject(SyncService);
    authService = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with idle status and zero pending count', () => {
    expect(service.syncStatus()).toBe('idle');
    expect(service.pendingCount()).toBe(0);
  });

  it('should queue a change and increment pending count', () => {
    const change: Change = {
      type: 'create',
      entity: 'idea',
      id: 'idea-1',
      data: { title: 'Test Idea' },
      timestamp: new Date(),
      workspaceId: 'workspace-1'
    };

    service.queueChange(change);

    expect(service.pendingCount()).toBe(1);
  });

  it('should flush batch after 3 seconds', fakeAsync(() => {
    const change: Change = {
      type: 'create',
      entity: 'idea',
      id: 'idea-1',
      data: { title: 'Test Idea' },
      timestamp: new Date(),
      workspaceId: 'workspace-1'
    };

    spyOn(service as any, 'flushBatch');

    service.queueChange(change);
    
    // Should not flush immediately
    expect((service as any).flushBatch).not.toHaveBeenCalled();

    // Should flush after 3 seconds
    tick(3000);
    expect((service as any).flushBatch).toHaveBeenCalled();
  }));

  it('should reset timer when new change is queued', fakeAsync(() => {
    const change1: Change = {
      type: 'create',
      entity: 'idea',
      id: 'idea-1',
      data: { title: 'Test Idea 1' },
      timestamp: new Date(),
      workspaceId: 'workspace-1'
    };

    const change2: Change = {
      type: 'create',
      entity: 'idea',
      id: 'idea-2',
      data: { title: 'Test Idea 2' },
      timestamp: new Date(),
      workspaceId: 'workspace-1'
    };

    spyOn(service as any, 'flushBatch');

    // Queue first change
    service.queueChange(change1);
    
    // Wait 2 seconds (not enough to flush)
    tick(2000);
    
    // Queue second change (should reset timer)
    service.queueChange(change2);
    
    // Wait 2 more seconds (total 4, but timer reset at 2)
    tick(2000);
    
    // Should not have flushed yet (only 2 seconds since reset)
    expect((service as any).flushBatch).not.toHaveBeenCalled();
    
    // Wait 1 more second (3 seconds since reset)
    tick(1000);
    
    // Now it should flush
    expect((service as any).flushBatch).toHaveBeenCalled();
  }));

  it('should update sync status during flush when not authenticated', fakeAsync(() => {
    const change: Change = {
      type: 'create',
      entity: 'idea',
      id: 'idea-1',
      data: { title: 'Test Idea' },
      timestamp: new Date(),
      workspaceId: 'workspace-1'
    };

    service.queueChange(change);
    
    tick(3000);
    
    // When not authenticated, status should be offline
    expect(service.syncStatus()).toBe('offline');
  }));

  it('should clear pending count after successful flush', fakeAsync(() => {
    const change: Change = {
      type: 'create',
      entity: 'idea',
      id: 'idea-1',
      data: { title: 'Test Idea' },
      timestamp: new Date(),
      workspaceId: 'workspace-1'
    };

    // Mock authentication to be true
    spyOn(authService, 'isAuthenticated').and.returnValue(true);
    
    // Mock Firebase upload to succeed
    spyOn(service as any, 'uploadChange').and.returnValue(Promise.resolve());

    service.queueChange(change);
    
    expect(service.pendingCount()).toBe(1);
    
    tick(3000);
    
    // Wait for async operations
    tick();
    
    // After successful upload, pending count should be 0
    expect(service.pendingCount()).toBe(0);
  }));

  it('should keep changes queued when not authenticated', fakeAsync(() => {
    const change: Change = {
      type: 'create',
      entity: 'idea',
      id: 'idea-1',
      data: { title: 'Test Idea' },
      timestamp: new Date(),
      workspaceId: 'workspace-1'
    };

    service.queueChange(change);
    
    tick(3000);
    
    expect(service.syncStatus()).toBe('offline');
    expect(service.pendingCount()).toBe(1); // Change remains queued
  }));

  it('should update sync status to error on upload failure', fakeAsync(() => {
    const change: Change = {
      type: 'create',
      entity: 'idea',
      id: 'idea-1',
      data: { title: 'Test Idea' },
      timestamp: new Date(),
      workspaceId: 'workspace-1'
    };

    // Mock authentication to be true
    spyOn(authService, 'isAuthenticated').and.returnValue(true);

    // Mock Firebase operation to fail with an async function
    spyOn(service as any, 'uploadChange').and.callFake(async () => {
      throw new Error('Upload failed');
    });

    service.queueChange(change);
    
    tick(3000);
    
    // Flush microtasks to process the promise rejection
    flushMicrotasks();
    
    expect(service.syncStatus()).toBe('error');
    expect(service.pendingCount()).toBe(1); // Change remains queued on error
  }));

  it('should have stub methods for startListening and stopListening', () => {
    expect(service.startListening).toBeDefined();
    expect(service.stopListening).toBeDefined();
    
    // Should not throw when called with valid arguments
    expect(() => service.startListening('workspace-1')).not.toThrow();
    expect(() => service.stopListening('workspace-1')).not.toThrow();
  });

  describe('Conflict Detection (Task 8)', () => {
    it('should detect version conflict when local and remote versions differ', () => {
      const localIdea = {
        id: 'idea-1',
        title: 'Local Title',
        description: 'Local description',
        keywords: ['local'],
        status: 'active' as const,
        priority: 'medium' as const,
        color: '#000000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        version: 2,
        workspaceId: 'workspace-1'
      };

      const remoteIdea = {
        id: 'idea-1',
        title: 'Remote Title',
        description: 'Remote description',
        keywords: ['remote'],
        status: 'completed' as const,
        priority: 'high' as const,
        color: '#ffffff',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-03'),
        version: 3,
        workspaceId: 'workspace-1'
      };

      const conflict = (service as any).detectConflict(localIdea, remoteIdea);
      expect(conflict).toBe(true);
    });

    it('should not detect conflict when versions match', () => {
      const localIdea = {
        id: 'idea-1',
        title: 'Title',
        description: 'description',
        keywords: ['keyword'],
        status: 'active' as const,
        priority: 'medium' as const,
        color: '#000000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        version: 2,
        workspaceId: 'workspace-1'
      };

      const remoteIdea = { ...localIdea };

      const conflict = (service as any).detectConflict(localIdea, remoteIdea);
      expect(conflict).toBe(false);
    });
  });

  describe('Conflict Resolution (Task 9)', () => {
    it('should auto-merge keywords (union of both sets)', () => {
      const localIdea = {
        id: 'idea-1',
        title: 'Title',
        description: 'description',
        keywords: ['local', 'shared'],
        status: 'active' as const,
        priority: 'medium' as const,
        color: '#000000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        version: 2,
        workspaceId: 'workspace-1'
      };

      const remoteIdea = {
        id: 'idea-1',
        title: 'Title',
        description: 'description',
        keywords: ['remote', 'shared'],
        status: 'active' as const,
        priority: 'medium' as const,
        color: '#000000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-03'),
        version: 3,
        workspaceId: 'workspace-1'
      };

      const merged = (service as any).mergeKeywords(localIdea.keywords, remoteIdea.keywords);
      expect(merged.sort()).toEqual(['local', 'remote', 'shared']);
    });

    it('should use newest status on conflict (compare timestamps)', () => {
      const localIdea = {
        id: 'idea-1',
        title: 'Title',
        description: 'description',
        keywords: ['keyword'],
        status: 'active' as const,
        priority: 'medium' as const,
        color: '#000000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        version: 2,
        workspaceId: 'workspace-1'
      };

      const remoteIdea = {
        id: 'idea-1',
        title: 'Title',
        description: 'description',
        keywords: ['keyword'],
        status: 'completed' as const,
        priority: 'medium' as const,
        color: '#000000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-03'),
        version: 3,
        workspaceId: 'workspace-1'
      };

      const merged = (service as any).mergeMetadata(localIdea, remoteIdea, 'status');
      expect(merged).toBe('completed'); // Remote is newer
    });

    it('should flag title conflict for manual resolution (return true when different)', () => {
      const localIdea = {
        id: 'idea-1',
        title: 'Local Title',
        description: 'Same description',
        keywords: ['keyword'],
        status: 'active' as const,
        priority: 'medium' as const,
        color: '#000000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        version: 2,
        workspaceId: 'workspace-1'
      };

      const remoteIdea = {
        id: 'idea-1',
        title: 'Remote Title',
        description: 'Same description',
        keywords: ['keyword'],
        status: 'active' as const,
        priority: 'medium' as const,
        color: '#000000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-03'),
        version: 3,
        workspaceId: 'workspace-1'
      };

      const needsManual = (service as any).needsManualResolution('title', localIdea.title, remoteIdea.title);
      expect(needsManual).toBe(true);
    });

    it('should not flag conflict when title is same', () => {
      const needsManual = (service as any).needsManualResolution('title', 'Same Title', 'Same Title');
      expect(needsManual).toBe(false);
    });

    it('should resolve conflicts automatically when possible', () => {
      const localIdea = {
        id: 'idea-1',
        title: 'Same Title',
        description: 'Same description',
        keywords: ['local', 'shared'],
        status: 'active' as const,
        priority: 'medium' as const,
        color: '#000000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        version: 2,
        workspaceId: 'workspace-1'
      };

      const remoteIdea = {
        id: 'idea-1',
        title: 'Same Title',
        description: 'Same description',
        keywords: ['remote', 'shared'],
        status: 'completed' as const,
        priority: 'high' as const,
        color: '#000000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-03'),
        version: 3,
        workspaceId: 'workspace-1'
      };

      const resolved = (service as any).resolveConflict(localIdea, remoteIdea);
      
      expect(resolved).toBeTruthy();
      expect(resolved.keywords.sort()).toEqual(['local', 'remote', 'shared']);
      expect(resolved.status).toBe('completed'); // Remote is newer
      expect(resolved.priority).toBe('high'); // Remote is newer
    });

    it('should return null when manual resolution is needed', () => {
      const localIdea = {
        id: 'idea-1',
        title: 'Local Title',
        description: 'Local description',
        keywords: ['keyword'],
        status: 'active' as const,
        priority: 'medium' as const,
        color: '#000000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        version: 2,
        workspaceId: 'workspace-1'
      };

      const remoteIdea = {
        id: 'idea-1',
        title: 'Remote Title',
        description: 'Remote description',
        keywords: ['keyword'],
        status: 'active' as const,
        priority: 'medium' as const,
        color: '#000000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-03'),
        version: 3,
        workspaceId: 'workspace-1'
      };

      const resolved = (service as any).resolveConflict(localIdea, remoteIdea);
      expect(resolved).toBeNull();
    });
  });

  describe('Inbound Listeners (Task 8)', () => {
    it('should start listening to Firebase changes', () => {
      const workspaceId = 'workspace-1';
      
      spyOn(authService, 'isAuthenticated').and.returnValue(true);
      
      service.startListening(workspaceId);
      
      // Check that listeners Map has an entry for this workspace
      expect((service as any).listeners.has(workspaceId)).toBe(true);
    });

    it('should stop listening when requested', () => {
      const workspaceId = 'workspace-1';
      
      spyOn(authService, 'isAuthenticated').and.returnValue(true);
      
      service.startListening(workspaceId);
      expect((service as any).listeners.has(workspaceId)).toBe(true);
      
      service.stopListening(workspaceId);
      
      // Check that listeners Map is cleared
      expect((service as any).listeners.has(workspaceId)).toBe(false);
    });

    it('should not start listening when not authenticated', () => {
      const workspaceId = 'workspace-1';
      
      spyOn(authService, 'isAuthenticated').and.returnValue(false);
      
      service.startListening(workspaceId);
      
      // Should not have any listeners when not authenticated
      expect((service as any).listeners.has(workspaceId)).toBe(false);
    });

    it('should handle remote idea creation', fakeAsync(() => {
      const workspaceId = 'workspace-1';
      const remoteIdea = {
        id: 'idea-1',
        title: 'Remote Idea',
        version: 1,
        updatedAt: new Date().toISOString()
      };
      
      spyOn(authService, 'isAuthenticated').and.returnValue(true);
      const databaseService = TestBed.inject(DatabaseService);
      spyOn(databaseService, 'getIdea').and.returnValue(Promise.resolve(undefined));
      spyOn(databaseService, 'saveIdea').and.returnValue(Promise.resolve());
      
      // Call handleRemoteIdea directly
      (service as any).handleRemoteIdea(remoteIdea, workspaceId);
      
      tick();
      
      // Verify that the new idea was saved to the database
      expect(databaseService.saveIdea).toHaveBeenCalledWith(remoteIdea);
    }));

    it('should cleanup all listeners on stopListening without workspaceId', () => {
      const workspaceId1 = 'workspace-1';
      const workspaceId2 = 'workspace-2';
      
      spyOn(authService, 'isAuthenticated').and.returnValue(true);
      
      service.startListening(workspaceId1);
      service.startListening(workspaceId2);
      
      expect((service as any).listeners.size).toBe(2);
      
      service.stopListening();
      
      expect((service as any).listeners.size).toBe(0);
    });
  });
});
