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
      component: 'Frontend',
      project: 'Web App',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-05'),
    },
    {
      id: '2',
      title: 'React Component',
      description: 'Create a React component',
      keywords: ['react', 'javascript'],
      status: 'new' as IdeaStatus,
      priority: 'low',
      color: '#33FF57',
      component: 'Frontend',
      project: 'Mobile App',
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
      component: 'Backend',
      project: 'Web App',
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
      component: 'Backend',
      project: 'API Service',
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
      expect(service.selectedComponent()).toBeNull();
      expect(service.selectedProject()).toBeNull();
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

    it('should handle ideas without keywords', () => {
      const ideasWithoutKeywords = [
        { ...mockIdeas[0], keywords: undefined as any },
        { ...mockIdeas[1], keywords: null as any }
      ];
      service.toggleKeyword('angular');
      const filtered = service.filterIdeas(ideasWithoutKeywords);
      expect(filtered.length).toBe(0);
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

  describe('Component Filter', () => {
    it('should update component filter', () => {
      service.setComponent('Frontend');
      expect(service.selectedComponent()).toBe('Frontend');
      expect(service.activeFilterCount()).toBe(1);
    });

    it('should filter ideas by component', () => {
      service.setComponent('Frontend');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(2);
      expect(filtered.map((i: Idea) => i.id)).toEqual(['1', '2']);
    });

    it('should clear component filter when set to null', () => {
      service.setComponent('Frontend');
      service.setComponent(null);
      expect(service.selectedComponent()).toBeNull();
      expect(service.activeFilterCount()).toBe(0);
    });
  });

  describe('Project Filter', () => {
    it('should update project filter', () => {
      service.setProject('Web App');
      expect(service.selectedProject()).toBe('Web App');
      expect(service.activeFilterCount()).toBe(1);
    });

    it('should filter ideas by project', () => {
      service.setProject('Web App');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(2);
      expect(filtered.map((i: Idea) => i.id)).toEqual(['1', '3']);
    });

    it('should clear project filter when set to null', () => {
      service.setProject('Web App');
      service.setProject(null);
      expect(service.selectedProject()).toBeNull();
      expect(service.activeFilterCount()).toBe(0);
    });
  });

  describe('Sorting', () => {
    it('should sort by title ascending', () => {
      service.setSortOption('title-asc');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered[0].title).toBe('Angular Project');
      expect(filtered[3].title).toBe('Vue Dashboard');
    });

    it('should sort by title descending', () => {
      service.setSortOption('title-desc');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered[0].title).toBe('Vue Dashboard');
      expect(filtered[3].title).toBe('Angular Project');
    });

    it('should sort by created date ascending', () => {
      service.setSortOption('created-asc');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered[0].id).toBe('1');
      expect(filtered[3].id).toBe('4');
    });

    it('should sort by created date descending', () => {
      service.setSortOption('created-desc');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered[0].id).toBe('4');
      expect(filtered[3].id).toBe('1');
    });

    it('should sort by updated date ascending', () => {
      service.setSortOption('updated-asc');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered[0].id).toBe('2');
      expect(filtered[3].id).toBe('1');
    });

    it('should sort by updated date descending', () => {
      service.setSortOption('updated-desc');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered[0].id).toBe('1');
      expect(filtered[3].id).toBe('2');
    });

    it('should sort by priority descending (high to low)', () => {
      service.setSortOption('priority-desc');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered[0].priority).toBe('high');
      expect(filtered[3].priority).toBe('low');
    });

    it('should sort by priority ascending (low to high)', () => {
      service.setSortOption('priority-asc');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered[0].priority).toBe('low');
      expect(filtered[3].priority).toBe('high');
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

    it('should apply all filters together', () => {
      service.setSearchQuery('typescript');
      service.toggleKeyword('vue');
      service.setStatus('completed');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('3');
    });

    it('should apply component and project filters together', () => {
      service.setComponent('Frontend');
      service.setProject('Web App');
      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should count all active filters correctly', () => {
      service.setSearchQuery('test');
      service.toggleKeyword('angular');
      service.toggleKeyword('typescript');
      service.setStatus('active');
      service.setComponent('Frontend');
      service.setProject('Web App');
      
      expect(service.activeFilterCount()).toBe(6); // 1 search + 2 keywords + 1 status + 1 component + 1 project
    });
  });

  describe('Edge Cases', () => {
    it('should handle null ideas array', () => {
      const filtered = service.filterIdeas(null as any);
      expect(filtered).toEqual([]);
    });

    it('should handle undefined ideas array', () => {
      const filtered = service.filterIdeas(undefined as any);
      expect(filtered).toEqual([]);
    });

    it('should handle empty ideas array', () => {
      const filtered = service.filterIdeas([]);
      expect(filtered).toEqual([]);
    });

    it('should handle ideas without keywords when searching', () => {
      const ideasWithoutKeywords = [
        { ...mockIdeas[0], keywords: undefined as any }
      ];
      service.setSearchQuery('angular');
      const filtered = service.filterIdeas(ideasWithoutKeywords);
      expect(filtered.length).toBe(1); // Should still match title
    });
  });

  describe('Clear Filters', () => {
    it('should clear all filters', () => {
      service.setSearchQuery('angular');
      service.toggleKeyword('typescript');
      service.setStatus('active');
      service.setComponent('Frontend');
      service.setProject('Web App');

      expect(service.hasActiveFilters()).toBe(true);
      expect(service.activeFilterCount()).toBe(5);

      service.clearFilters();

      expect(service.searchQuery()).toBe('');
      expect(service.selectedKeywords()).toEqual([]);
      expect(service.selectedStatus()).toBeNull();
      expect(service.selectedComponent()).toBeNull();
      expect(service.selectedProject()).toBeNull();
      expect(service.activeFilterCount()).toBe(0);
      expect(service.hasActiveFilters()).toBe(false);

      const filtered = service.filterIdeas(mockIdeas);
      expect(filtered.length).toBe(4);
    });

    it('should not clear sort option when clearing filters', () => {
      service.setSortOption('title-desc');
      service.setSearchQuery('test');
      
      service.clearFilters();
      
      expect(service.sortOption()).toBe('title-desc');
    });
  });
});

