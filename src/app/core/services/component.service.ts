// src/app/core/services/component.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService, SystemComponent } from './database.service';

@Injectable({
  providedIn: 'root'
})
export class ComponentService {
  private db = inject(DatabaseService);

  // Private writable signals
  private componentsSignal = signal<SystemComponent[]>([]);
  private loadingSignal = signal<boolean>(false);
  private errorSignal = signal<string | null>(null);

  // Public readonly signals
  readonly components = this.componentsSignal.asReadonly();
  readonly loading = this.loadingSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  // Computed signals
  readonly componentNames = computed(() => 
    this.componentsSignal().map(c => c.name).sort()
  );

  constructor() {
    this.loadComponents();
  }

  /**
   * Add a new system component
   */
  async addComponent(name: string, description?: string): Promise<string> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const id = uuidv4();
      const component: SystemComponent = {
        id,
        name: name.trim(),
        description: description?.trim(),
        createdAt: new Date()
      };

      await this.db.components.add(component);
      await this.loadComponents();
      
      return id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add component';
      this.errorSignal.set(message);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Delete a component
   */
  async deleteComponent(id: string): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      await this.db.components.delete(id);
      await this.loadComponents();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete component';
      this.errorSignal.set(message);
      throw err;
    } finally {
      this.loadingSignal.set(false);
    }
  }

  /**
   * Get or create a component by name
   */
  async getOrCreateComponent(name: string): Promise<string> {
    const existing = this.componentsSignal().find(
      c => c.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existing) {
      return existing.id;
    }

    return await this.addComponent(name);
  }

  /**
   * Reload all components from database
   */
  private async loadComponents(): Promise<void> {
    try {
      const allComponents = await this.db.components.toArray();
      this.componentsSignal.set(allComponents);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load components';
      this.errorSignal.set(message);
    }
  }
}
