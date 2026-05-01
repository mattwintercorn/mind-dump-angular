import { Injectable, computed, signal } from '@angular/core';
import { Idea, IdeaStatus } from '../models/idea.model';

export type SortOption = 
  | 'title-asc' 
  | 'title-desc' 
  | 'created-asc' 
  | 'created-desc' 
  | 'updated-asc' 
  | 'updated-desc'
  | 'priority-desc'
  | 'priority-asc';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  // Filter state signals
  private readonly _searchQuery = signal<string>('');
  private readonly _selectedKeywords = signal<string[]>([]);
  private readonly _selectedStatus = signal<IdeaStatus | null>(null);
  private readonly _selectedComponent = signal<string | null>(null);
  private readonly _selectedProject = signal<string | null>(null);
  private readonly _sortOption = signal<SortOption>('title-asc');

  // Public read-only signals
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly selectedKeywords = this._selectedKeywords.asReadonly();
  readonly selectedStatus = this._selectedStatus.asReadonly();
  readonly selectedComponent = this._selectedComponent.asReadonly();
  readonly selectedProject = this._selectedProject.asReadonly();
  readonly sortOption = this._sortOption.asReadonly();

  // Computed values
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this._searchQuery()) count++;
    if (this._selectedKeywords().length > 0) count += this._selectedKeywords().length;
    if (this._selectedStatus() !== null) count++;
    if (this._selectedComponent() !== null) count++;
    if (this._selectedProject() !== null) count++;
    return count;
  });

  readonly hasActiveFilters = computed(() => this.activeFilterCount() > 0);

  // Filter methods
  setSearchQuery(query: string): void {
    this._searchQuery.set(query);
  }

  toggleKeyword(keyword: string): void {
    const current = this._selectedKeywords();
    if (current.includes(keyword)) {
      this._selectedKeywords.set(current.filter((k) => k !== keyword));
    } else {
      this._selectedKeywords.set([...current, keyword]);
    }
  }

  setStatus(status: IdeaStatus | null): void {
    this._selectedStatus.set(status);
  }

  setComponent(component: string | null): void {
    this._selectedComponent.set(component);
  }

  setProject(project: string | null): void {
    this._selectedProject.set(project);
  }

  setSortOption(option: SortOption): void {
    this._sortOption.set(option);
  }

  clearFilters(): void {
    this._searchQuery.set('');
    this._selectedKeywords.set([]);
    this._selectedStatus.set(null);
    this._selectedComponent.set(null);
    this._selectedProject.set(null);
    // Don't reset sort on clear filters
  }

  // Apply all filters to an array of ideas
  filterIdeas(ideas: Idea[]): Idea[] {
    let filtered = ideas;

    // Apply search query filter
    const query = this._searchQuery().toLowerCase();
    if (query) {
      filtered = filtered.filter((idea) => {
        const titleMatch = idea.title.toLowerCase().includes(query);
        const descriptionMatch = idea.description.toLowerCase().includes(query);
        const keywordMatch = idea.keywords.some((k) =>
          k.toLowerCase().includes(query)
        );
        return titleMatch || descriptionMatch || keywordMatch;
      });
    }

    // Apply keyword filter (AND logic - idea must have ALL selected keywords)
    const keywords = this._selectedKeywords();
    if (keywords.length > 0) {
      filtered = filtered.filter((idea) =>
        keywords.every((keyword) =>
          idea.keywords.some(
            (k) => k.toLowerCase() === keyword.toLowerCase()
          )
        )
      );
    }

    // Apply status filter
    const status = this._selectedStatus();
    if (status !== null) {
      filtered = filtered.filter((idea) => idea.status === status);
    }

    // Apply component filter
    const component = this._selectedComponent();
    if (component !== null) {
      filtered = filtered.filter((idea) => idea.component === component);
    }

    // Apply project filter
    const project = this._selectedProject();
    if (project !== null) {
      filtered = filtered.filter((idea) => idea.project === project);
    }

    // Apply sorting
    const sort = this._sortOption();
    filtered = this.sortIdeas(filtered, sort);

    return filtered;
  }

  private sortIdeas(ideas: Idea[], sortOption: SortOption): Idea[] {
    const sorted = [...ideas];

    switch (sortOption) {
      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'title-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));
      case 'created-asc':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'created-desc':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'updated-asc':
        return sorted.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      case 'updated-desc':
        return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      case 'priority-desc':
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return sorted.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
      case 'priority-asc':
        const priorityOrderAsc = { high: 3, medium: 2, low: 1 };
        return sorted.sort((a, b) => priorityOrderAsc[a.priority] - priorityOrderAsc[b.priority]);
      default:
        return sorted;
    }
  }
}
