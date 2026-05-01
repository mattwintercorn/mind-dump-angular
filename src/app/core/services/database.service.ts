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
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseService extends Dexie {
  ideas!: Table<Idea, string>;
  connections!: Table<Connection, string>;
  settings!: Table<Settings, string>;
  components!: Table<SystemComponent, string>;

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
  }
}
