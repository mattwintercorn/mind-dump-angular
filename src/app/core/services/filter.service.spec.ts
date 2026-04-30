import { TestBed } from '@angular/core/testing';
import { FilterService } from './filter.service';
import { Idea, IdeaStatus } from '../models/idea.model';

describe('FilterService', () => {
  let service: FilterService;

  const mockIdeas: Idea[] = [
    {
      id: '1',
      title: 'Angular Project',
      description: 'Build an Angular app',
      keywords: ['angular', 'typescript'],
      status: 'active' as IdeaStatus,
      priority: 'medium',
      color: '#FF5733',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    },
    {
      id: '2',
      title: 'React Component',
      description: 'Create a React component',
      keywords: ['react', 'javascript'],
      status: 'new' as IdeaStatus,
      priority: 'low',
      color: '#33FF57',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    },
    {
      id: '3',
      title: 'Vue Dashboard',
      description: 'Design a Vue dashboard with TypeScript',
      keywords: ['vue', 'typescript', 'design'],
      status: 'completed' as IdeaStatus,
      priority: 'high',
      color: '#3357FF',
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
    },
    {
      id: '4',
      title: 'Node API',
      description: 'Build REST API with Node',
      keywords: ['node', 'api'],
      status: 'archived' as IdeaStatus,
      priority: 'medium',
      color: '#F333FF',
      createdAt: new Date('2024-01-04'),
      updatedAt: new Date('2024-01-04'),
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FilterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Initial State', () => {
    it('should initialize with empty filters', () => {
      expect(service.searchQuery()).toBe('');
      expect(service.selectedKeywords()).toEqual([]);
      expect(service.selectedStatus()).toBeNull();
      expect(service.activeFilterCount()).toBe(0);
      expect(service.hasActiveFilters()).toBe(false);
    });
  });

  describe('Search Query', () => {
    it('should update search query', () => {
      service.setSearchQuery('angular');
      expect(service.searchQuery()).toBe('angular');
      expect(service.activeFilterCount()).toBe(1);
      expect(service.hasActiveFilters()).toBe(true);
    });

    it('should filter ideas by title (case-insensitive)', () => {
      service.setSearchQuery('angular');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should filter ideas by description (case-insensitive)', () => {
      service.setSearchQuery('REST API');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('4');
    });

    it('should filter ideas by keywords (case-insensitive)', () => {
      service.setSearchQuery('typescript');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(2);
      expect(filtered.map((i: Idea) => i.id)).toEqual(['1', '3']);
    });
  });

  describe('Keyword Filter', () => {
    it('should toggle keyword selection', () => {
      service.toggleKeyword('angular');
      expect(service.selectedKeywords()).toEqual(['angular']);
      expect(service.activeFilterCount()).toBe(1);

      service.toggleKeyword('angular');
      expect(service.selectedKeywords()).toEqual([]);
      expect(service.activeFilterCount()).toBe(0);
    });

    it('should filter ideas with ALL selected keywords (AND logic)', () => {
      service.toggleKeyword('typescript');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(2);
      expect(filtered.map((i: Idea) => i.id)).toEqual(['1', '3']);

      service.toggleKeyword('angular');
      const filtered2 = service.filterIdeas(mockIdeas);
      expect(filtered2.length).toBe(1);
      expect(filtered2[0].id).toBe('1');
    });
  });

  describe('Status Filter', () => {
    it('should update status filter', () => {
      service.setStatus('active');
      expect(service.selectedStatus()).toBe('active');
      expect(service.activeFilterCount()).toBe(1);
    });

    it('should filter ideas by status', () => {
      service.setStatus('active');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should clear status filter when set to null', () => {
      service.setStatus('active');
      expect(service.selectedStatus()).toBe('active');

      service.setStatus(null);
      expect(service.selectedStatus()).toBeNull();
      expect(service.activeFilterCount()).toBe(0);
    });
  });

  describe('Combined Filters', () => {
    it('should apply search AND keyword filters', () => {
      service.setSearchQuery('typescript');
      service.toggleKeyword('angular');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should apply all filters together (search AND keywords AND status)', () => {
      service.setSearchQuery('typescript');
      service.toggleKeyword('vue');
      service.setStatus('completed');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('3');
    });
  });

  describe('Clear Filters', () => {
    it('should clear all filters', () => {
      service.setSearchQuery('angular');
      service.toggleKeyword('typescript');
      service.setStatus('active');

      expect(service.hasActiveFilters()).toBe(true);
      expect(service.activeFilterCount()).toBe(3);

      service.clearFilters();

      expect(service.searchQuery()).toBe('');
      expect(service.selectedKeywords()).toEqual([]);
      expect(service.selectedStatus()).toBeNull();
      expect(service.activeFilterCount()).toBe(0);
      expect(service.hasActiveFilters()).toBe(false);

      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(4);
    });
  });
});
