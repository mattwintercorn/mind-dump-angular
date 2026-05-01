# Deployment Guide - Mind Dump PWA

This guide covers deployment options for the Mind Dump Progressive Web App.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- Production web server with HTTPS support (required for PWA features)

## Build for Production

```bash
npm run build
```

This creates an optimized production build in `dist/mind-dump-angular/browser/` with:
- Service Worker files (`ngsw-worker.js`, `ngsw.json`)
- Web App Manifest (`manifest.webmanifest`)
- Optimized JavaScript bundles
- Compiled CSS

## Deployment Options

### Option 1: Firebase Hosting (Recommended)

Firebase Hosting provides automatic HTTPS and is ideal for PWAs.

1. Install Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login to Firebase:
```bash
firebase login
```

3. Initialize Firebase in your project:
```bash
firebase init hosting
```

Configuration options:
- Public directory: `dist/mind-dump-angular/browser`
- Single-page app: Yes
- Set up automatic builds: Optional

4. Deploy:
```bash
firebase deploy
```

### Option 2: Netlify

1. Install Netlify CLI:
```bash
npm install -g netlify-cli
```

2. Build and deploy:
```bash
npm run build
netlify deploy --prod --dir=dist/mind-dump-angular/browser
```

Or connect your GitHub repository to Netlify for automatic deployments.

### Option 3: Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
npm run build
vercel --prod
```

When prompted, set the output directory to `dist/mind-dump-angular/browser`.

### Option 4: AWS S3 + CloudFront

1. Build the application:
```bash
npm run build
```

2. Create an S3 bucket with static website hosting enabled

3. Upload the contents of `dist/mind-dump-angular/browser/` to S3

4. Create a CloudFront distribution pointing to the S3 bucket

5. Configure CloudFront to:
   - Redirect HTTP to HTTPS
   - Set default root object to `index.html`
   - Configure error pages to redirect to `index.html` for SPA routing

### Option 5: nginx

Sample nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    root /var/www/mind-dump;
    index index.html;

    # Service Worker must be served with correct MIME type
    location /ngsw-worker.js {
        add_header Cache-Control "no-cache";
        add_header Content-Type "application/javascript";
    }

    location /ngsw.json {
        add_header Cache-Control "no-cache";
        add_header Content-Type "application/json";
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - redirect all requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Post-Deployment Checklist

- [ ] Verify HTTPS is enabled (required for Service Workers)
- [ ] Test installation as PWA on mobile devices
- [ ] Verify offline functionality works
- [ ] Check service worker registration in browser DevTools
- [ ] Test "Add to Home Screen" prompt
- [ ] Verify manifest.webmanifest is accessible
- [ ] Test update notifications when new version is deployed
- [ ] Validate all icons load correctly

## Environment-Specific Configuration

For different environments, you can use Angular environment files:

```bash
# Production
ng build --configuration production

# Staging
ng build --configuration staging
```

## Troubleshooting

### Service Worker Not Registering

- Ensure the app is served over HTTPS
- Check browser console for errors
- Verify `ngsw-worker.js` is accessible at the root URL
- Clear browser cache and reload

### PWA Install Prompt Not Showing

- Verify all PWA requirements are met (HTTPS, manifest, icons, service worker)
- Check that manifest.webmanifest has required fields
- Test on different browsers (Chrome, Edge, Safari)

### Offline Mode Not Working

- Check service worker status in DevTools (Application > Service Workers)
- Verify `ngsw-config.json` includes necessary resources
- Check Network tab with "Offline" mode enabled

## Continuous Deployment

### GitHub Actions Example

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

## Monitoring

After deployment, monitor:

- Service worker update cycles
- Cache hit rates
- PWA installation metrics
- Offline usage patterns
- Error logs from service worker

## Support

For issues or questions:
- Check browser compatibility at https://caniuse.com/serviceworkers
- Review Angular Service Worker documentation
- Test in multiple browsers and devices
