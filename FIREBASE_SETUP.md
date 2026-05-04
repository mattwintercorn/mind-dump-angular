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
