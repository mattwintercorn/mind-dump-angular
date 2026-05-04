import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShareWorkspaceDialogComponent } from './share-workspace-dialog.component';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';
import { ShareWorkspaceDialogData } from './share-workspace-dialog.component';

describe('ShareWorkspaceDialogComponent', () => {
  let component: ShareWorkspaceDialogComponent;
  let fixture: ComponentFixture<ShareWorkspaceDialogComponent>;
  let mockWorkspaceService: jasmine.SpyObj<WorkspaceService>;
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

  beforeEach(async () => {
    mockWorkspaceService = jasmine.createSpyObj('WorkspaceService', [
      'shareWorkspace',
      'removeCollaborator'
    ]);
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
        ReactiveFormsModule,
        NoopAnimationsModule
      ],
      providers: [
        { provide: WorkspaceService, useValue: mockWorkspaceService },
        { provide: MatDialogRef, useValue: mockDialogRef },
        { provide: MAT_DIALOG_DATA, useValue: mockDialogData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ShareWorkspaceDialogComponent);
    component = fixture.componentInstance;
    
    // Initialize member emails for proper rendering
    component.memberEmails.set({
      'user1': 'owner@example.com',
      'user2': 'collaborator@example.com'
    });
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display workspace name in title', () => {
    const title = fixture.nativeElement.querySelector('h2');
    expect(title?.textContent).toContain('Test Workspace');
  });

  it('should have email input field', () => {
    const emailInput = fixture.nativeElement.querySelector('input[type="email"]');
    expect(emailInput).toBeTruthy();
  });

  it('should have "Add" button for inviting collaborator', () => {
    const addButton = fixture.nativeElement.querySelector('.add-button');
    expect(addButton).toBeTruthy();
    expect(addButton?.textContent).toContain('Add');
  });

  it('should disable Add button when email is empty', () => {
    const addButton = fixture.nativeElement.querySelector('.add-button') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  it('should enable Add button when valid email is entered', () => {
    component.emailControl.setValue('test@example.com');
    fixture.detectChanges();
    
    const addButton = fixture.nativeElement.querySelector('.add-button') as HTMLButtonElement;
    expect(addButton.disabled).toBe(false);
  });

  it('should display current members list', () => {
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

  it('should show remove button for collaborators', () => {
    const memberItems = fixture.nativeElement.querySelectorAll('.member-item');
    const collaboratorItem = Array.from(memberItems).find((item: any) =>
      item.querySelector('.editor-badge')
    ) as HTMLElement | undefined;
    const removeButton = collaboratorItem?.querySelector('.remove-button');
    expect(removeButton).toBeTruthy();
  });

  it('should call shareWorkspace when Add button is clicked', async () => {
    mockWorkspaceService.shareWorkspace.and.returnValue(Promise.resolve());
    
    component.emailControl.setValue('newuser@example.com');
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.add-button') as HTMLElement;
    addButton.click();

    await fixture.whenStable();

    expect(mockWorkspaceService.shareWorkspace).toHaveBeenCalledWith('ws1', 'newuser@example.com');
  });

  it('should clear email input after successful invitation', async () => {
    mockWorkspaceService.shareWorkspace.and.returnValue(Promise.resolve());
    
    component.emailControl.setValue('newuser@example.com');
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.add-button') as HTMLElement;
    addButton.click();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.emailControl.value).toBe('');
  });

  it('should show loading spinner during invitation', async () => {
    mockWorkspaceService.shareWorkspace.and.returnValue(
      new Promise(resolve => setTimeout(resolve, 100))
    );
    
    component.emailControl.setValue('newuser@example.com');
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.add-button') as HTMLElement;
    addButton.click();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(true);
    const spinner = fixture.nativeElement.querySelector('mat-spinner');
    expect(spinner).toBeTruthy();
  });

  it('should call removeCollaborator when remove button is clicked', async () => {
    mockWorkspaceService.removeCollaborator.and.returnValue(Promise.resolve());
    
    const removeButtons = fixture.nativeElement.querySelectorAll('.remove-button');
    const firstRemoveButton = removeButtons[0] as HTMLElement;
    firstRemoveButton.click();

    await fixture.whenStable();

    expect(mockWorkspaceService.removeCollaborator).toHaveBeenCalledWith('ws1', 'user2');
  });

  it('should close dialog when Close button is clicked', () => {
    const closeButton = fixture.nativeElement.querySelector('.close-button') as HTMLElement;
    closeButton.click();

    expect(mockDialogRef.close).toHaveBeenCalled();
  });

  it('should show error message when invitation fails', async () => {
    mockWorkspaceService.shareWorkspace.and.returnValue(
      Promise.reject(new Error('User not found'))
    );
    
    component.emailControl.setValue('nonexistent@example.com');
    fixture.detectChanges();

    const addButton = fixture.nativeElement.querySelector('.add-button') as HTMLElement;
    addButton.click();

    await fixture.whenStable();
    fixture.detectChanges();

    const errorMessage = fixture.nativeElement.querySelector('.error-message');
    expect(errorMessage).toBeTruthy();
    expect(errorMessage?.textContent).toContain('User not found');
  });

  it('should validate email format', () => {
    component.emailControl.setValue('invalid-email');
    fixture.detectChanges();
    
    expect(component.emailControl.invalid).toBe(true);
    
    const addButton = fixture.nativeElement.querySelector('.add-button') as HTMLButtonElement;
    expect(addButton.disabled).toBe(true);
  });

  it('should display member email addresses', () => {
    const memberEmails = fixture.nativeElement.querySelectorAll('.member-email');
    expect(memberEmails.length).toBe(2);
    
    const emails = Array.from(memberEmails).map((el: any) => el.textContent?.trim());
    expect(emails).toContain('owner@example.com');
    expect(emails).toContain('collaborator@example.com');
  });
});
