import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { IdeaCardComponent } from '../idea-card/idea-card.component';
import { IdeaFormComponent } from '../idea-form/idea-form.component';
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
  private dialog = inject(MatDialog);

  @Output() ideaSelected = new EventEmitter<Idea>();

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
    this.ideaService.deleteIdea(ideaId);
  }
}
