import { Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { WorkspaceService } from '../../../../core/services/workspace.service';

@Component({
  selector: 'app-workspace-switcher',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './workspace-switcher.component.html',
  styleUrls: ['./workspace-switcher.component.scss']
})
export class WorkspaceSwitcherComponent {
  workspaceService = inject(WorkspaceService);
  
  createWorkspace = output<void>();

  async onWorkspaceClick(workspaceId: string): Promise<void> {
    await this.workspaceService.switchWorkspace(workspaceId);
  }

  onCreateWorkspace(): void {
    this.createWorkspace.emit();
  }

  isActive(workspaceId: string): boolean {
    return this.workspaceService.activeWorkspace()?.id === workspaceId;
  }
}
