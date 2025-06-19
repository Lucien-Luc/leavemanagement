# BPN Leave Management System - Deployment Guide

## Pre-Deployment Checklist

### Firebase Setup
1. **Create Firebase Project**
   - Go to https://console.firebase.google.com/
   - Click "Create a project"
   - Enter project name (e.g., "bpn-leave-management")
   - Disable Google Analytics (optional)

2. **Enable Services**
   - **Firestore Database**: Go to Firestore Database → Create database → Start in test mode
   - **Firebase Storage**: Go to Storage → Get started → Start in test mode
   - **Authentication**: Go to Authentication → Get started → Sign-in method → Email/Password → Enable

3. **Configure Web App**
   - Go to Project Overview → Add app → Web
   - Enter app name: "BPN Leave Management"
   - Copy the Firebase config object
   - Update `js/firebase-config.js` with your config

4. **Security Rules**
   - Deploy the Firestore rules from `firestore.rules`
   - Update Storage rules for file uploads:
   ```
   rules_version = '2';
   service firebase.storage {
     match /b/{bucket}/o {
       match /leave_attachments/{allPaths=**} {
         allow read, write: if request.auth != null;
       }
       match /profile_pictures/{allPaths=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

### Application Configuration

1. **Update Firebase Config**
   - Replace the config in `js/firebase-config.js` with your Firebase project details
   - Ensure all collection names match your requirements

2. **Customize Branding**
   - Replace `assets/logo.png` with your company logo
   - Update company colors in `styles/main.css` if needed
   - Update company name and contact info in leave request pages

3. **Set Default Leave Balances**
   - Modify default balances in `js/auth.js` (line 60-66) if needed
   - Vacation: 20 days (default)
   - Sick: 10 days (default)
   - Personal: 5 days (default)
   - Maternity: 90 days (default)
   - Paternity: 15 days (default)

## Deployment Options

### Option 1: Firebase Hosting (Recommended)

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login and Initialize**
   ```bash
   firebase login
   firebase init hosting
   ```

3. **Configure `firebase.json`**
   ```json
   {
     "hosting": {
       "public": ".",
       "ignore": [
         "firebase.json",
         "**/.*",
         "**/node_modules/**",
         "README.md",
         "DEPLOYMENT.md",
         "replit.md"
       ],
       "rewrites": [
         {
           "source": "**",
           "destination": "/index.html"
         }
       ]
     }
   }
   ```

4. **Deploy**
   ```bash
   firebase deploy
   ```

### Option 2: Netlify

1. **Create `_redirects` file**
   ```
   /*    /index.html   200
   ```

2. **Deploy via Git**
   - Connect your repository to Netlify
   - Set build command: (none)
   - Set publish directory: `.`

### Option 3: Vercel

1. **Create `vercel.json`**
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```

2. **Deploy via Git or CLI**
   ```bash
   npx vercel --prod
   ```

## Post-Deployment Setup

### 1. Test Application
- [ ] User registration works
- [ ] User login works
- [ ] Dashboard loads correctly
- [ ] Leave request submission works
- [ ] File upload functionality works
- [ ] Calendar displays properly
- [ ] Profile management works

### 2. Create Initial Data

**Add Company Holidays** (via Firebase Console):
```javascript
// Add to company_holidays collection
{
  name: "New Year's Day",
  date: new Date("2025-01-01"),
  description: "New Year Holiday",
  isRecurring: true,
  createdAt: new Date()
}
```

**Create HR Admin Account** (register normally, then update in console):
```javascript
// Update user document to add HR role
{
  role: "hr",  // Add this field to enable HR access
  // ... other user fields
}
```

### 3. Configure Domain (Optional)
- Add custom domain in Firebase Hosting settings
- Update CORS settings if needed
- Add domain to Firebase Auth authorized domains

## Security Checklist

- [ ] Firestore security rules deployed
- [ ] Storage security rules configured
- [ ] Authentication configured properly
- [ ] HTTPS enabled (automatic with Firebase Hosting)
- [ ] No API keys exposed in client code (Firebase config is safe)
- [ ] File upload restrictions in place

## Monitoring & Maintenance

### Firebase Console Monitoring
- Monitor database usage in Firestore
- Check storage usage for file uploads
- Review authentication logs
- Monitor hosting traffic

### Regular Maintenance
- Review and update leave balances
- Add/remove company holidays
- Monitor user accounts for inactive users
- Backup important data regularly

## Integration with HR System

The database structure is designed for easy HR system integration:

### For HR Dashboard Integration
- Query `leave_requests` collection filtered by status
- Query `users` collection for employee management
- Update leave request status with approval/rejection

### API Endpoints for HR System
Consider creating Firebase Cloud Functions for:
- Bulk leave balance updates
- Email notifications for leave requests
- Integration with payroll systems
- Automated leave accrual calculations

## Troubleshooting

### Common Issues
1. **"Firebase not initialized"** - Check Firebase config and CDN links
2. **"Permission denied"** - Verify Firestore security rules
3. **File upload fails** - Check Storage rules and file size limits
4. **Calendar not loading** - Verify date formatting and Firestore timestamps

### Support Contacts
- Technical Issues: Development Team
- Firebase Issues: Firebase Support
- Business Logic: HR Department

## Backup & Recovery

### Data Backup
- Export Firestore data regularly
- Backup user profiles and leave history
- Store backups in secure, off-site location

### Recovery Procedures
- Document data restoration process
- Test backup restoration quarterly
- Maintain rollback procedures for deployments