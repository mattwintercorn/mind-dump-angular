// src/app/core/models/settings.model.ts
export interface Settings {
  id: string;
  defaultViewMode: 'grid' | 'graph';
  keywordColors: Record<string, string>;
  layoutPreferences: any;
  theme: string;
}
