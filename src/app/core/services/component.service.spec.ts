import { TestBed } from '@angular/core/testing';
import { ComponentService } from './component.service';
import { DatabaseService, SystemComponent } from './database.service';
import { WorkspaceService } from './workspace.service';
import { signal } from '@angular/core';

describe('ComponentService', () => {
  let service: ComponentService;
  let mockDatabaseService: any;
  let mockWorkspaceService: any;

  const mockWorkspace = {
    id: 'workspace-1',
    name: 'Test Workspace',
    ownerId: 'user-1',
    createdAt: new Date(),
    members: { 'user-1': 'owner' }
  };

  const mockComponents: SystemComponent[] = [
    {
      id: 'comp-1',
      name: 'Authentication',
      description: 'Auth component',
      createdAt: new Date(),
      workspaceId: 'workspace-1'
    },
    {
      id: 'comp-2',
      name: 'Dashboard',
      createdAt: new Date(),
      workspaceId: 'workspace-1'
    },
    {
      id: 'comp-3',
      name: 'Settings',
      createdAt: new Date(),
      workspaceId: 'workspace-2'
    }
  ];

  beforeEach(async () => {
    mockDatabaseService = {
      components: {
        add: jasmine.createSpy('add').and.returnValue(Promise.resolve('comp-1')),
        delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
        toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve(mockComponents))
      }
    };

    mockWorkspaceService = {
      activeWorkspace: signal(mockWorkspace)
    };

    TestBed.configureTestingModule({
      providers: [
        ComponentService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: WorkspaceService, useValue: mockWorkspaceService }
      ]
    });

    service = TestBed.inject(ComponentService);
    // Wait for initial load to complete
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load components on initialization', () => {
    expect(mockDatabaseService.components.toArray).toHaveBeenCalled();
    expect(service.components().length).toBe(3);
  });

  it('should filter componentNames by active workspace', () => {
    const names = service.componentNames();
    expect(names.length).toBe(2);
    expect(names).toContain('Authentication');
    expect(names).toContain('Dashboard');
    expect(names).not.toContain('Settings');
  });

  it('should sort componentNames alphabetically', () => {
    const names = service.componentNames();
    expect(names).toEqual(['Authentication', 'Dashboard']);
  });

  it('should return empty array when no active workspace', () => {
    mockWorkspaceService.activeWorkspace.set(null);
    const names = service.componentNames();
    expect(names).toEqual([]);
  });

  it('should add a new component', async () => {
    mockDatabaseService.components.toArray.and.returnValue(
      Promise.resolve([...mockComponents, {
        id: 'comp-4',
        name: 'New Component',
        description: 'Test',
        createdAt: new Date(),
        workspaceId: 'workspace-1'
      }])
    );

    const id = await service.addComponent('New Component', 'Test');

    expect(mockDatabaseService.components.add).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'New Component',
        description: 'Test',
        workspaceId: 'workspace-1'
      })
    );
    expect(typeof id).toBe('string');
    expect(service.loading()).toBe(false);
  });

  it('should trim whitespace when adding component', async () => {
    await service.addComponent('  Spaced Name  ', '  Spaced Desc  ');

    expect(mockDatabaseService.components.add).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'Spaced Name',
        description: 'Spaced Desc'
      })
    );
  });

  it('should throw error when adding component without active workspace', async () => {
    mockWorkspaceService.activeWorkspace.set(null);

    await expectAsync(
      service.addComponent('Test')
    ).toBeRejectedWithError('No active workspace');
    
    expect(service.error()).toBe('No active workspace');
  });

  it('should set loading state during add operation', async () => {
    let loadingDuringAdd = false;
    mockDatabaseService.components.add.and.callFake(() => {
      loadingDuringAdd = service.loading();
      return Promise.resolve('comp-1');
    });

    await service.addComponent('Test');

    expect(loadingDuringAdd).toBe(true);
    expect(service.loading()).toBe(false);
  });

  it('should delete a component', async () => {
    await service.deleteComponent('comp-1');

    expect(mockDatabaseService.components.delete).toHaveBeenCalledWith('comp-1');
    expect(mockDatabaseService.components.toArray).toHaveBeenCalled();
    expect(service.loading()).toBe(false);
  });

  it('should set error when delete fails', async () => {
    mockDatabaseService.components.delete.and.returnValue(
      Promise.reject(new Error('Delete failed'))
    );

    await expectAsync(
      service.deleteComponent('comp-1')
    ).toBeRejected();

    expect(service.error()).toBe('Delete failed');
  });

  it('should get or create component - existing', async () => {
    const id = await service.getOrCreateComponent('Authentication');

    expect(id).toBe('comp-1');
    expect(mockDatabaseService.components.add).not.toHaveBeenCalled();
  });

  it('should get or create component - new', async () => {
    mockDatabaseService.components.add.and.returnValue(Promise.resolve('new-id'));

    const id = await service.getOrCreateComponent('New Component');

    expect(mockDatabaseService.components.add).toHaveBeenCalled();
    expect(typeof id).toBe('string');
  });

  it('should be case-insensitive when finding existing component', async () => {
    const id = await service.getOrCreateComponent('authentication');

    expect(id).toBe('comp-1');
    expect(mockDatabaseService.components.add).not.toHaveBeenCalled();
  });

  it('should handle database errors during load', async () => {
    const errorService = TestBed.inject(ComponentService);
    mockDatabaseService.components.toArray.and.returnValue(
      Promise.reject(new Error('Database error'))
    );

    // Trigger reload by adding component
    mockWorkspaceService.activeWorkspace.set(mockWorkspace);
    try {
      await errorService.addComponent('Test');
    } catch (e) {
      // Expected to fail
    }

    expect(errorService.error()).toContain('Database error');
  });

  it('should clear error on successful operation', async () => {
    // First create an error
    mockDatabaseService.components.add.and.returnValue(
      Promise.reject(new Error('Initial error'))
    );
    
    try {
      await service.addComponent('Test');
    } catch (e) {
      // Expected
    }

    expect(service.error()).toBe('Initial error');

    // Now succeed
    mockDatabaseService.components.add.and.returnValue(Promise.resolve('comp-1'));
    await service.addComponent('Test 2');

    expect(service.error()).toBe(null);
  });
});
