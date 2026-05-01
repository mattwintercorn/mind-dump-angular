// src/app/core/services/project.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService, Project } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private db = inject(DatabaseService);

  // Private writable signals
  private projectsSignal = signal<Project[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Public readonly signals
  readonly projects = this.projectsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // Computed signals
  readonly projectNames = computed(() => 
    this.projectsSignal().map(p => p.name).sort()
  );

  constructor() {
    this.loadProjects();
  }

  /**
   * Add a new project
   */
  async addProject(name: string, description?: string): Promise<string> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const id = uuidv4();
      const project: Project = {
        id,
        name: name.trim(),
        description: description?.trim(),
        createdAt: new Date()
      };

      await this.db.projects.add(project);
      await this.loadProjects();
      
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add project';
      this.errorSignal.set(message);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Delete a project
   */
  async deleteProject(id: string): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      await this.db.projects.delete(id);
      await this.loadProjects();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete project';
      this.errorSignal.set(message);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get or create a project by name
   */
  async getOrCreateProject(name: string): Promise<string> {
    const existing = this.projectsSignal().find(
      p => p.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existing) {
      return existing.id;
    }

    return await this.addProject(name);
  }

  /**
   * Reload all projects from database
   */
  private async loadProjects(): Promise<void> {
    try {
      const allProjects = await this.db.projects.toArray();
      this.projectsSignal.set(allProjects);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      this.errorSignal.set(message);
    }
  }
}
