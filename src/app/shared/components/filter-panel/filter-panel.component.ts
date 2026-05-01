// src/app/shared/components/filter-panel/filter-panel.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { FilterService, SortOption } from '../../../core/services/filter.service';
import { IdeaService } from '../../../core/services/idea.service';
import { ComponentService } from '../../../core/services/component.service';
import { ProjectService } from '../../../core/services/project.service';
import { IdeaStatus } from '../../../core/models/idea.model';

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatButtonModule,
    MatExpansionModule
  ],
  templateUrl: './filter-panel.component.html',
  styleUrls: ['./filter-panel.component.scss']
})
export class FilterPanelComponent {
  filterService = inject(FilterService);
  ideaService = inject(IdeaService);
  componentService = inject(ComponentService);
  projectService = inject(ProjectService);

  statusOptions: IdeaStatus[] = ['new', 'active', 'completed', 'archived'];
  
  sortOptions: { value: SortOption; label: string }[] = [
    { value: 'title-asc', label: 'Title (A-Z)' },
    { value: 'title-desc', label: 'Title (Z-A)' },
    { value: 'created-desc', label: 'Newest First' },
    { value: 'created-asc', label: 'Oldest First' },
    { value: 'updated-desc', label: 'Recently Updated' },
    { value: 'updated-asc', label: 'Least Recently Updated' },
    { value: 'priority-desc', label: 'Priority (High-Low)' },
    { value: 'priority-asc', label: 'Priority (Low-High)' },
  ];

  get searchQuery(): string {
    return this.filterService.searchQuery();
  }

  set searchQuery(value: string) {
    this.filterService.setSearchQuery(value);
  }

  get selectedStatus(): IdeaStatus | null {
    return this.filterService.selectedStatus();
  }

  set selectedStatus(value: IdeaStatus | null) {
    this.filterService.setStatus(value);
  }

  get selectedComponent(): string | null {
    return this.filterService.selectedComponent();
  }

  set selectedComponent(value: string | null) {
    this.filterService.setComponent(value);
  }

  get selectedProject(): string | null {
    return this.filterService.selectedProject();
  }

  set selectedProject(value: string | null) {
    this.filterService.setProject(value);
  }

  get selectedSort(): SortOption {
    return this.filterService.sortOption();
  }

  set selectedSort(value: SortOption) {
    this.filterService.setSortOption(value);
  }

  isKeywordSelected(keyword: string): boolean {
    return this.filterService.selectedKeywords().includes(keyword);
  }

  toggleKeyword(keyword: string): void {
    this.filterService.toggleKeyword(keyword);
  }

  clearFilters(): void {
    this.filterService.clearFilters();
  }
}
