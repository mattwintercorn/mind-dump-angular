// src/app/core/services/database.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { DatabaseService } from './database.service';
import Dexie from 'dexie';
import indexedDB from 'fake-indexeddb';
import IDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(() => {
    // Configure Dexie to use fake-indexeddb
    Dexie.dependencies.indexedDB = indexedDB;
    Dexie.dependencies.IDBKeyRange = IDBKeyRange;
    
    TestBed.configureTestingModule({
      providers: [DatabaseService]
    });
    service = TestBed.inject(DatabaseService);
  });

  afterEach(async () => {
    await service.delete();
    // Clean up
    await indexedDB.deleteDatabase('MindDumpDB');
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have ideas table', () => {
    expect(service.ideas).toBeDefined();
  });

  it('should have connections table', () => {
    expect(service.connections).toBeDefined();
  });

  it('should have settings table', () => {
    expect(service.settings).toBeDefined();
  });
});
