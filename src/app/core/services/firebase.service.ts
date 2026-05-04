import { Injectable, signal } from '@angular/core';
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getDatabase, Database, ref, onValue, off, connectDatabaseEmulator } from 'firebase/database';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  private app: FirebaseApp;
  public auth: Auth;
  public database: Database;
  
  private isConnectedSignal = signal<boolean>(false);
  readonly isConnected = this.isConnectedSignal.asReadonly();

  constructor() {
    // Initialize Firebase
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.database = getDatabase(this.app);
    
    // Connect to emulators in development (if available)
    if (!environment.production) {
      try {
        connectAuthEmulator(this.auth, 'http://localhost:9099', { disableWarnings: true });
        connectDatabaseEmulator(this.database, 'localhost', 9000);
      } catch (e) {
        // Emulators not running, use production Firebase
        console.log('Firebase emulators not available, using production');
      }
    }
    
    // Monitor connection status
    this.monitorConnection();
  }

  private monitorConnection(): void {
    const connectedRef = ref(this.database, '.info/connected');
    onValue(connectedRef, (snapshot) => {
      const connected = snapshot.val() === true;
      this.isConnectedSignal.set(connected);
    });
  }

  /**
   * Clean up listeners on service destroy
   */
  ngOnDestroy(): void {
    const connectedRef = ref(this.database, '.info/connected');
    off(connectedRef);
  }
}
