import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IdeaCardComponent } from '../idea-card/idea-card.component';
import { IdeaService } from '../../../../core/services/idea.service';
import { Idea } from '../../../../core/models/idea.model';

@Component({
  selector: 'app-idea-list',
  standalone: true,
  imports: [CommonModule, IdeaCardComponent],
  templateUrl: './idea-list.component.html',
  styleUrls: ['./idea-list.component.scss']
})
export class IdeaListComponent {
  private ideaService = inject(IdeaService);

  @Output() ideaSelected = new EventEmitter<Idea>();
  @Output() ideaEdit = new EventEmitter<Idea>();

  get ideas() {
    return this.ideaService.ideas();
  }

  get loading() {
    return this.ideaService.loading();
  }

  onIdeaClick(idea: Idea): void {
    this.ideaSelected.emit(idea);
  }

  onIdeaEdit(idea: Idea): void {
    this.ideaEdit.emit(idea);
  }

  onIdeaDelete(ideaId: string): void {
    this.ideaService.deleteIdea(ideaId);
  }
}
