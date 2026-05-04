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
});
