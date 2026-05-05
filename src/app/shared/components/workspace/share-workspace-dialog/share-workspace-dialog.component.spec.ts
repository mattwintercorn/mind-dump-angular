import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShareWorkspaceDialogComponent, UserProfile } from './share-workspace-dialog.component';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { ShareWorkspaceDialogData } from './share-workspace-dialog.component';

describe('ShareWorkspaceDialogComponent', () => {
  let component: ShareWorkspaceDialogComponent;
  let fixture: ComponentFixture<ShareWorkspaceDialogComponent>;
  let mockWorkspaceService: jasmine.SpyObj<WorkspaceService>;
  let mockFirebaseService: jasmine.SpyObj<FirebaseService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<ShareWorkspaceDialogComponent>>;

  const mockDialogData: ShareWorkspaceDialogData = {
    workspaceId: 'ws1',
    workspaceName: 'Test Workspace',
    ownerId: 'user1',
    members: {
      'user1': 'owner',
      'user2': 'editor'
    }
  };

  const mockUsers: UserProfile[] = [
    {
      uid: 'user3',
      email: 'user3@example.com',
      displayName: 'User Three',
      photoURL: 'https://example.com/photo3.jpg'
    },
    {
      uid: 'user4',
      email: 'user4@example.com',
      displayName: 'User Four'
    }
  ];

  beforeEach(async () => {
    mockWorkspaceService = jasmine.createSpyObj('WorkspaceService', [
      'shareWorkspaceWithUser',
      'removeCollaborator'
    ]);
    
    mockFirebaseService = jasmine.createSpyObj('FirebaseService', [], {
      database: {} as any
    });

    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [
        ShareWorkspaceDialogComponent,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatListModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatAutocompleteModule,
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: WorkspaceService, useValue: mockWorkspaceService },
        { provide: FirebaseService, useValue: mockFirebaseService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ShareWorkspaceDialogComponent);
    component = fixture.componentInstance;
    
    // Spy on Firebase-dependent methods to prevent actual Firebase calls
    spyOn(component, 'loadAllUsers').and.returnValue(Promise.resolve());
    spyOn(component, 'loadMemberDetails').and.returnValue(Promise.resolve());
    
    // Initialize member profiles for proper rendering
    component.memberProfiles.set({
      'user1': { displayName: 'Owner User', email: 'owner@example.com' },
      'user2': { displayName: 'Collaborator User', email: 'collaborator@example.com' }
    });
    
    // Set available users for autocomplete
    component.allUsers.set(mockUsers);
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display workspace name in title', () => {
    const title = fixture.nativeElement.querySelector('h2');
    expect(title?.textContent).toContain('Test Workspace');
  });

  it('should have user autocomplete input field', () => {
    const input = fixture.nativeElement.querySelector('input[type="text"]');
    expect(input).toBeTruthy();
    expect(input?.placeholder).toContain('Search');
  });

  it('should display current members list', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    
    const memberItems = fixture.nativeElement.querySelectorAll('.member-item');
    expect(memberItems.length).toBe(2);
  });

  it('should display owner badge for workspace owner', () => {
    const ownerBadge = fixture.nativeElement.querySelector('.owner-badge');
    expect(ownerBadge).toBeTruthy();
    expect(ownerBadge?.textContent).toContain('Owner');
  });

  it('should display editor badge for collaborators', () => {
    const editorBadges = fixture.nativeElement.querySelectorAll('.editor-badge');
    expect(editorBadges.length).toBeGreaterThan(0);
  });

  it('should not show remove button for owner', () => {
    const memberItems = fixture.nativeElement.querySelectorAll('.member-item');
    const ownerItem = Array.from(memberItems).find((item: any) =>
      item.querySelector('.owner-badge')
    ) as HTMLElement | undefined;
    const removeButton = ownerItem?.querySelector('.remove-button');
    expect(removeButton).toBeFalsy();
  });

  it('should show remove button for collaborators', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    
    const memberItems = fixture.nativeElement.querySelectorAll('.member-item');
    const collaboratorItem = Array.from(memberItems).find((item: any) =>
      item.querySelector('.editor-badge')
    ) as HTMLElement | undefined;
    const removeButton = collaboratorItem?.querySelector('.remove-button');
    expect(removeButton).toBeTruthy();
  });

  it('should call shareWorkspaceWithUser when user is selected from autocomplete', async () => {
    mockWorkspaceService.shareWorkspaceWithUser.and.returnValue(Promise.resolve());
    mockDialogRef.close.and.stub();
    
    // Simulate selecting a user from autocomplete
    component.userControl.setValue(mockUsers[0]);
    await component.onAddCollaborator();

    expect(mockWorkspaceService.shareWorkspaceWithUser).toHaveBeenCalledWith('ws1', 'user3');
  });

  it('should clear user input after successful invitation', async () => {
    mockWorkspaceService.shareWorkspaceWithUser.and.returnValue(Promise.resolve());
    mockDialogRef.close.and.stub();
    
    component.userControl.setValue(mockUsers[0]);
    await component.onAddCollaborator();

    await fixture.whenStable();

    expect(component.userControl.value).toBe('');
  });

  it('should close dialog with refresh flag after successful invitation', async () => {
    mockWorkspaceService.shareWorkspaceWithUser.and.returnValue(Promise.resolve());
    
    component.userControl.setValue(mockUsers[0]);
    await component.onAddCollaborator();

    expect(mockDialogRef.close).toHaveBeenCalledWith({ refresh: true });
  });

  it('should show error message when user selection is invalid', async () => {
    component.userControl.setValue('invalid string');
    await component.onAddCollaborator();

    expect(component.errorMessage()).toBe('Please select a user from the list');
  });

  it('should show loading state during invitation', async () => {
    mockWorkspaceService.shareWorkspaceWithUser.and.returnValue(
      new Promise(resolve => setTimeout(resolve, 100))
    );
    mockDialogRef.close.and.stub();
    
    component.userControl.setValue(mockUsers[0]);
    const addPromise = component.onAddCollaborator();
    
    expect(component.isLoading()).toBe(true);
    
    await addPromise;
    
    expect(component.isLoading()).toBe(false);
  });

  it('should call removeCollaborator when remove button is clicked', async () => {
    mockWorkspaceService.removeCollaborator.and.returnValue(Promise.resolve());
    
    await component.onRemoveCollaborator('user2');

    expect(mockWorkspaceService.removeCollaborator).toHaveBeenCalledWith('ws1', 'user2');
  });

  it('should update members list after removing collaborator', async () => {
    mockWorkspaceService.removeCollaborator.and.returnValue(Promise.resolve());
    
    await component.onRemoveCollaborator('user2');
    
    expect(component.data.members['user2']).toBeUndefined();
  });

  it('should close dialog when Close button is clicked', () => {
    component.onClose();
    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should show error message when invitation fails', async () => {
    mockWorkspaceService.shareWorkspaceWithUser.and.returnValue(
      Promise.reject(new Error('User not found'))
    );
    
    component.userControl.setValue(mockUsers[0]);
    await component.onAddCollaborator();

    expect(component.errorMessage()).toBe('User not found');
  });

  it('should display member names and email addresses', async () => {
    await fixture.whenStable();
    fixture.detectChanges();
    
    const memberNames = fixture.nativeElement.querySelectorAll('.member-name');
    const memberEmails = fixture.nativeElement.querySelectorAll('.member-email');
    
    expect(memberNames.length).toBe(2);
    expect(memberEmails.length).toBe(2);
    
    const names = Array.from(memberNames).map((el: any) => el.textContent?.trim());
    const emails = Array.from(memberEmails).map((el: any) => el.textContent?.trim());
    
    expect(names).toContain('Owner User');
    expect(names).toContain('Collaborator User');
    expect(emails).toContain('owner@example.com');
    expect(emails).toContain('collaborator@example.com');
  });

  it('should identify workspace owner correctly', () => {
    expect(component.isOwner('user1')).toBe(true);
    expect(component.isOwner('user2')).toBe(false);
  });

  it('should return member IDs', () => {
    const memberIds = component.getMemberIds();
    expect(memberIds).toEqual(['user1', 'user2']);
  });

  it('should return member profile', () => {
    const profile = component.getMemberProfile('user1');
    expect(profile.displayName).toBe('Owner User');
    expect(profile.email).toBe('owner@example.com');
  });

  it('should return fallback for missing member profile', () => {
    const profile = component.getMemberProfile('unknownUser');
    expect(profile.displayName).toBe('unknownUser');
    expect(profile.email).toBe('');
  });
});
