import { Injectable, computed, signal } from '@angular/core';
import { Idea, IdeaStatus } from '../models/idea.model';

@Injectable({
  providedIn: 'root',
})
export class FilterService {
  // Filter state signals
  private readonly _searchQuery = signal<string>('');
  private readonly _selectedKeywords = signal<string[]>([]);
  private readonly _selectedStatus = signal<IdeaStatus | null>(null);

  // Public read-only signals
  readonly searchQuery = this._searchQuery.asReadonly();
  readonly selectedKeywords = this._selectedKeywords.asReadonly();
  readonly selectedStatus = this._selectedStatus.asReadonly();

  // Computed values
  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (this._searchQuery()) count++;
    if (this._selectedKeywords().length > 0) count += this._selectedKeywords().length;
    if (this._selectedStatus() !== null) count++;
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

  clearFilters(): void {
    this._searchQuery.set('');
    this._selectedKeywords.set([]);
    this._selectedStatus.set(null);
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

    return filtered;
  }
}
