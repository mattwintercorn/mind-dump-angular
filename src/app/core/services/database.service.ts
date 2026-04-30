// src/app/core/services/database.service.ts
import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { Idea } from '../models/idea.model';
import { Connection } from '../models/connection.model';
import { Settings } from '../models/settings.model';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService extends Dexie {
  ideas!: Table<Idea, string>;
  connections!: Table<Connection, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('MindDumpDB');
    
    this.version(1).stores({
      ideas: 'id, status, *keywords, createdAt',
      connections: 'id, sourceId, targetId',
      settings: 'id'
    });
  }
}
