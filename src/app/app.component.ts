import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToolbarComponent, ViewMode } from './shared/components/layout/toolbar/toolbar.component';
import { IdeaFormComponent } from './features/ideas/components/idea-form/idea-form.component';
import { IdeaService } from './core/services/idea.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToolbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private dialog = inject(MatDialog);
  private ideaService = inject(IdeaService);
  
  viewMode: ViewMode = 'grid';

  onNewIdea(): void {
    const dialogRef = this.dialog.open(IdeaFormComponent, {
      width: '600px',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ideaService.addIdea(result);
      }
    });
  }

  onViewModeChange(mode: ViewMode): void {
    console.log('View mode changed to:', mode);
    this.viewMode = mode;
  }
}
