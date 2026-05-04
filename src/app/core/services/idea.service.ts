// src/app/core/services/idea.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { ColorService } from './color.service';
import { ComponentService } from './component.service';
import { ProjectService } from './project.service';
import { SyncService } from './sync.service';
import { AuthService } from './auth.service';
import { Idea, CreateIdeaData, UpdateIdeaData } from '../models/idea.model';

@Injectable({
  providedIn: 'root'
})
export class IdeaService {
  private db = inject(DatabaseService);
  private colorService = inject(ColorService);
  private componentService = inject(ComponentService);
  private projectService = inject(ProjectService);
  private syncService = inject(SyncService);
  private authService = inject(AuthService);

  // Private writable signals
  private ideasSignal = signal<Idea[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Public readonly signals
  readonly ideas = this.ideasSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // Computed signals
  readonly ideaCount = computed(() => this.ideasSignal().length);
  readonly allKeywords = computed(() => {
    const keywordSet = new Set<string>();
    this.ideasSignal().forEach(idea => {
      idea.keywords.forEach(keyword => keywordSet.add(keyword));
    });
    return Array.from(keywordSet).sort();
  });

  constructor() {
    this.loadIdeas();
  }

  /**
   * Get the active workspace ID
   * Returns the authenticated user's default workspace, or 'local-default' for anonymous users
   */
  private getActiveWorkspaceId(): string {
    const user = this.authService.currentUser();
    if (user && this.authService.isAuthenticated()) {
      // For authenticated users, return their default workspace ID
      // TODO: In future, allow users to switch workspaces
      return 'local-default'; // For now, still use local-default during migration
    }
    return 'local-default';
  }

  /**
   * Add a new idea to the database
   */
  async addIdea(data: CreateIdeaData): Promise<string> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    console.log('IdeaService.addIdea received data:', data);

    try {
      const id = uuidv4();
      const now = new Date();
      const workspaceId = this.getActiveWorkspaceId();
      const user = this.authService.currentUser();
      const userId = user?.uid || 'anonymous';

      // Auto-generate color from first keyword if not provided
      const color = data.color || (data.keywords.length > 0 
        ? this.colorService.getKeywordColor(data.keywords[0])
        : '#3B82F6');

      const idea: Idea = {
        ...data,
        id,
        color,
        createdAt: now,
        updatedAt: now,
        workspaceId,
        version: 1,
        createdBy: userId,
        lastModifiedBy: userId
      };

      console.log('IdeaService.addIdea creating idea:', idea);

      // Register component if provided
      if (data.component) {
        await this.componentService.getOrCreateComponent(data.component);
      }

      // Register project if provided
      if (data.project) {
        await this.projectService.getOrCreateProject(data.project);
      }

      await this.db.ideas.add(idea);
      
      // Queue sync change
      this.syncService.queueChange({
        type: 'create',
        entity: 'idea',
        id,
        workspaceId,
        timestamp: now,
        data: idea
      });
      
      await this.loadIdeas();
      
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add idea';
      this.errorSignal.set(message);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Update an existing idea
   */
  async updateIdea(id: string, data: UpdateIdeaData): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    console.log('IdeaService.updateIdea received data:', data);

    try {
      const now = new Date();
      const user = this.authService.currentUser();
      const userId = user?.uid || 'anonymous';
      
      // Get existing idea to retrieve current version
      const existingIdea = await this.db.ideas.get(id);
      const currentVersion = existingIdea?.version || 1;
      const workspaceId = existingIdea?.workspaceId || this.getActiveWorkspaceId();

      // Register component if provided
      if (data.component) {
        await this.componentService.getOrCreateComponent(data.component);
      }

      // Register project if provided
      if (data.project) {
        await this.projectService.getOrCreateProject(data.project);
      }

      const updateData = {
        ...data,
        updatedAt: now,
        version: currentVersion + 1,
        lastModifiedBy: userId
      };

      await this.db.ideas.update(id, updateData);
      
      // Get updated idea for sync
      const updatedIdea = await this.db.ideas.get(id);
      
      // Queue sync change
      if (updatedIdea) {
        this.syncService.queueChange({
          type: 'update',
          entity: 'idea',
          id,
          workspaceId,
          timestamp: now,
          data: updatedIdea
        });
      }
      
      await this.loadIdeas();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update idea';
      this.errorSignal.set(message);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Delete an idea
   */
  async deleteIdea(id: string): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const now = new Date();
      
      // Get existing idea to retrieve workspace info
      const existingIdea = await this.db.ideas.get(id);
      const workspaceId = existingIdea?.workspaceId || this.getActiveWorkspaceId();
      
      await this.db.ideas.delete(id);
      
      // Queue sync change (data is null for delete operations)
      this.syncService.queueChange({
        type: 'delete',
        entity: 'idea',
        id,
        workspaceId,
        timestamp: now,
        data: null
      });
      
      await this.loadIdeas();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete idea';
      this.errorSignal.set(message);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get a single idea by ID
   */
  async getIdea(id: string): Promise<Idea | undefined> {
    return await this.db.ideas.get(id);
  }

  /**
   * Reload all ideas from database
   */
  private async loadIdeas(): Promise<void> {
    try {
      const allIdeas = await this.db.ideas.toArray();
      this.ideasSignal.set(allIdeas);
      
      // Extract and register any components from existing ideas
      const components = new Set<string>();
      const projects = new Set<string>();
      allIdeas.forEach(idea => {
        if (idea.component) {
          components.add(idea.component);
        }
        if (idea.project) {
          projects.add(idea.project);
        }
      });
      
      // Register all unique components and projects
      for (const componentName of components) {
        await this.componentService.getOrCreateComponent(componentName);
      }
      for (const projectName of projects) {
        await this.projectService.getOrCreateProject(projectName);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load ideas';
      this.errorSignal.set(message);
    }
  }
}
