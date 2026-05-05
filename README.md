# MindDumpAngular

Angular 21+ PWA for capturing and organizing ideas with real-time Firebase sync, multi-user workspaces, and graph visualizations.

## Features

- 🔐 **GitHub OAuth Authentication**
- 💾 **Offline-First Architecture** (Dexie.js + IndexedDB)
- 🔄 **Real-Time Cross-Device Sync** (Firebase Realtime Database)
- 👥 **Multi-User Workspaces** with role-based access control
- 📱 **Progressive Web App** (installable, service worker)
- 🎨 **Interactive Visualizations** (D3.js force graphs & clusters)
- 🌐 **Mobile-Responsive UI** (Angular Material)

## Quick Start

### Development Server

```bash
npm install
ng serve
```

Navigate to `http://localhost:4200/`

### Production Build

```bash
ng build
```

Build artifacts stored in `dist/mind-dump-angular/`

### Deploy to GitHub Pages

```bash
npm run deploy
```

## Architecture

### Tech Stack

- **Framework:** Angular 21.2.11 (standalone components, signals)
- **UI Library:** Angular Material 21.2.9
- **Local Database:** Dexie.js (IndexedDB wrapper)
- **Backend:** Firebase Realtime Database
- **Auth:** Firebase Auth (GitHub OAuth)
- **Visualization:** D3.js v7
- **PWA:** Angular Service Worker

### Data Structure

**Local-First Design:**
- All operations work offline (Dexie IndexedDB)
- Changes queued and synced in background
- Optimistic UI updates with conflict resolution

**Firebase Structure:**
```
/users/{userId}/
  profile/
  workspaces/

/workspaces/{workspaceId}/
  [metadata: name, ownerId, members]
  ideas/{ideaId}/
  connections/{connectionId}/
  components/{componentId}/
  projects/{projectId}/
```

See **[docs/FIREBASE_DATA_STRUCTURE.md](docs/FIREBASE_DATA_STRUCTURE.md)** for complete schema and best practices.

## Documentation

- **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** - Firebase configuration, auth setup, security rules
- **[docs/FIREBASE_DATA_STRUCTURE.md](docs/FIREBASE_DATA_STRUCTURE.md)** - Complete data schema and architecture
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment instructions for GitHub Pages
- **[PHASE_STATUS.md](PHASE_STATUS.md)** - Feature implementation status
- **[TESTING_REPORT.md](TESTING_REPORT.md)** - Test coverage and results

## Development

### Running Tests

```bash
ng test
```

Unit tests via [Karma](https://karma-runner.github.io)

### Code Scaffolding

```bash
ng generate component component-name
ng generate service service-name
ng generate directive|pipe|class|guard|interface|enum
```

### Debug Tools

Open browser console and access debug utilities:

```javascript
// View diagnostics
await window.debugFirebase.diagnostics()

// Check user workspaces
await window.debugFirebase.getUserWorkspaces()

// Upload all local ideas to Firebase
await window.debugFirebase.uploadAllIdeas()

// Search for workspaces
await window.debugFirebase.searchForWorkspaces()

// Clear local data (keeps Firebase)
await window.debugFirebase.clearLocalData()

// Nuclear option: delete everything
await window.debugFirebase.nukeEverything()
```

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/           # TypeScript interfaces
│   │   └── services/         # Business logic & Firebase sync
│   ├── features/
│   │   ├── ideas/            # Idea CRUD components
│   │   └── visualization/    # D3 graph components
│   └── shared/
│       ├── components/       # Reusable UI components
│       └── styles/           # Global styles & mixins
├── environments/             # Firebase config
└── styles/
    └── _breakpoints.scss     # Responsive breakpoints
```

## Key Services

- **IdeaService** - CRUD operations for ideas (local-first)
- **SyncService** - Firebase sync queue & real-time listeners
- **WorkspaceService** - Multi-user workspace management
- **AuthService** - GitHub OAuth authentication
- **FilterService** - Search & filter ideas
- **DatabaseService** - Dexie IndexedDB wrapper

## Environment Setup

### Firebase Configuration

1. Create Firebase project at https://console.firebase.google.com
2. Enable GitHub Authentication provider
3. Add your domain to authorized domains
4. Copy config to `src/environments/environment.ts`
5. Deploy security rules: `firebase deploy --only database`

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed instructions.

### GitHub OAuth App

1. Create OAuth App at https://github.com/settings/developers
2. Set callback URL: `https://mind-dump-angular.firebaseapp.com/__/auth/handler`
3. Add Client ID/Secret to Firebase Console

## Deployment

### GitHub Pages

Deployed at: https://mattwintercorn.github.io/mind-dump-angular/

```bash
npm run deploy
```

Auto-deploys to `gh-pages` branch.

**Base href:** `/mind-dump-angular/` (configured in `angular.json`)

## Version History

- **v2.1.0** - Multi-user workspaces with collaboration
- **v2.0.0** - Firebase real-time sync & offline queue
- **v1.0.0** - Initial release (local-only)

See [RELEASE_NOTES_v2.0.0-sync.md](RELEASE_NOTES_v2.0.0-sync.md) for detailed changelog.

## Contributing

1. Create feature branch from `main`
2. Write tests for new features (80%+ coverage target)
3. Follow Angular style guide
4. Update documentation for API changes
5. Submit PR with clear description

## License

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.17 and upgraded to 21.2.11.

## Support

For issues or questions:
- Check [TESTING_REPORT.md](TESTING_REPORT.md) for known issues
- Review [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for configuration help
- See [docs/FIREBASE_DATA_STRUCTURE.md](docs/FIREBASE_DATA_STRUCTURE.md) for data architecture
