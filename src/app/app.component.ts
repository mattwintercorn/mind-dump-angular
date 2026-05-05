import { Component, inject, OnInit, effect } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SwUpdate } from '@angular/service-worker';
import { ToolbarComponent, ViewMode } from './shared/components/layout/toolbar/toolbar.component';
import { IdeaFormComponent } from './features/ideas/components/idea-form/idea-form.component';
import { IdeaService } from './core/services/idea.service';
import { AuthService } from './core/services/auth.service';
import { WorkspaceService } from './core/services/workspace.service';
import { LoadingOverlayComponent } from './shared/components/loading-overlay/loading-overlay.component';
import { FirebaseDebugService } from './core/services/firebase-debug.service';

// Expose debug utilities to browser console
declare global {
  interface Window {
    debugFirebase: any;
  }
}

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToolbarComponent, LoadingOverlayComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private dialog = inject(MatDialog);
  private ideaService = inject(IdeaService);
  private router = inject(Router);
  private swUpdate = inject(SwUpdate);
  private snackBar = inject(MatSnackBar);
  private firebaseDebug = inject(FirebaseDebugService);
  authService = inject(AuthService);
  workspaceService = inject(WorkspaceService);
  
  viewMode: ViewMode = 'grid';

  constructor() {
    // Load workspaces when user authenticates
    effect(() => {
      if (this.authService.isAuthenticated()) {
        // Call async function outside effect context to prevent NG0600
        Promise.resolve().then(() => this.workspaceService.loadWorkspaces());
      }
    });

    // Expose debug utilities to browser console
    window.debugFirebase = {
      // Most useful commands
      syncIdeasFromFirebase: (wsId?: string) => this.firebaseDebug.syncIdeasFromFirebase(wsId),
      compareIdeas: () => this.firebaseDebug.compareIdeas(),
      clearLocalData: () => this.firebaseDebug.clearLocalData(),
      nukeEverything: () => this.firebaseDebug.nukeEverything(),
      searchForWorkspaces: () => this.firebaseDebug.searchForWorkspaces(),
      createTestWorkspace: () => this.firebaseDebug.createTestWorkspace(),
      
      // Diagnostics
      diagnostics: () => this.firebaseDebug.diagnostics(),
      checkConnectivity: () => this.firebaseDebug.checkConnectivity(),
      
      // Data inspection
      getUserProfile: () => this.firebaseDebug.getUserProfile(),
      getUserWorkspaces: () => this.firebaseDebug.getUserWorkspaces(),
      getAllWorkspaces: () => this.firebaseDebug.getAllWorkspaces(),
      getWorkspaceIdeas: (wsId: string) => this.firebaseDebug.getWorkspaceIdeas(wsId),
      dumpDatabase: () => this.firebaseDebug.dumpDatabase(),
      
      // Migration
      migrateWorkspaces: () => this.firebaseDebug.migrateWorkspaces(),
      migrateNestedIdeas: () => this.firebaseDebug.migrateNestedIdeas()
    };
  }

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
    const isMobile = window.innerWidth < 768;
    const dialogRef = this.dialog.open(IdeaFormComponent, {
      width: isMobile ? '95vw' : '600px',
      maxWidth: isMobile ? '95vw' : '600px',
      maxHeight: isMobile ? '90vh' : '80vh',
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
