import { Component, EventEmitter, Output, inject } from '@angular/core';

import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { IdeaCardComponent } from '../idea-card/idea-card.component';
import { IdeaFormComponent } from '../idea-form/idea-form.component';
import { FilterPanelComponent } from '../../../../shared/components/filter-panel/filter-panel.component';
import { IdeaService } from '../../../../core/services/idea.service';
import { FilterService } from '../../../../core/services/filter.service';
import { Idea } from '../../../../core/models/idea.model';

@Component({
    selector: 'app-idea-list',
    imports: [
    IdeaCardComponent,
    FilterPanelComponent,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
],
    templateUrl: './idea-list.component.html',
    styleUrls: ['./idea-list.component.scss']
})
export class IdeaListComponent {
  private ideaService = inject(IdeaService);
  filterService = inject(FilterService); // Make public for template access
  private dialog = inject(MatDialog);

  @Output() ideaSelected = new EventEmitter<Idea>();

  get ideas() {
    const ideas = this.ideaService.ideas();
    if (!ideas || !Array.isArray(ideas)) {
      return [];
    }
    return this.filterService.filterIdeas(ideas);
  }

  get loading() {
    return this.ideaService.loading();
  }

  onIdeaClick(idea: Idea): void {
    this.ideaSelected.emit(idea);
  }

  onIdeaEdit(idea: Idea): void {
    const dialogRef = this.dialog.open(IdeaFormComponent, {
      width: '600px',
      data: idea
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ideaService.updateIdea(idea.id, result);
      }
    });
  }

  onIdeaDelete(ideaId: string): void {
    const confirmed = confirm('Are you sure you want to delete this idea?');
    if (confirmed) {
      this.ideaService.deleteIdea(ideaId);
    }
  }

  onKeywordClick(keyword: string): void {
    this.filterService.toggleKeyword(keyword);
  }

  onRemoveKeywordFilter(keyword: string): void {
    this.filterService.toggleKeyword(keyword);
  }

  onClearFilters(): void {
    this.filterService.clearFilters();
  }
}
