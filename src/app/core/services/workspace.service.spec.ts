import { TestBed } from '@angular/core/testing';
import { WorkspaceService } from './workspace.service';
import { AuthService } from './auth.service';
import { DatabaseService } from './database.service';
import { FirebaseService } from './firebase.service';
import { signal } from '@angular/core';

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let authService: jasmine.SpyObj<AuthService>;
  let databaseService: any;
  let firebaseService: jasmine.SpyObj<FirebaseService>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', [], {
      currentUser: signal({ uid: 'user-1', email: 'test@test.com', displayName: 'Test User' }),
      isAuthenticated: signal(true)
    });
    
    const dbSpy = {
      workspaces: {
        where: jasmine.createSpy('where').and.returnValue({
          equals: jasmine.createSpy('equals').and.returnValue({
            or: jasmine.createSpy('or').and.returnValue({
              equals: jasmine.createSpy('equals').and.returnValue({
                toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([]))
              })
            }),
            toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([]))
          })
        }),
        add: jasmine.createSpy('add').and.returnValue(Promise.resolve()),
        get: jasmine.createSpy('get').and.returnValue(Promise.resolve(null)),
        put: jasmine.createSpy('put').and.returnValue(Promise.resolve()),
        delete: jasmine.createSpy('delete').and.returnValue(Promise.resolve())
      }
    };
    
    const firebaseSpy = jasmine.createSpyObj('FirebaseService', ['database']);

    TestBed.configureTestingModule({
      providers: [
        WorkspaceService,
        { provide: AuthService, useValue: authSpy },
        { provide: DatabaseService, useValue: dbSpy },
        { provide: FirebaseService, useValue: firebaseSpy }
      ]
    });

    service = TestBed.inject(WorkspaceService);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    databaseService = TestBed.inject(DatabaseService);
    firebaseService = TestBed.inject(FirebaseService) as jasmine.SpyObj<FirebaseService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a new workspace', async () => {
    const workspaceName = 'My Project';
    
    const workspace = await service.createWorkspace(workspaceName);
    
    expect(workspace.name).toBe(workspaceName);
    expect(workspace.ownerId).toBe('user-1');
    expect(workspace.isDefault).toBe(false);
    expect(databaseService.workspaces.add).toHaveBeenCalled();
  });

  it('should load workspaces for current user', async () => {
    const mockWorkspaces = [
      { id: 'ws-1', name: 'Personal', ownerId: 'user-1', isDefault: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'ws-2', name: 'Team', ownerId: 'user-1', isDefault: false, createdAt: new Date(), updatedAt: new Date() }
    ];
    
    databaseService.workspaces.where().equals().toArray = jasmine.createSpy().and.returnValue(Promise.resolve(mockWorkspaces));
    
    await service.loadWorkspaces();
    
    expect(service.workspaces().length).toBe(2);
  });

  it('should switch active workspace', async () => {
    const workspaceId = 'ws-2';
    const mockWorkspace = { 
      id: workspaceId, 
      name: 'Team', 
      ownerId: 'user-1', 
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    databaseService.workspaces.get = jasmine.createSpy().and.returnValue(Promise.resolve(mockWorkspace));
    
    await service.switchWorkspace(workspaceId);
    
    expect(service.activeWorkspace()?.id).toBe(workspaceId);
  });

  it('should delete workspace if owner', async () => {
    const workspaceId = 'ws-2';
    const workspace = {
      id: workspaceId,
      name: 'Test',
      ownerId: 'user-1',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    databaseService.workspaces.get = jasmine.createSpy().and.returnValue(Promise.resolve(workspace));
    
    await service.deleteWorkspace(workspaceId);
    
    expect(databaseService.workspaces.delete).toHaveBeenCalledWith(workspaceId);
  });

  it('should not delete default workspace', async () => {
    const workspaceId = 'ws-1';
    const workspace = {
      id: workspaceId,
      name: 'Personal',
      ownerId: 'user-1',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    databaseService.workspaces.get = jasmine.createSpy().and.returnValue(Promise.resolve(workspace));
    
    await expectAsync(service.deleteWorkspace(workspaceId)).toBeRejectedWithError('Cannot delete default workspace');
  });

  it('should rename workspace if owner', async () => {
    const workspaceId = 'ws-2';
    const newName = 'Renamed Workspace';
    const workspace = {
      id: workspaceId,
      name: 'Old Name',
      ownerId: 'user-1',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    databaseService.workspaces.get = jasmine.createSpy().and.returnValue(Promise.resolve(workspace));
    
    await service.renameWorkspace(workspaceId, newName);
    
    expect(databaseService.workspaces.put).toHaveBeenCalled();
  });
});
