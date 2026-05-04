# Firebase Setup Instructions

## Issue: auth/unauthorized-domain

The GitHub Pages deployment is failing authentication with error: `auth/unauthorized-domain`

This means your GitHub Pages domain needs to be authorized in Firebase Console.

## Fix: Add Authorized Domain

### Steps:

1. **Open Firebase Console**
   - Go to: https://console.firebase.google.com/
   - Select project: `mind-dump-angular`

2. **Navigate to Authentication Settings**
   - Click "Authentication" in left sidebar
   - Click "Settings" tab at top
   - Click "Authorized domains" tab

3. **Add GitHub Pages Domain**
   - Click "Add domain" button
   - Enter: `mattwintercorn.github.io`
   - Click "Add"

4. **Verify Default Domains**
   You should see these domains listed:
   - ✅ `localhost` (for local development)
   - ✅ `mind-dump-angular.firebaseapp.com` (Firebase default)
   - ✅ `mind-dump-angular.web.app` (Firebase hosting)
   - ✅ `mattwintercorn.github.io` (GitHub Pages - **ADD THIS**)

5. **Test**
   - Wait 1-2 minutes for changes to propagate
   - Visit: https://mattwintercorn.github.io/mind-dump-angular/
   - Click "Sign in with GitHub"
   - OAuth popup should now work properly

## Additional Firebase Configuration

While you're in Firebase Console, verify these settings:

### Authentication Providers
- **GitHub:** Should be enabled with your OAuth app credentials
  - Navigate to: Authentication → Sign-in method → GitHub
  - Verify: Status is "Enabled"
  - Verify: Client ID and Client Secret are configured

### Realtime Database
- **Database URL:** `https://mind-dump-angular-default-rtdb.firebaseio.com`
- **Rules:** Should allow authenticated users to read/write their workspaces
  - Navigate to: Realtime Database → Rules tab
  - Verify security rules are deployed (see FIREBASE_RULES.md)

## Troubleshooting

### If authentication still fails:

1. **Clear browser cache and cookies**
   - Chrome: Settings → Privacy → Clear browsing data
   - Select: Cookies and cached images/files

2. **Check Firebase Console → Authentication → Users**
   - After successful sign-in, your GitHub account should appear here

3. **Check browser console for errors**
   - Open DevTools (F12)
   - Check Console tab for Firebase errors
   - Common errors:
     - `auth/unauthorized-domain` - Domain not authorized (follow steps above)
     - `auth/popup-blocked` - Browser blocked popup (allow popups for this site)
     - `auth/cancelled-popup-request` - User closed popup too quickly

4. **Verify GitHub OAuth App Settings**
   - Go to: https://github.com/settings/developers
   - Find your OAuth app for mind-dump-angular
   - Verify "Authorization callback URL" is: `https://mind-dump-angular.firebaseapp.com/__/auth/handler`

## Testing Checklist

After adding the domain, test these scenarios:

- [ ] Sign in with GitHub works on GitHub Pages
- [ ] User profile appears in toolbar after sign in
- [ ] Ideas sync across devices
- [ ] Offline queue works (create idea offline, go online, verify sync)
- [ ] Sign out works
- [ ] Local data persists after sign out

## Current Firebase Config

```typescript
export const firebaseConfig = {
  apiKey: "AIzaSyCtdGEnNGLFuyAVi35QMsPxZD0QDUqvvwQ",
  authDomain: "mind-dump-angular.firebaseapp.com",
  databaseURL: "https://mind-dump-angular-default-rtdb.firebaseio.com",
  projectId: "mind-dump-angular",
  storageBucket: "mind-dump-angular.firebasestorage.app",
  messagingSenderId: "317838095680",
  appId: "1:317838095680:web:3121c5bce08660408c76a5"
};
```

## Support

If issues persist, check:
- Firebase Console → Usage tab (ensure not over quota)
- Firebase Console → Authentication → Settings → Advanced (check rate limiting)
- GitHub OAuth app settings (ensure callback URL matches Firebase)

## Phase 2: Workspace Security Rules

### Deploy Security Rules for Multi-User Workspaces

Phase 2 adds multi-user workspace collaboration. The security rules have been updated to enforce workspace-level access control.

#### Security Rule Updates (Phase 2)

**Location:** `database.rules.json`

**Key Changes:**
- Workspace isolation: Users can only read workspaces they own or are members of
- Owner-only writes: Only workspace owners can modify workspace metadata
- Collaborator read access: Members can read all workspace data
- Editor write access: Members with 'editor' role can create/edit/delete ideas

#### Deploy Security Rules

**Option 1: Firebase CLI (Recommended)**
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in project (if not done)
firebase init database

# Deploy rules
firebase deploy --only database
```

**Option 2: Firebase Console (Manual)**
1. Go to: https://console.firebase.google.com/
2. Select project: `mind-dump-angular`
3. Navigate to: Realtime Database → Rules
4. Copy contents of `database.rules.json`
5. Paste into the rules editor
6. Click "Publish"

#### Security Rule Logic

**Read Access:**
- User can read workspace if they are owner OR member
- Check: `ownerId === auth.uid` OR `members/{uid}` exists

**Write Access (Workspace Metadata):**
- Only workspace owner can modify workspace (name, members)
- Check: `ownerId === auth.uid`

**Write Access (Ideas/Connections/etc):**
- Owner can always write
- Members with 'editor' role can write
- Check: `ownerId === auth.uid` OR `members/{uid} === 'editor'`

**Authentication:**
- All operations require authentication: `auth != null`
- No anonymous access to any workspace data

#### Testing Security Rules

After deploying, verify access control:

**Test 1: Unauthorized Access**
- Sign in as User A
- Try to read User B's private workspace → Should be denied
- Check Firebase Console logs for security rule violations

**Test 2: Collaborator Access**
- User A creates workspace and shares with User B
- Sign in as User B
- Verify User B can read/write ideas in shared workspace
- Verify User B cannot modify workspace metadata (name, members)

**Test 3: Owner Privileges**
- Sign in as workspace owner
- Verify owner can add/remove collaborators
- Verify owner can rename workspace
- Verify owner can delete workspace

**Test 4: Leave Workspace**
- User B leaves shared workspace
- Verify User B can no longer access workspace data
- Verify workspace still exists for User A

#### Security Rule Structure

```
/users/{userId}
  - Read: Own profile only
  - Write: Own profile only

/workspaces/{workspaceId}
  - Read: Owner OR member
  - Write: Owner only
  
  /ideas/{ideaId}
    - Read: Owner OR member
    - Write: Owner OR editor
  
  /connections/{connectionId}
    - Read: Owner OR member
    - Write: Owner OR editor
  
  /components/{componentId}
    - Read: Owner OR member
    - Write: Owner OR editor
  
  /projects/{projectId}
    - Read: Owner OR member
    - Write: Owner OR editor
```

#### Common Issues

**Issue:** Rules not applying immediately
- **Solution:** Wait 1-2 minutes for propagation, clear browser cache

**Issue:** `permission_denied` errors after deployment
- **Solution:** Verify user is authenticated and has workspace access
- Check Firebase Console → Realtime Database → Data to verify member list

**Issue:** Cannot share workspace
- **Solution:** Ensure invited user exists in `/users/{uid}` path
- Verify user has signed in at least once (creates user profile)

#### Rollback Security Rules

If rules cause issues, you can rollback:

1. Go to: Firebase Console → Realtime Database → Rules
2. Click "Rules History" tab
3. Find previous working version
4. Click "Restore"

**Previous Rules (Phase 1 - Personal Sync Only):**
- Simplified rules without workspace member checks
- Single workspace per user
- No collaboration features

---

**Security rules deployed:** Phase 2 multi-user workspace isolation ✅
