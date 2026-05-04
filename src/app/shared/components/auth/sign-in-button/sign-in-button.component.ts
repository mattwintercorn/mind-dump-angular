import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-sign-in-button',
  standalone: true,
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
  
  // Loading state signal
  isLoading = signal(false);

  /**
   * Handle sign in button click
   */
  async onSignIn(): Promise<void> {
    if (this.isLoading()) return;
    
    try {
      this.isLoading.set(true);
      await this.authService.signInWithGitHub();
    } catch (error) {
      console.error('Sign in failed:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
