// src/app/shared/components/loading-overlay/loading-overlay.component.ts
import { Component, Input } from '@angular/core';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-loading-overlay',
    imports: [MatProgressSpinnerModule],
    template: `
    @if (isVisible) {
      <div class="loading-overlay">
        <div class="loading-content">
          <mat-spinner diameter="60" [color]="'primary'"></mat-spinner>
          <p class="loading-text">{{ message }}</p>
        </div>
      </div>
    }
  `,
    styleUrls: ['./loading-overlay.component.scss']
})
export class LoadingOverlayComponent {
  @Input() isVisible = false;
  @Input() message = 'Loading...';
}
