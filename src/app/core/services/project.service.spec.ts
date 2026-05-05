import { TestBed } from '@angular/core/testing';
import { ProjectService } from './project.service';
import { DatabaseService, Project } from './database.service';
import { WorkspaceService } from './workspace.service';
import { signal } from '@angular/core';

describe('ProjectService', () => {
  let service: ProjectService;
  let mockDatabaseService: any;
  let mockWorkspaceService: any;

  const mockWorkspace = {
    id: 'workspace-1',
    name: 'Test Workspace',
    ownerId: 'user-1',
    createdAt: new Date(),
    members: { 'user-1': 'owner' }
  };

  const mockProjects: Project[] = [
    {
      id: 'proj-1',
      name: 'Mobile App',
      description: 'iOS and Android app',
      createdAt: new Date(),
      workspaceId: 'workspace-1'
    },
    {
      id: 'proj-2',
      name: 'Web Dashboard',
      createdAt: new Date(),
      workspaceId: 'workspace-1'
    },
    {
      id: 'proj-3',
      name: 'API Service',
      createdAt: new Date(),
      workspaceId: 'workspace-2'
    }
  ];

  beforeEach(async () => {
    mockDatabaseService = {
      projects: {
        add: jasmine.createSpy('add').and.returnValue(Promise.resolve('proj-1')),
        delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve()),
        toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve(mockProjects))
      }
    };

    mockWorkspaceService = {
      activeWorkspace: signal(mockWorkspace)
    };

    TestBed.configureTestingModule({
      providers: [
        ProjectService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: WorkspaceService, useValue: mockWorkspaceService }
      ]
    });

    service = TestBed.inject(ProjectService);
    // Wait for initial load to complete
    await new Promise(resolve => setTimeout(resolve, 10));
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load projects on initialization', () => {
    expect(mockDatabaseService.projects.toArray).toHaveBeenCalled();
    expect(service.projects().length).toBe(3);
  });

  it('should filter projectNames by active workspace', () => {
    const names = service.projectNames();
    expect(names.length).toBe(2);
    expect(names).toContain('Mobile App');
    expect(names).toContain('Web Dashboard');
    expect(names).not.toContain('API Service');
  });

  it('should sort projectNames alphabetically', () => {
    const names = service.projectNames();
    expect(names).toEqual(['Mobile App', 'Web Dashboard']);
  });

  it('should return empty array when no active workspace', () => {
    mockWorkspaceService.activeWorkspace.set(null);
    const names = service.projectNames();
    expect(names).toEqual([]);
  });

  it('should add a new project', async () => {
    mockDatabaseService.projects.toArray.and.returnValue(
      Promise.resolve([...mockProjects, {
        id: 'proj-4',
        name: 'New Project',
        description: 'Test',
        createdAt: new Date(),
        workspaceId: 'workspace-1'
      }])
    );

    const id = await service.addProject('New Project', 'Test');

    expect(mockDatabaseService.projects.add).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'New Project',
        description: 'Test',
        workspaceId: 'workspace-1'
      })
    );
    expect(typeof id).toBe('string');
    expect(service.loading()).toBe(false);
  });

  it('should trim whitespace when adding project', async () => {
    await service.addProject('  Spaced Name  ', '  Spaced Desc  ');

    expect(mockDatabaseService.projects.add).toHaveBeenCalledWith(
      jasmine.objectContaining({
        name: 'Spaced Name',
        description: 'Spaced Desc'
      })
    );
  });

  it('should throw error when adding project without active workspace', async () => {
    mockWorkspaceService.activeWorkspace.set(null);

    await expectAsync(
      service.addProject('Test')
    ).toBeRejectedWithError('No active workspace');
    
    expect(service.error()).toBe('No active workspace');
  });

  it('should set loading state during add operation', async () => {
    let loadingDuringAdd = false;
    mockDatabaseService.projects.add.and.callFake(() => {
      loadingDuringAdd = service.loading();
      return Promise.resolve('proj-1');
    });

    await service.addProject('Test');

    expect(loadingDuringAdd).toBe(true);
    expect(service.loading()).toBe(false);
  });

  it('should delete a project', async () => {
    await service.deleteProject('proj-1');

    expect(mockDatabaseService.projects.delete).toHaveBeenCalledWith('proj-1');
    expect(mockDatabaseService.projects.toArray).toHaveBeenCalled();
    expect(service.loading()).toBe(false);
  });

  it('should set error when delete fails', async () => {
    mockDatabaseService.projects.delete.and.returnValue(
      Promise.reject(new Error('Delete failed'))
    );

    await expectAsync(
      service.deleteProject('proj-1')
    ).toBeRejected();

    expect(service.error()).toBe('Delete failed');
  });

  it('should get or create project - existing', async () => {
    const id = await service.getOrCreateProject('Mobile App');

    expect(id).toBe('proj-1');
    expect(mockDatabaseService.projects.add).not.toHaveBeenCalled();
  });

  it('should get or create project - new', async () => {
    mockDatabaseService.projects.add.and.returnValue(Promise.resolve('new-id'));

    const id = await service.getOrCreateProject('New Project');

    expect(mockDatabaseService.projects.add).toHaveBeenCalled();
    expect(typeof id).toBe('string');
  });

  it('should be case-insensitive when finding existing project', async () => {
    const id = await service.getOrCreateProject('mobile app');

    expect(id).toBe('proj-1');
    expect(mockDatabaseService.projects.add).not.toHaveBeenCalled();
  });

  it('should handle database errors during load', async () => {
    const errorService = TestBed.inject(ProjectService);
    mockDatabaseService.projects.toArray.and.returnValue(
      Promise.reject(new Error('Database error'))
    );

    // Trigger reload by adding project
    mockWorkspaceService.activeWorkspace.set(mockWorkspace);
    try {
      await errorService.addProject('Test');
    } catch (e) {
      // Expected to fail
    }

    expect(errorService.error()).toContain('Database error');
  });

  it('should clear error on successful operation', async () => {
    // First create an error
    mockDatabaseService.projects.add.and.returnValue(
      Promise.reject(new Error('Initial error'))
    );
    
    try {
      await service.addProject('Test');
    } catch (e) {
      // Expected
    }

    expect(service.error()).toBe('Initial error');

    // Now succeed
    mockDatabaseService.projects.add.and.returnValue(Promise.resolve('proj-1'));
    await service.addProject('Test 2');

    expect(service.error()).toBe(null);
  });
});
