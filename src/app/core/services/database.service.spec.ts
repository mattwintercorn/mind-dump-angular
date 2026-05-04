// src/app/core/services/database.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { DatabaseService, SystemWorkspace } from './database.service';
import { Idea } from '../models/idea.model';
import Dexie from 'dexie';
import indexedDB from 'fake-indexeddb';
import IDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(() => {
    // Configure Dexie to use fake-indexeddb
    Dexie.dependencies.indexedDB = indexedDB;
    Dexie.dependencies.IDBKeyRange = IDBKeyRange;
    
    TestBed.configureTestingModule({
      providers: [DatabaseService]
    });
    service = TestBed.inject(DatabaseService);
  });

  afterEach(async () => {
    await service.delete();
    // Clean up
    await indexedDB.deleteDatabase('MindDumpDB');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have ideas table', () => {
    expect(service.ideas).toBeDefined();
  });

  it('should have connections table', () => {
    expect(service.connections).toBeDefined();
  });

  it('should have settings table', () => {
    expect(service.settings).toBeDefined();
  });

  it('should have workspaces table in schema v4', async () => {
    const db = TestBed.inject(DatabaseService);
    
    expect(db.workspaces).toBeDefined();
    
    // Test workspace CRUD
    const workspace: SystemWorkspace = {
      id: 'ws-1',
      name: 'Personal',
      ownerId: 'user-1',
      isDefault: true,
      role: 'owner',
      syncStatus: 'synced',
      lastSyncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.workspaces.add(workspace);
    const retrieved = await db.workspaces.get('ws-1');
    
    expect(retrieved).toEqual(workspace);
  });

  it('should have workspaceId field on ideas in v4', async () => {
    const db = TestBed.inject(DatabaseService);
    
    const idea: Idea = {
      id: 'idea-1',
      title: 'Test',
      description: 'Test',
      keywords: [],
      status: 'new',
      priority: 'medium',
      color: '#000',
      createdAt: new Date(),
      updatedAt: new Date(),
      workspaceId: 'ws-1',
      version: 1,
      createdBy: 'user-1',
      lastModifiedBy: 'user-1'
    };
    
    await db.ideas.add(idea);
    const retrieved = await db.ideas.get('idea-1');
    
    expect(retrieved?.workspaceId).toBe('ws-1');
    expect(retrieved?.version).toBe(1);
  });
});
