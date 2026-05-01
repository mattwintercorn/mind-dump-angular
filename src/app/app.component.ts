import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate } from '@angular/service-worker';
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
export class AppComponent implements OnInit {
  private dialog = inject(MatDialog);
  private ideaService = inject(IdeaService);
  private router = inject(Router);
  private swUpdate = inject(SwUpdate);
  private snackBar = inject(MatSnackBar);
  
  viewMode: ViewMode = 'grid';

  ngOnInit(): void {
    if (this.swUpdate.isEnabled) {
      // Check for updates every hour
      setInterval(() => {
        this.swUpdate.checkForUpdate();
      }, 60 * 60 * 1000);

      // Listen for available updates
      this.swUpdate.versionUpdates.subscribe(event => {
        if (event.type === 'VERSION_READY') {
          const snackBarRef = this.snackBar.open(
            'New version available! Reload to update.',
            'Reload',
            { duration: 0 }
          );

          snackBarRef.onAction().subscribe(() => {
            window.location.reload();
          });
        }
      });
    }
  }

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
    this.viewMode = mode;
    if (mode === 'grid') {
      this.router.navigate(['/ideas']);
    } else if (mode === 'graph') {
      this.router.navigate(['/graph']);
    } else {
      this.router.navigate(['/cluster']);
    }
  }
}
