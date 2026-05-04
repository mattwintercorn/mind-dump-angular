import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { signal } from '@angular/core';
import { SyncService } from './sync.service';
import { FirebaseService } from './firebase.service';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';
import { ref, set } from 'firebase/database';
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
    
    // Should not throw
    expect(() => service.startListening()).not.toThrow();
    expect(() => service.stopListening()).not.toThrow();
  });
});
