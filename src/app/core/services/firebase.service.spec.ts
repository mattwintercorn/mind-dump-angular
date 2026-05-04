import { TestBed } from '@angular/core/testing';
import { FirebaseService } from './firebase.service';

describe('FirebaseService', () => {
  let service: FirebaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FirebaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have auth instance', () => {
    expect(service.auth).toBeDefined();
  });

  it('should have database instance', () => {
    expect(service.database).toBeDefined();
  });

  it('should expose connected signal', () => {
    expect(service.isConnected()).toBeDefined();
  });
});
