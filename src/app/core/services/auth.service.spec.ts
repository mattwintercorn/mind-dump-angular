import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { DatabaseService } from './database.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        FirebaseService,
        DatabaseService
      ]
    });
    
    service = TestBed.inject(AuthService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should expose currentUser signal', () => {
    expect(service.currentUser).toBeDefined();
    expect(typeof service.currentUser).toBe('function');
  });

  it('should expose authState signal', () => {
    expect(service.authState).toBeDefined();
    expect(typeof service.authState).toBe('function');
    // Initial state should be loading or anonymous depending on Firebase
    const state = service.authState();
    expect(['loading', 'anonymous', 'authenticated'].includes(state)).toBe(true);
  });

  it('should expose isAuthenticated computed signal', () => {
    expect(service.isAuthenticated).toBeDefined();
    expect(typeof service.isAuthenticated).toBe('function');
    expect(typeof service.isAuthenticated()).toBe('boolean');
  });

  it('should have null user when not authenticated', () => {
    if (service.authState() === 'anonymous') {
      expect(service.currentUser()).toBeNull();
    }
  });

  it('should have isAuthenticated false when not authenticated', () => {
    if (service.authState() !== 'authenticated') {
      expect(service.isAuthenticated()).toBe(false);
    }
  });
  
  it('should throw error when handling merge without authenticated user', async () => {
    // If not authenticated, handleMergeStrategy should throw
    if (service.authState() !== 'authenticated') {
      await expectAsync(
        service.handleMergeStrategy('upload')
      ).toBeRejectedWithError('No authenticated user');
    }
  });
});



