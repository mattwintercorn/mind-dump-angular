import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignInButtonComponent } from './sign-in-button.component';
import { AuthService } from '../../../../core/services/auth.service';
import { DatabaseService } from '../../../../core/services/database.service';
import { MatDialog } from '@angular/material/dialog';
import { signal } from '@angular/core';
import { of } from 'rxjs';

describe('SignInButtonComponent', () => {
  let component: SignInButtonComponent;
  let fixture: ComponentFixture<SignInButtonComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockDbService: jasmine.SpyObj<DatabaseService>;
  let mockDialog: jasmine.SpyObj<MatDialog>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['signInWithGitHub', 'signOut', 'handleMergeStrategy'], {
      currentUser: signal(null),
      authState: signal('anonymous' as const),
      isAuthenticated: signal(false)
    });

    mockDbService = jasmine.createSpyObj('DatabaseService', [], {
      ideas: {
        toArray: jasmine.createSpy('toArray').and.returnValue(Promise.resolve([]))
      }
    });

    mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

    await TestBed.configureTestingModule({
      imports: [SignInButtonComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: DatabaseService, useValue: mockDbService },
        { provide: MatDialog, useValue: mockDialog }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignInButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call authService.signInWithGitHub on click with no local data', async () => {
    mockAuthService.signInWithGitHub.and.returnValue(Promise.resolve());
    (mockDbService.ideas.toArray as jasmine.Spy).and.returnValue(Promise.resolve([]));

    const button = fixture.nativeElement.querySelector('button');
    button.click();
    
    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(mockAuthService.signInWithGitHub).toHaveBeenCalled();
    expect(mockDialog.open).not.toHaveBeenCalled();
  });

  it('should show merge dialog when signing in with local data', async () => {
    const mockIdeas = [{ id: '1' }, { id: '2' }];
    (mockDbService.ideas.toArray as jasmine.Spy).and.returnValue(Promise.resolve(mockIdeas));
    mockAuthService.signInWithGitHub.and.returnValue(Promise.resolve());
    
    // Mock isAuthenticated to return true after sign in
    const isAuthenticatedSignal = signal(true);
    Object.defineProperty(mockAuthService, 'isAuthenticated', {
      get: () => isAuthenticatedSignal
    });
    
    const mockDialogRef = {
      afterClosed: () => of({ strategy: 'upload' })
    };
    mockDialog.open.and.returnValue(mockDialogRef as any);
    mockAuthService.handleMergeStrategy.and.returnValue(Promise.resolve());

    await component.onSignIn();
    
    expect(mockDialog.open).toHaveBeenCalled();
    expect(mockAuthService.handleMergeStrategy).toHaveBeenCalledWith('upload');
  });

  it('should sign out if user cancels merge dialog', async () => {
    const mockIdeas = [{ id: '1' }];
    (mockDbService.ideas.toArray as jasmine.Spy).and.returnValue(Promise.resolve(mockIdeas));
    mockAuthService.signInWithGitHub.and.returnValue(Promise.resolve());
    
    // Mock isAuthenticated to return true after sign in
    const isAuthenticatedSignal = signal(true);
    Object.defineProperty(mockAuthService, 'isAuthenticated', {
      get: () => isAuthenticatedSignal
    });
    
    const mockDialogRef = {
      afterClosed: () => of(null)
    };
    mockDialog.open.and.returnValue(mockDialogRef as any);
    mockAuthService.signOut.and.returnValue(Promise.resolve());

    await component.onSignIn();
    
    expect(mockAuthService.signOut).toHaveBeenCalled();
  });

  it('should show loading state during sign in', async () => {
    let resolveSignIn: () => void;
    const signInPromise = new Promise<void>((resolve) => {
      resolveSignIn = resolve;
    });
    
    mockAuthService.signInWithGitHub.and.returnValue(signInPromise);
    (mockDbService.ideas.toArray as jasmine.Spy).and.returnValue(Promise.resolve([]));

    const button = fixture.nativeElement.querySelector('button');
    button.click();
    
    // Wait a tick for async operation to start
    await Promise.resolve();
    fixture.detectChanges();

    expect(component.isLoading()).toBe(true);
    expect(button.disabled).toBe(true);
    
    const spinner = fixture.nativeElement.querySelector('mat-spinner');
    expect(spinner).toBeTruthy();

    // Resolve the sign in
    resolveSignIn!();
    await signInPromise;
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(button.disabled).toBe(false);
  });

  it('should handle sign in error', async () => {
    const consoleErrorSpy = spyOn(console, 'error');
    const error = new Error('Sign in failed');
    (mockDbService.ideas.toArray as jasmine.Spy).and.returnValue(Promise.resolve([]));
    mockAuthService.signInWithGitHub.and.returnValue(Promise.reject(error));

    await component.onSignIn();
    fixture.detectChanges();

    expect(consoleErrorSpy).toHaveBeenCalledWith('Sign in failed:', error);
    expect(component.isLoading()).toBe(false);
  });

  it('should not call signInWithGitHub if already loading', async () => {
    component.isLoading.set(true);
    fixture.detectChanges();

    await component.onSignIn();

    expect(mockAuthService.signInWithGitHub).not.toHaveBeenCalled();
  });

  it('should display "Sign in with GitHub" text', () => {
    const button = fixture.nativeElement.querySelector('button');
    expect(button.textContent).toContain('Sign in with GitHub');
  });

  it('should display GitHub icon when not loading', () => {
    component.isLoading.set(false);
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('mat-icon');
    expect(icon).toBeTruthy();
    expect(icon.textContent).toContain('account_circle');
  });
});
