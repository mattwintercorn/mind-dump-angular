import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WorkspaceSettingsDialogComponent } from './workspace-settings-dialog.component';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { WorkspaceSettingsDialogData } from './workspace-settings-dialog.component';
import { of } from 'rxjs';

describe('WorkspaceSettingsDialogComponent', () => {
  let component: WorkspaceSettingsDialogComponent;
  let fixture: ComponentFixture<WorkspaceSettingsDialogComponent>;
  let mockWorkspaceService: jasmine.SpyObj<WorkspaceService>;
  let mockDialogRef: jasmine.SpyObj<MatDialogRef<WorkspaceSettingsDialogComponent>>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  const mockDialogDataOwner: WorkspaceSettingsDialogData = {
    workspaceId: 'ws1',
    workspaceName: 'Test Workspace',
    isOwner: true,
    isDefault: false,
    members: {
      'user1': 'owner',
      'user2': 'editor'
    }
  };

  const mockDialogDataCollaborator: WorkspaceSettingsDialogData = {
    workspaceId: 'ws2',
    workspaceName: 'Shared Workspace',
    isOwner: false,
    isDefault: false,
    members: {
      'user3': 'owner',
      'user1': 'editor'
    }
  };

  beforeEach(async () => {
    mockWorkspaceService = jasmine.createSpyObj('WorkspaceService', [
      'renameWorkspace',
      'deleteWorkspace',
      'leaveWorkspace',
      'getWorkspaceIdeaCount'
    ]);
    mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
    
    // Mock dialog to return a confirmation result
    mockDialog.open.and.returnValue({
      afterClosed: () => of(false)  // Default to cancelled
    } as any);
    
    // Mock idea count
    mockWorkspaceService.getWorkspaceIdeaCount.and.returnValue(Promise.resolve(5));

    await TestBed.configureTestingModule({
      imports: [
        WorkspaceSettingsDialogComponent,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatListModule,
        MatChipsModule,
        MatDividerModule,
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: WorkspaceService, useValue: mockWorkspaceService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MatDialog, useValue: mockDialog },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogDataOwner }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WorkspaceSettingsDialogComponent);
    component = fixture.componentInstance;
    
    // Initialize member emails for proper rendering
    component.memberEmails.set({
      'user1': 'owner@example.com',
      'user2': 'editor@example.com'
    });
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display workspace name in title', () => {
    const title = fixture.nativeElement.querySelector('.workspace-name-title');
    expect(title?.textContent).toContain('Test Workspace');
  });

  describe('Owner View', () => {
    it('should show rename form for owner', () => {
      const renameSection = fixture.nativeElement.querySelector('.rename-section');
      expect(renameSection).toBeTruthy();
    });

    it('should initialize rename form with current workspace name', () => {
      expect(component.nameControl.value).toBe('Test Workspace');
    });

    it('should have rename button for owner', () => {
      const renameButton = fixture.nativeElement.querySelector('.rename-button');
      expect(renameButton).toBeTruthy();
    });

    it('should disable rename button when name is empty', () => {
      component.nameControl.setValue('');
      fixture.detectChanges();
      
      const renameButton = fixture.nativeElement.querySelector('.rename-button') as HTMLButtonElement;
      expect(renameButton.disabled).toBe(true);
    });

    it('should enable rename button when name is changed', () => {
      component.nameControl.setValue('New Workspace Name');
      fixture.detectChanges();
      
      const renameButton = fixture.nativeElement.querySelector('.rename-button') as HTMLButtonElement;
      expect(renameButton.disabled).toBe(false);
    });

    it('should show delete button for owner', () => {
      // Force full render cycle
      fixture.detectChanges();
      
      const compiled = fixture.debugElement.nativeElement;
      const deleteButton = compiled.querySelector('.delete-button');
      expect(deleteButton).toBeTruthy();
    });

    it('should not show delete button for default workspace', () => {
      component.data.isDefault = true;
      fixture.detectChanges();
      
      const deleteButton = fixture.nativeElement.querySelector('.delete-button');
      expect(deleteButton).toBeFalsy();
    });

    it('should not show leave button for owner', () => {
      const leaveButton = fixture.nativeElement.querySelector('.leave-button');
      expect(leaveButton).toBeFalsy();
    });

    it('should call renameWorkspace when rename button is clicked', async () => {
      mockWorkspaceService.renameWorkspace.and.returnValue(Promise.resolve());
      
      component.nameControl.setValue('Updated Name');
      fixture.detectChanges();

      const renameButton = fixture.nativeElement.querySelector('.rename-button') as HTMLElement;
      renameButton.click();

      await fixture.whenStable();

      expect(mockWorkspaceService.renameWorkspace).toHaveBeenCalledWith('ws1', 'Updated Name');
    });

    it('should show confirmation dialog before deleting', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      // Force full render cycle
      fixture.detectChanges();
      
      const compiled = fixture.debugElement.nativeElement;
      const deleteButton = compiled.querySelector('.delete-button') as HTMLElement;
      deleteButton.click();

      expect(window.confirm).toHaveBeenCalled();
      expect(mockWorkspaceService.deleteWorkspace).not.toHaveBeenCalled();
    });

    it('should call deleteWorkspace when confirmed', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      mockWorkspaceService.deleteWorkspace.and.returnValue(Promise.resolve());
      
      // Force full render cycle and wait
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();
      
      const compiled = fixture.debugElement.nativeElement;
      const deleteButton = compiled.querySelector('.delete-button') as HTMLElement;
      expect(deleteButton).toBeTruthy(); // Add assertion to debug
      deleteButton.click();

      await fixture.whenStable();

      expect(mockWorkspaceService.deleteWorkspace).toHaveBeenCalledWith('ws1');
    });

    it('should close dialog after successful deletion', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      mockWorkspaceService.deleteWorkspace.and.returnValue(Promise.resolve());
      
      // Force full render cycle and wait
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();
      
      const compiled = fixture.debugElement.nativeElement;
      const deleteButton = compiled.querySelector('.delete-button') as HTMLElement;
      deleteButton.click();

      await fixture.whenStable();

      expect(mockDialogRef.close).toHaveBeenCalledWith({ deleted: true });
    });
  });

  describe('Collaborator View', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [
          WorkspaceSettingsDialogComponent,
          MatDialogModule,
          MatFormFieldModule,
          MatInputModule,
          MatButtonModule,
          MatIconModule,
          MatListModule,
          MatChipsModule,
          MatDividerModule,
          ReactiveFormsModule,
          NoopAnimationsModule
        ],
        providers: [
          { provide: WorkspaceService, useValue: mockWorkspaceService },
          { provide: MatDialogRef, useValue: mockDialogRef },
          { provide: MAT_DIALOG_DATA, useValue: mockDialogDataCollaborator }
        ]
      });

      fixture = TestBed.createComponent(WorkspaceSettingsDialogComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    });

    it('should not show rename form for collaborator', () => {
      const renameSection = fixture.nativeElement.querySelector('.rename-section');
      expect(renameSection).toBeFalsy();
    });

    it('should not show delete button for collaborator', () => {
      const deleteButton = fixture.nativeElement.querySelector('.delete-button');
      expect(deleteButton).toBeFalsy();
    });

    it('should show leave button for collaborator', () => {
      const leaveButton = fixture.nativeElement.querySelector('.leave-button');
      expect(leaveButton).toBeTruthy();
    });

    it('should show confirmation dialog before leaving', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      
      const leaveButton = fixture.nativeElement.querySelector('.leave-button') as HTMLElement;
      leaveButton.click();

      expect(window.confirm).toHaveBeenCalled();
      expect(mockWorkspaceService.leaveWorkspace).not.toHaveBeenCalled();
    });

    it('should call leaveWorkspace when confirmed', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      mockWorkspaceService.leaveWorkspace.and.returnValue(Promise.resolve());
      
      const leaveButton = fixture.nativeElement.querySelector('.leave-button') as HTMLElement;
      leaveButton.click();

      await fixture.whenStable();

      expect(mockWorkspaceService.leaveWorkspace).toHaveBeenCalledWith('ws2');
    });

    it('should close dialog after successfully leaving', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      mockWorkspaceService.leaveWorkspace.and.returnValue(Promise.resolve());
      
      const leaveButton = fixture.nativeElement.querySelector('.leave-button') as HTMLElement;
      leaveButton.click();

      await fixture.whenStable();

      expect(mockDialogRef.close).toHaveBeenCalledWith({ left: true });
    });
  });

  describe('Members List', () => {
    it('should display members list', () => {
      const membersSection = fixture.nativeElement.querySelector('.members-section');
      expect(membersSection).toBeTruthy();
    });

    it('should display all members with roles', () => {
      component.memberEmails.set({
        'user1': 'owner@example.com',
        'user2': 'editor@example.com'
      });
      fixture.detectChanges();
      
      const memberItems = fixture.nativeElement.querySelectorAll('.member-item');
      expect(memberItems.length).toBe(2);
    });

    it('should display owner badge for workspace owner', () => {
      component.memberEmails.set({
        'user1': 'owner@example.com',
        'user2': 'editor@example.com'
      });
      fixture.detectChanges();
      
      const ownerBadge = fixture.nativeElement.querySelector('.owner-badge');
      expect(ownerBadge).toBeTruthy();
    });

    it('should display editor badge for collaborators', () => {
      component.memberEmails.set({
        'user1': 'owner@example.com',
        'user2': 'editor@example.com'
      });
      fixture.detectChanges();
      
      const editorBadge = fixture.nativeElement.querySelector('.editor-badge');
      expect(editorBadge).toBeTruthy();
    });
  });

  describe('Common Actions', () => {
    it('should close dialog when Close button is clicked', () => {
      const closeButton = fixture.nativeElement.querySelector('.close-button') as HTMLElement;
      closeButton.click();

      expect(mockDialogRef.close).toHaveBeenCalled();
    });

    it('should close dialog after successful rename', async () => {
      mockWorkspaceService.renameWorkspace.and.returnValue(Promise.resolve());
      
      component.nameControl.setValue('Updated Name');
      fixture.detectChanges();

      const renameButton = fixture.nativeElement.querySelector('.rename-button') as HTMLElement;
      renameButton.click();

      await fixture.whenStable();

      expect(mockDialogRef.close).toHaveBeenCalledWith({ renamed: true });
    });
  });
});
