import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignInButtonComponent } from './sign-in-button.component';
import { AuthService } from '../../../../core/services/auth.service';
import { signal } from '@angular/core';

describe('SignInButtonComponent', () => {
  let component: SignInButtonComponent;
  let fixture: ComponentFixture<SignInButtonComponent>;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['signInWithGitHub'], {
      currentUser: signal(null),
      authState: signal('anonymous' as const),
      isAuthenticated: signal(false)
    });

    await TestBed.configureTestingModule({
      imports: [SignInButtonComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SignInButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call authService.signInWithGitHub on click', async () => {
    mockAuthService.signInWithGitHub.and.returnValue(Promise.resolve());

    const button = fixture.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();

    expect(mockAuthService.signInWithGitHub).toHaveBeenCalled();
  });

  it('should show loading state during sign in', async () => {
    let resolveSignIn: () => void;
    const signInPromise = new Promise<void>((resolve) => {
      resolveSignIn = resolve;
    });
    
    mockAuthService.signInWithGitHub.and.returnValue(signInPromise);

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
