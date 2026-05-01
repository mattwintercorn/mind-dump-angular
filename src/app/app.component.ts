import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToolbarComponent, ViewMode } from './shared/components/layout/toolbar/toolbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToolbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  viewMode: ViewMode = 'grid';

  onNewIdea(): void {
    console.log('New idea clicked');
  }

  onViewModeChange(mode: ViewMode): void {
    console.log('View mode changed to:', mode);
    this.viewMode = mode;
  }
}
