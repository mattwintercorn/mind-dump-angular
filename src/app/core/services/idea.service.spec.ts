// src/app/core/services/idea.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { IdeaService } from './idea.service';
import { DatabaseService } from './database.service';
import { ColorService } from './color.service';
import { CreateIdeaData } from '../models/idea.model';
import Dexie from 'dexie';
import indexedDB from 'fake-indexeddb';
import IDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';

describe('IdeaService', () => {
  let service: IdeaService;
  let db: DatabaseService;

  beforeEach(() => {
    // Configure Dexie to use fake-indexeddb
    Dexie.dependencies.indexedDB = indexedDB;
    Dexie.dependencies.IDBKeyRange = IDBKeyRange;

    TestBed.configureTestingModule({
      providers: [IdeaService, DatabaseService, ColorService]
    });
    service = TestBed.inject(IdeaService);
    db = TestBed.inject(DatabaseService);
  });

  afterEach(async () => {
    await db.ideas.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should start with empty ideas', () => {
    expect(service.ideas().length).toBe(0);
  });

  it('should add idea and update signal', async () => {
    const data: CreateIdeaData = {
      title: 'Test Idea',
      description: 'Test description',
      keywords: ['test', 'angular'],
      status: 'new',
      priority: 'medium',
      color: '#3B82F6'
    };

    const id = await service.addIdea(data);

    expect(id).toBeDefined();
    expect(service.ideas().length).toBe(1);
    expect(service.ideas()[0].title).toBe('Test Idea');
    expect(service.ideas()[0].id).toBe(id);
  });

  it('should update idea and refresh signal', async () => {
    const data: CreateIdeaData = {
      title: 'Original Title',
      description: 'Original description',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    };

    const id = await service.addIdea(data);
    await service.updateIdea(id, { title: 'Updated Title' });

    const updated = service.ideas()[0];
    expect(updated.title).toBe('Updated Title');
    expect(updated.description).toBe('Original description');
  });

  it('should delete idea and update signal', async () => {
    const data: CreateIdeaData = {
      title: 'To Delete',
      description: '',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    };

    const id = await service.addIdea(data);
    expect(service.ideas().length).toBe(1);

    await service.deleteIdea(id);
    expect(service.ideas().length).toBe(0);
  });

  it('should get idea by id', async () => {
    const data: CreateIdeaData = {
      title: 'Find Me',
      description: '',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    };

    const id = await service.addIdea(data);
    const found = await service.getIdea(id);

    expect(found).toBeDefined();
    expect(found?.title).toBe('Find Me');
  });

  it('should return null for non-existent id', async () => {
    const found = await service.getIdea('non-existent-id');
    expect(found).toBeUndefined();
  });

  it('should compute idea count', async () => {
    expect(service.ideaCount()).toBe(0);

    await service.addIdea({
      title: 'Idea 1',
      description: '',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    });

    expect(service.ideaCount()).toBe(1);

    await service.addIdea({
      title: 'Idea 2',
      description: '',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    });

    expect(service.ideaCount()).toBe(2);
  });

  it('should compute all keywords', async () => {
    await service.addIdea({
      title: 'Idea 1',
      description: '',
      keywords: ['typescript', 'angular'],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    });

    await service.addIdea({
      title: 'Idea 2',
      description: '',
      keywords: ['angular', 'rxjs'],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    });

    const keywords = service.allKeywords();
    expect(keywords.length).toBe(3);
    expect(keywords).toContain('typescript');
    expect(keywords).toContain('angular');
    expect(keywords).toContain('rxjs');
  });

  it('should set loading state during operations', async () => {
    const addPromise = service.addIdea({
      title: 'Test',
      description: '',
      keywords: [],
      status: 'new',
      priority: 'low',
      color: '#3B82F6'
    });

    // Loading should be true during operation
    expect(service.loading()).toBe(true);

    await addPromise;

    // Loading should be false after operation
    expect(service.loading()).toBe(false);
  });

  it('should auto-generate color from first keyword', async () => {
    const colorService = TestBed.inject(ColorService);
    const expectedColor = colorService.getKeywordColor('testing');

    const id = await service.addIdea({
      title: 'Test',
      description: '',
      keywords: ['testing', 'other'],
      status: 'new',
      priority: 'low',
      color: '' // Empty color should trigger auto-generation
    });

    const idea = service.ideas()[0];
    expect(idea.color).toBe(expectedColor);
  });
});
