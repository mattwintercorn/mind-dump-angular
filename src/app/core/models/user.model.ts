export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  githubUsername: string | null;
  createdAt: Date;
}

export interface UserProfile extends User {
  workspaces: string[]; // Array of workspace IDs
}
