import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../../core/services/auth.service';
import { DatabaseService } from '../../../../core/services/database.service';
import { MergeDialogComponent, MergeDialogResult } from '../../../../features/ideas/components/merge-dialog/merge-dialog.component';

@Component({
    selector: 'app-sign-in-button',
    imports: [
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule
    ],
    templateUrl: './sign-in-button.component.html',
    styleUrl: './sign-in-button.component.scss'
})
export class SignInButtonComponent {
  private authService = inject(AuthService);
  private db = inject(DatabaseService);
  private dialog = inject(MatDialog);
  
  // Loading state signal
  isLoading = signal(false);

  /**
   * Handle sign in button click
   */
  async onSignIn(): Promise<void> {
    if (this.isLoading()) return;
    
    try {
      this.isLoading.set(true);
      
      // Check if user has local data before signing in
      const localIdeas = await this.db.ideas.toArray();
      const hasLocalData = localIdeas.length > 0;
      
      // Perform sign in
      await this.authService.signInWithGitHub();
      
      // If user has local data and is newly authenticated, show merge dialog
      if (hasLocalData && this.authService.isAuthenticated()) {
        const dialogRef = this.dialog.open(MergeDialogComponent, {
          data: { localIdeasCount: localIdeas.length },
          disableClose: true,
          width: '600px'
        });
        
        const result = await dialogRef.afterClosed().toPromise() as MergeDialogResult | null;
        
        if (result) {
          // User selected a strategy
          await this.authService.handleMergeStrategy(result.strategy);
        } else {
          // User cancelled - sign them out
          await this.authService.signOut();
        }
      }
    } catch (error) {
      console.error('Sign in failed:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
