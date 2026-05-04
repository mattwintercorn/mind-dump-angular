// src/app/core/services/idea.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { IdeaService } from './idea.service';
import { DatabaseService } from './database.service';
import { ColorService } from './color.service';
import { SyncService } from './sync.service';
import { AuthService } from './auth.service';
import { WorkspaceService } from './workspace.service';
import { CreateIdeaData } from '../models/idea.model';
import Dexie from 'dexie';
import indexedDB from 'fake-indexeddb';
import IDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';
import { signal } from '@angular/core';

describe('IdeaService', () => {
  let service: IdeaService;
  let db: DatabaseService;
  let mockSyncService: any;
  let mockAuthService: any;
  let mockWorkspaceService: any;

  beforeEach(() => {
    // Configure Dexie to use fake-indexeddb
    Dexie.dependencies.indexedDB = indexedDB;
    Dexie.dependencies.IDBKeyRange = IDBKeyRange;

    // Create mock SyncService
    mockSyncService = {
      queueChange: jasmine.createSpy('queueChange')
    };

    // Create mock AuthService
    mockAuthService = {
      isAuthenticated: jasmine.createSpy('isAuthenticated').and.returnValue(false),
      currentUser: jasmine.createSpy('currentUser').and.returnValue(null)
    };

    // Create mock WorkspaceService with default active workspace
    mockWorkspaceService = {
      activeWorkspace: signal({ id: 'local-default', name: 'Default' })
    };

    TestBed.configureTestingModule({
      providers: [
        IdeaService, 
        DatabaseService, 
        ColorService,
        { provide: SyncService, useValue: mockSyncService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: WorkspaceService, useValue: mockWorkspaceService }
      ]
    });
    service = TestBed.inject(IdeaService);
    db = TestBed.inject(DatabaseService);
  });

  afterEach(async () => {
    await db.ideas.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty ideas', () => {
    expect(service.ideas().length).toBe(0);
  });

  it('should add idea and update signal', async () => {
    const data: CreateIdeaData = {
      title: 'Test Idea',
      description: 'Test description',
      keywords: ['test', 'angular'],
      status: 'new',
      priority: 'medium',
      color: '#3B82F6'
    };

    const id = await service.addIdea(data);

    expect(id).toBeDefined();
    expect(service.ideas().length).toBe(1);
    expect(service.ideas()[0].title).toBe('Test Idea');
    expect(service.ideas()[0].id).toBe(id);
  });

  it('should update idea and refresh signal', async () => {
    const data: CreateIdeaData = {
      title: 'Original Title',
      description: 'Original description',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    };

    const id = await service.addIdea(data);
    await service.updateIdea(id, { title: 'Updated Title' });

    const updated = service.ideas()[0];
    expect(updated.title).toBe('Updated Title');
    expect(updated.description).toBe('Original description');
  });

  it('should delete idea and update signal', async () => {
    const data: CreateIdeaData = {
      title: 'To Delete',
      description: '',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    };

    const id = await service.addIdea(data);
    expect(service.ideas().length).toBe(1);

    await service.deleteIdea(id);
    expect(service.ideas().length).toBe(0);
  });

  it('should get idea by id', async () => {
    const data: CreateIdeaData = {
      title: 'Find Me',
      description: '',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    };

    const id = await service.addIdea(data);
    const found = await service.getIdea(id);

    expect(found).toBeDefined();
    expect(found?.title).toBe('Find Me');
  });

  it('should return null for non-existent id', async () => {
    const found = await service.getIdea('non-existent-id');
    expect(found).toBeUndefined();
  });

  it('should compute idea count', async () => {
    expect(service.ideaCount()).toBe(0);

    await service.addIdea({
      title: 'Idea 1',
      description: '',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    });

    expect(service.ideaCount()).toBe(1);

    await service.addIdea({
      title: 'Idea 2',
      description: '',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    });

    expect(service.ideaCount()).toBe(2);
  });

  it('should compute all keywords', async () => {
    await service.addIdea({
      title: 'Idea 1',
      description: '',
      keywords: ['typescript', 'angular'],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    });

    await service.addIdea({
      title: 'Idea 2',
      description: '',
      keywords: ['angular', 'rxjs'],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    });

    const keywords = service.allKeywords();
    expect(keywords.length).toBe(3);
    expect(keywords).toContain('typescript');
    expect(keywords).toContain('angular');
    expect(keywords).toContain('rxjs');
  });

  it('should set loading state during operations', async () => {
    const addPromise = service.addIdea({
      title: 'Test',
      description: '',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    });

    // Loading should be true during operation
    expect(service.loading()).toBe(true);

    await addPromise;

    // Loading should be false after operation
    expect(service.loading()).toBe(false);
  });

  it('should auto-generate color from first keyword', async () => {
    const colorService = TestBed.inject(ColorService);
    const expectedColor = colorService.getKeywordColor('testing');

    const id = await service.addIdea({
      title: 'Test',
      description: '',
      keywords: ['testing', 'other'],
      status: 'new',
      priority: 'low',
      color: '' // Empty color should trigger auto-generation
    });

    const idea = service.ideas()[0];
    expect(idea.color).toBe(expectedColor);
  });

  it('should queue sync after creating idea', async () => {
    const id = await service.addIdea({
      title: 'Test Sync Idea',
      description: 'Testing sync',
      keywords: ['sync'],
      status: 'new',
      priority: 'medium',
      color: '#3B82F6'
    });

    expect(mockSyncService.queueChange).toHaveBeenCalledTimes(1);
    const call = mockSyncService.queueChange.calls.mostRecent();
    const change = call.args[0];
    
    expect(change.type).toBe('create');
    expect(change.entity).toBe('idea');
    expect(change.id).toBe(id);
    expect(change.workspaceId).toBeDefined();
    expect(change.timestamp).toBeDefined();
    expect(change.data).toBeDefined();
  });

  it('should queue sync after updating idea', async () => {
    const id = await service.addIdea({
      title: 'Original',
      description: 'Original description',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    });

    // Reset spy to only count update call
    mockSyncService.queueChange.calls.reset();
    
    await service.updateIdea(id, { title: 'Updated' });

    expect(mockSyncService.queueChange).toHaveBeenCalledTimes(1);
    const call = mockSyncService.queueChange.calls.mostRecent();
    const change = call.args[0];
    
    expect(change.type).toBe('update');
    expect(change.entity).toBe('idea');
    expect(change.id).toBe(id);
    expect(change.workspaceId).toBeDefined();
    expect(change.timestamp).toBeDefined();
    expect(change.data).toBeDefined();
  });

  it('should queue sync after deleting idea', async () => {
    const id = await service.addIdea({
      title: 'To Delete',
      description: '',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    });

    // Reset spy to only count delete call
    mockSyncService.queueChange.calls.reset();
    
    await service.deleteIdea(id);

    expect(mockSyncService.queueChange).toHaveBeenCalledTimes(1);
    const call = mockSyncService.queueChange.calls.mostRecent();
    const change = call.args[0];
    
    expect(change.type).toBe('delete');
    expect(change.entity).toBe('idea');
    expect(change.id).toBe(id);
    expect(change.workspaceId).toBeDefined();
    expect(change.timestamp).toBeDefined();
  });

  describe('Workspace Filtering (Task 7)', () => {
    it('should filter ideas by active workspace', async () => {
      // Set active workspace
      mockWorkspaceService.activeWorkspace.set({ id: 'workspace-1', name: 'Workspace 1' });

      // Add ideas to different workspaces directly to DB
      await db.ideas.add({
        id: 'idea-1',
        title: 'Workspace 1 Idea',
        description: '',
        keywords: [],
        status: 'new',
        priority: 'low',
        color: '#3B82F6',
        createdAt: new Date(),
        updatedAt: new Date(),
        workspaceId: 'workspace-1',
        version: 1,
        createdBy: 'anonymous',
        lastModifiedBy: 'anonymous'
      });

      await db.ideas.add({
        id: 'idea-2',
        title: 'Workspace 2 Idea',
        description: '',
        keywords: [],
        status: 'new',
        priority: 'low',
        color: '#3B82F6',
        createdAt: new Date(),
        updatedAt: new Date(),
        workspaceId: 'workspace-2',
        version: 1,
        createdBy: 'anonymous',
        lastModifiedBy: 'anonymous'
      });

      // Reload ideas (should filter by active workspace)
      await (service as any).loadIdeas();

      // Should only have idea from workspace-1
      expect(service.ideas().length).toBe(1);
      expect(service.ideas()[0].workspaceId).toBe('workspace-1');
    });

    it('should reload ideas when workspace changes', async () => {
      // Set up spy on private loadIdeas method
      spyOn(service as any, 'loadIdeas').and.callThrough();

      // Add ideas to different workspaces
      await db.ideas.add({
        id: 'idea-1',
        title: 'Workspace 1 Idea',
        description: '',
        keywords: [],
        status: 'new',
        priority: 'low',
        color: '#3B82F6',
        createdAt: new Date(),
        updatedAt: new Date(),
        workspaceId: 'workspace-1',
        version: 1,
        createdBy: 'anonymous',
        lastModifiedBy: 'anonymous'
      });

      await db.ideas.add({
        id: 'idea-2',
        title: 'Workspace 2 Idea',
        description: '',
        keywords: [],
        status: 'new',
        priority: 'low',
        color: '#3B82F6',
        createdAt: new Date(),
        updatedAt: new Date(),
        workspaceId: 'workspace-2',
        version: 1,
        createdBy: 'anonymous',
        lastModifiedBy: 'anonymous'
      });

      // Change active workspace
      mockWorkspaceService.activeWorkspace.set({ id: 'workspace-2', name: 'Workspace 2' });

      // Wait for effect to trigger
      await new Promise(resolve => setTimeout(resolve, 10));

      // loadIdeas should have been called when workspace changed
      expect((service as any).loadIdeas).toHaveBeenCalled();
    });

    it('should set workspaceId on new ideas', async () => {
      mockWorkspaceService.activeWorkspace.set({ id: 'workspace-test', name: 'Test Workspace' });

      const id = await service.addIdea({
        title: 'Test Idea',
        description: '',
        keywords: [],
        status: 'new',
        priority: 'low',
        color: '#3B82F6'
      });

      const idea = await service.getIdea(id);
      expect(idea?.workspaceId).toBe('workspace-test');
    });

    it('should return empty array when no active workspace', async () => {
      // No active workspace set (null)
      mockWorkspaceService.activeWorkspace.set(null);

      // Add some ideas with workspaceIds
      await db.ideas.add({
        id: 'idea-1',
        title: 'Some Idea',
        description: '',
        keywords: [],
        status: 'new',
        priority: 'low',
        color: '#3B82F6',
        createdAt: new Date(),
        updatedAt: new Date(),
        workspaceId: 'workspace-1',
        version: 1,
        createdBy: 'anonymous',
        lastModifiedBy: 'anonymous'
      });

      await (service as any).loadIdeas();

      // Should not load any ideas when no workspace is active
      expect(service.ideas().length).toBe(0);
    });
  });
});
