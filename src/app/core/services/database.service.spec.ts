// src/app/core/services/database.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { DatabaseService, SystemWorkspace, SystemComponent, Project } from './database.service';
import { Idea } from '../models/idea.model';
import { Connection } from '../models/connection.model';
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

  describe('Tables', () => {
    it('should have ideas table', () => {
      expect(service.ideas).toBeDefined();
      expect(service.ideas.name).toBe('ideas');
    });

    it('should have connections table', () => {
      expect(service.connections).toBeDefined();
      expect(service.connections.name).toBe('connections');
    });

    it('should have settings table', () => {
      expect(service.settings).toBeDefined();
      expect(service.settings.name).toBe('settings');
    });

    it('should have components table', () => {
      expect(service.components).toBeDefined();
      expect(service.components.name).toBe('components');
    });

    it('should have projects table', () => {
      expect(service.projects).toBeDefined();
      expect(service.projects.name).toBe('projects');
    });

    it('should have workspaces table', () => {
      expect(service.workspaces).toBeDefined();
      expect(service.workspaces.name).toBe('workspaces');
    });
  });

  describe('Ideas CRUD', () => {
    const testIdea: Idea = {
      id: 'idea-1',
      title: 'Test Idea',
      description: 'Test Description',
      keywords: ['test', 'angular'],
      status: 'active',
      priority: 'high',
      color: '#FF0000',
      component: 'Frontend',
      project: 'Web App',
      workspaceId: 'ws-1',
      version: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      createdBy: 'user-1',
      lastModifiedBy: 'user-1'
    };

    it('should add an idea', async () => {
      await service.ideas.add(testIdea);
      const retrieved = await service.ideas.get('idea-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('Test Idea');
    });

    it('should update an idea', async () => {
      await service.ideas.add(testIdea);
      await service.ideas.update('idea-1', { title: 'Updated Title' });
      
      const retrieved = await service.ideas.get('idea-1');
      expect(retrieved?.title).toBe('Updated Title');
    });

    it('should delete an idea', async () => {
      await service.ideas.add(testIdea);
      await service.ideas.delete('idea-1');
      
      const retrieved = await service.ideas.get('idea-1');
      expect(retrieved).toBeUndefined();
    });

    it('should query ideas by status', async () => {
      await service.ideas.add(testIdea);
      await service.ideas.add({ ...testIdea, id: 'idea-2', status: 'new' });
      
      const activeIdeas = await service.ideas.where('status').equals('active').toArray();
      expect(activeIdeas.length).toBe(1);
      expect(activeIdeas[0].id).toBe('idea-1');
    });

    it('should query ideas by workspaceId', async () => {
      await service.ideas.add(testIdea);
      await service.ideas.add({ ...testIdea, id: 'idea-2', workspaceId: 'ws-2' });
      
      const ws1Ideas = await service.ideas.where('workspaceId').equals('ws-1').toArray();
      expect(ws1Ideas.length).toBe(1);
      expect(ws1Ideas[0].id).toBe('idea-1');
    });

    it('should store keywords as multi-entry index', async () => {
      await service.ideas.add(testIdea);
      
      const angularIdeas = await service.ideas.where('keywords').equals('angular').toArray();
      expect(angularIdeas.length).toBe(1);
      expect(angularIdeas[0].id).toBe('idea-1');
    });
  });

  describe('Connections CRUD', () => {
    const testConnection: Connection = {
      id: 'conn-1',
      sourceId: 'idea-1',
      targetId: 'idea-2',
      bidirectional: false,
      workspaceId: 'ws-1',
      createdAt: new Date()
    };

    it('should add a connection', async () => {
      await service.connections.add(testConnection);
      const retrieved = await service.connections.get('conn-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.sourceId).toBe('idea-1');
      expect(retrieved?.targetId).toBe('idea-2');
    });

    it('should query connections by sourceId', async () => {
      await service.connections.add(testConnection);
      await service.connections.add({ ...testConnection, id: 'conn-2', sourceId: 'idea-3' });
      
      const connections = await service.connections.where('sourceId').equals('idea-1').toArray();
      expect(connections.length).toBe(1);
      expect(connections[0].id).toBe('conn-1');
    });

    it('should query connections by targetId', async () => {
      await service.connections.add(testConnection);
      
      const connections = await service.connections.where('targetId').equals('idea-2').toArray();
      expect(connections.length).toBe(1);
      expect(connections[0].id).toBe('conn-1');
    });

    it('should delete a connection', async () => {
      await service.connections.add(testConnection);
      await service.connections.delete('conn-1');
      
      const retrieved = await service.connections.get('conn-1');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Workspaces CRUD', () => {
    const testWorkspace: SystemWorkspace = {
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

    it('should add a workspace', async () => {
      await service.workspaces.add(testWorkspace);
      const retrieved = await service.workspaces.get('ws-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Personal');
      expect(retrieved?.role).toBe('owner');
    });

    it('should update a workspace', async () => {
      await service.workspaces.add(testWorkspace);
      await service.workspaces.update('ws-1', { name: 'Work' });
      
      const retrieved = await service.workspaces.get('ws-1');
      expect(retrieved?.name).toBe('Work');
    });

    it('should delete a workspace', async () => {
      await service.workspaces.add(testWorkspace);
      await service.workspaces.delete('ws-1');
      
      const retrieved = await service.workspaces.get('ws-1');
      expect(retrieved).toBeUndefined();
    });

    it('should query workspaces by ownerId', async () => {
      await service.workspaces.add(testWorkspace);
      await service.workspaces.add({ ...testWorkspace, id: 'ws-2', ownerId: 'user-2' });
      
      const user1Workspaces = await service.workspaces.where('ownerId').equals('user-1').toArray();
      expect(user1Workspaces.length).toBe(1);
      expect(user1Workspaces[0].id).toBe('ws-1');
    });

    it('should query default workspace', async () => {
      await service.workspaces.add(testWorkspace);
      await service.workspaces.add({ ...testWorkspace, id: 'ws-2', isDefault: false });
      
      const allWorkspaces = await service.workspaces.toArray();
      const defaultWorkspaces = allWorkspaces.filter(w => w.isDefault === true);
      
      expect(defaultWorkspaces.length).toBe(1);
      expect(defaultWorkspaces[0].id).toBe('ws-1');
    });
  });

  describe('Components CRUD', () => {
    const testComponent: SystemComponent = {
      id: 'comp-1',
      name: 'Authentication',
      description: 'Auth module',
      workspaceId: 'ws-1',
      createdAt: new Date()
    };

    it('should add a component', async () => {
      await service.components.add(testComponent);
      const retrieved = await service.components.get('comp-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Authentication');
    });

    it('should delete a component', async () => {
      await service.components.add(testComponent);
      await service.components.delete('comp-1');
      
      const retrieved = await service.components.get('comp-1');
      expect(retrieved).toBeUndefined();
    });

    it('should query components by workspaceId', async () => {
      await service.components.add(testComponent);
      await service.components.add({ ...testComponent, id: 'comp-2', workspaceId: 'ws-2' });
      
      const ws1Components = await service.components.where('workspaceId').equals('ws-1').toArray();
      expect(ws1Components.length).toBe(1);
      expect(ws1Components[0].id).toBe('comp-1');
    });
  });

  describe('Projects CRUD', () => {
    const testProject: Project = {
      id: 'proj-1',
      name: 'Mobile App',
      description: 'iOS and Android',
      workspaceId: 'ws-1',
      createdAt: new Date()
    };

    it('should add a project', async () => {
      await service.projects.add(testProject);
      const retrieved = await service.projects.get('proj-1');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Mobile App');
    });

    it('should delete a project', async () => {
      await service.projects.add(testProject);
      await service.projects.delete('proj-1');
      
      const retrieved = await service.projects.get('proj-1');
      expect(retrieved).toBeUndefined();
    });

    it('should query projects by workspaceId', async () => {
      await service.projects.add(testProject);
      await service.projects.add({ ...testProject, id: 'proj-2', workspaceId: 'ws-2' });
      
      const ws1Projects = await service.projects.where('workspaceId').equals('ws-1').toArray();
      expect(ws1Projects.length).toBe(1);
      expect(ws1Projects[0].id).toBe('proj-1');
    });
  });

  describe('Bulk Operations', () => {
    it('should add multiple ideas in bulk', async () => {
      const ideas: Idea[] = [
        {
          id: '1',
          title: 'Idea 1',
          description: 'Desc 1',
          keywords: [],
          status: 'new',
          priority: 'low',
          color: '#000',
          workspaceId: 'ws-1',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          lastModifiedBy: 'user-1'
        },
        {
          id: '2',
          title: 'Idea 2',
          description: 'Desc 2',
          keywords: [],
          status: 'new',
          priority: 'low',
          color: '#000',
          workspaceId: 'ws-1',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          lastModifiedBy: 'user-1'
        }
      ];

      await service.ideas.bulkAdd(ideas);
      const count = await service.ideas.count();
      
      expect(count).toBe(2);
    });

    it('should delete multiple ideas by workspace', async () => {
      const idea1: Idea = {
        id: '1',
        title: 'Idea 1',
        description: '',
        keywords: [],
        status: 'new',
        priority: 'low',
        color: '#000',
        workspaceId: 'ws-1',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        lastModifiedBy: 'user-1'
      };

      await service.ideas.add(idea1);
      await service.ideas.add({ ...idea1, id: '2', workspaceId: 'ws-2' });
      
      await service.ideas.where('workspaceId').equals('ws-1').delete();
      
      const remaining = await service.ideas.toArray();
      expect(remaining.length).toBe(1);
      expect(remaining[0].workspaceId).toBe('ws-2');
    });
  });

  describe('Database Version', () => {
    it('should be at version 4', () => {
      expect(service.verno).toBe(4);
    });

    it('should have correct schema for ideas', () => {
      const schema = service.table('ideas').schema;
      expect(schema.primKey.name).toBe('id');
      expect(schema.indexes.some(idx => idx.name === 'status')).toBe(true);
      expect(schema.indexes.some(idx => idx.name === 'workspaceId')).toBe(true);
    });
  });
});

