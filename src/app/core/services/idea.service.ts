// src/app/core/services/idea.service.ts
import { Injectable, signal, computed, inject } from '@angular/core';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from './database.service';
import { ColorService } from './color.service';
import { Idea, CreateIdeaData, UpdateIdeaData } from '../models/idea.model';

@Injectable({
  providedIn: 'root'
})
export class IdeaService {
  private db = inject(DatabaseService);
  private colorService = inject(ColorService);

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
   * Add a new idea to the database
   */
  async addIdea(data: CreateIdeaData): Promise<string> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    console.log('IdeaService.addIdea received data:', data);

    try {
      const id = uuidv4();
      const now = new Date();

      // Auto-generate color from first keyword if not provided
      const color = data.color || (data.keywords.length > 0 
        ? this.colorService.getKeywordColor(data.keywords[0])
        : '#3B82F6');

      const idea: Idea = {
        ...data,
        id,
        color,
        createdAt: now,
        updatedAt: now
      };

      console.log('IdeaService.addIdea creating idea:', idea);

      await this.db.ideas.add(idea);
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
      await this.db.ideas.update(id, {
        ...data,
        updatedAt: new Date()
      });
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
      await this.db.ideas.delete(id);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load ideas';
      this.errorSignal.set(message);
    }
  }
}
