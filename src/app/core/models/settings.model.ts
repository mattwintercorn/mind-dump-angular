export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  
  display: {
    defaultView: 'list' | 'grid' | 'graph';
    itemsPerPage: number;
    showArchived: boolean;
  };
  
  features: {
    enableAutoSave: boolean;
    autoSaveInterval: number; // milliseconds
    enableNotifications: boolean;
    enableSearch: boolean;
  };
  
  export: {
    defaultFormat: 'json' | 'csv' | 'markdown';
    includeMetadata: boolean;
  };
  
  lastModified: Date;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  display: {
    defaultView: 'list',
    itemsPerPage: 20,
    showArchived: false,
  },
  features: {
    enableAutoSave: true,
    autoSaveInterval: 30000, // 30 seconds
    enableNotifications: true,
    enableSearch: true,
  },
  export: {
    defaultFormat: 'json',
    includeMetadata: true,
  },
  lastModified: new Date(),
};
