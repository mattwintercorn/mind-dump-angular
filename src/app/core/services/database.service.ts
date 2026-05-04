// src/app/core/services/database.service.ts
import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Idea } from '../models/idea.model';
import { Connection } from '../models/connection.model';
import { Settings } from '../models/settings.model';

export interface SystemComponent {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  workspaceId?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  workspaceId?: string;
}

export interface SystemWorkspace {
  id: string;
  name: string;
  ownerId: string;
  isDefault: boolean;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  syncStatus: 'synced' | 'pending' | 'error' | 'local-only';
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService extends Dexie {
  ideas!: Table<Idea, string>;
  connections!: Table<Connection, string>;
  settings!: Table<Settings, string>;
  components!: Table<SystemComponent, string>;
  projects!: Table<Project, string>;
  workspaces!: Table<SystemWorkspace, string>;

  constructor() {
    super('MindDumpDB');
    
    // Version 1: Original schema
    this.version(1).stores({
      ideas: 'id, status, *keywords, createdAt',
      connections: 'id, sourceId, targetId',
      settings: 'id'
    });

    // Version 2: Add component field to ideas and components table
    this.version(2).stores({
      ideas: 'id, status, component, *keywords, createdAt',
      connections: 'id, sourceId, targetId',
      settings: 'id',
      components: 'id, name, createdAt'
    });

    // Version 3: Add project field to ideas and projects table
    this.version(3).stores({
      ideas: 'id, status, component, project, *keywords, createdAt',
      connections: 'id, sourceId, targetId',
      settings: 'id',
      components: 'id, name, createdAt',
      projects: 'id, name, createdAt'
    });

    // Version 4: Add workspace support and sync fields
    this.version(4).stores({
      ideas: 'id, status, component, project, workspaceId, *keywords, createdAt',
      connections: 'id, sourceId, targetId, workspaceId',
      settings: 'id',
      components: 'id, name, workspaceId, createdAt',
      projects: 'id, name, workspaceId, createdAt',
      workspaces: 'id, ownerId, isDefault, createdAt'
    }).upgrade(async (trans) => {
      // Create default workspace
      const defaultWorkspace: SystemWorkspace = {
        id: 'local-default',
        name: 'Local (Not Synced)',
        ownerId: 'local-user',
        isDefault: true,
        role: 'owner',
        syncStatus: 'local-only',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await trans.table('workspaces').add(defaultWorkspace);

      // Migrate existing ideas
      const ideas = await trans.table('ideas').toArray();
      for (const idea of ideas) {
        if (!idea.workspaceId) {
          await trans.table('ideas').update(idea.id, {
            workspaceId: 'local-default',
            version: idea.version ?? 1,
            createdBy: idea.createdBy ?? 'local-user',
            lastModifiedBy: idea.lastModifiedBy ?? 'local-user'
          });
        }
      }

      // Migrate existing connections
      const connections = await trans.table('connections').toArray();
      for (const connection of connections) {
        if (!connection.workspaceId) {
          await trans.table('connections').update(connection.id, {
            workspaceId: 'local-default'
          });
        }
      }

      // Migrate existing components
      const components = await trans.table('components').toArray();
      for (const component of components) {
        if (!component.workspaceId) {
          await trans.table('components').update(component.id, {
            workspaceId: 'local-default'
          });
        }
      }

      // Migrate existing projects
      const projects = await trans.table('projects').toArray();
      for (const project of projects) {
        if (!project.workspaceId) {
          await trans.table('projects').update(project.id, {
            workspaceId: 'local-default'
          });
        }
      }
    });
  }

  // Helper methods for sync operations
  async getIdea(id: string): Promise<Idea | undefined> {
    return await this.ideas.get(id);
  }

  async saveIdea(idea: Idea): Promise<void> {
    await this.ideas.put(idea);
  }
}
