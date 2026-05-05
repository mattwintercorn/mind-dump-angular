import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkspaceService } from '../../../../core/services/workspace.service';
import { WorkspaceMembers } from '../../../../core/models/workspace.model';
import { FirebaseService } from '../../../../core/services/firebase.service';
import { ref, get } from 'firebase/database';
import { map, startWith } from 'rxjs/operators';
import { Observable } from 'rxjs';

export interface ShareWorkspaceDialogData {
  workspaceId: string;
  workspaceName: string;
  ownerId: string;
  members: WorkspaceMembers;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  githubUsername?: string;
}

@Component({
    selector: 'app-share-workspace-dialog',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatListModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatAutocompleteModule,
        MatTooltipModule
    ],
    templateUrl: './share-workspace-dialog.component.html',
    styleUrls: ['./share-workspace-dialog.component.scss']
})
export class ShareWorkspaceDialogComponent implements OnInit {
  dialogRef = inject(MatDialogRef<ShareWorkspaceDialogComponent>);
  data: ShareWorkspaceDialogData = inject(MAT_DIALOG_DATA);
  workspaceService = inject(WorkspaceService);
  firebaseService = inject(FirebaseService);

  userControl = new FormControl<string | UserProfile>('', [Validators.required]);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  memberProfiles = signal<Record<string, { displayName: string; email: string }>>({});
  
  allUsers = signal<UserProfile[]>([]);
  filteredUsers!: Observable<UserProfile[]>;

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.loadAllUsers(),
      this.loadMemberDetails()
    ]);
    
    // Setup autocomplete filtering
    this.filteredUsers = this.userControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const searchText = typeof value === 'string' ? value : value?.displayName || '';
        return this._filterUsers(searchText);
      })
    );
  }

  async loadAllUsers(): Promise<void> {
    try {
      const usersRef = ref(this.firebaseService.database, 'users');
      const snapshot = await get(usersRef);
      
      if (snapshot.exists()) {
        const users: UserProfile[] = [];
        const usersData = snapshot.val();
        const currentUserId = this.data.ownerId; // Current user (workspace owner)
        
        for (const uid in usersData) {
          const profile = usersData[uid].profile;
          if (profile && profile.email) {
            // Exclude users already in workspace AND exclude current user
            if (!this.data.members[uid] && uid !== currentUserId) {
              users.push({
                uid,
                email: profile.email,
                displayName: profile.displayName || profile.email,
                photoURL: profile.photoURL,
                githubUsername: profile.githubUsername
              });
            }
          }
        }
        
        this.allUsers.set(users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      this.errorMessage.set('Failed to load users');
    }
  }

  async loadMemberDetails(): Promise<void> {
    try {
      const memberIds = this.getMemberIds();
      const profileMap: Record<string, { displayName: string; email: string }> = {};
      
      for (const uid of memberIds) {
        const userRef = ref(this.firebaseService.database, `users/${uid}/profile`);
        const snapshot = await get(userRef);
        
        if (snapshot.exists()) {
          const profile = snapshot.val();
          profileMap[uid] = {
            displayName: profile.displayName || profile.email || uid,
            email: profile.email || uid
          };
        } else {
          profileMap[uid] = {
            displayName: uid,
            email: ''
          };
        }
      }
      
      this.memberProfiles.set(profileMap);
    } catch (error) {
      console.error('Failed to load member details:', error);
    }
  }

  private _filterUsers(searchText: string): UserProfile[] {
    const filterValue = searchText.toLowerCase();
    
    return this.allUsers().filter(user => 
      user.displayName.toLowerCase().includes(filterValue) ||
      user.email.toLowerCase().includes(filterValue) ||
      (user.githubUsername && user.githubUsername.toLowerCase().includes(filterValue))
    );
  }

  displayUserFn(user: UserProfile | string): string {
    return typeof user === 'string' ? user : user?.displayName || '';
  }

  async onAddCollaborator(): Promise<void> {
    const selectedUser = this.userControl.value;
    
    if (!selectedUser || typeof selectedUser === 'string') {
      this.errorMessage.set('Please select a user from the list');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.workspaceService.shareWorkspaceWithUser(
        this.data.workspaceId,
        selectedUser.uid
      );
      this.userControl.setValue('');
      this.userControl.markAsUntouched();
      
      // Remove added user from available list
      this.allUsers.set(this.allUsers().filter(u => u.uid !== selectedUser.uid));
      
      // Reload to show new member
      this.dialogRef.close({ refresh: true });
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to add collaborator');
    } finally {
      this.isLoading.set(false);
    }
  }

  async onRemoveCollaborator(userId: string): Promise<void> {
    try {
      await this.workspaceService.removeCollaborator(this.data.workspaceId, userId);
      
      // Remove from members object
      const updatedMembers = { ...this.data.members };
      delete updatedMembers[userId];
      this.data.members = updatedMembers;
    } catch (error: any) {
      this.errorMessage.set(error.message || 'Failed to remove collaborator');
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }

  isOwner(userId: string): boolean {
    return userId === this.data.ownerId;
  }

  getMemberIds(): string[] {
    return Object.keys(this.data.members);
  }

  getRole(userId: string): string {
    return this.data.members[userId];
  }

  getMemberProfile(userId: string): { displayName: string; email: string } {
    return this.memberProfiles()[userId] || { displayName: userId, email: '' };
  }
}
