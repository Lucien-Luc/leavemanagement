# BPN Leave Management System

A production-ready employee leave management system built with HTML/CSS/JavaScript and Firebase. This application provides a comprehensive solution for employees to manage their leave requests, view balances, and track leave history.

## Features

### Employee Features
- **User Registration & Authentication** - Secure account creation and login
- **Dashboard** - Overview of leave statistics, balances, and recent requests
- **Leave Request Management** - Submit, edit, and cancel leave requests
- **File Attachments** - Upload supporting documents for leave requests
- **Calendar View** - Visual calendar showing approved leaves and company holidays
- **Profile Management** - Update personal information and change passwords
- **Leave Balance Tracking** - Real-time tracking of vacation, sick, personal, and other leave types
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices

### Technical Features
- **Serverless Architecture** - No backend server required
- **Real-time Data Sync** - Automatic updates using Firestore real-time listeners
- **Offline Support** - Works offline with automatic sync when connection resumes
- **File Storage** - Secure file uploads using Firebase Storage
- **Professional UI** - Clean, modern interface with BPN branding
- **Production Ready** - Optimized for deployment with proper error handling

## Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Database**: Firebase Firestore (NoSQL)
- **Authentication**: Custom email/password system with CryptoJS hashing
- **File Storage**: Firebase Storage
- **Hosting**: Static file serving (Python HTTP server for development)
- **Icons**: Font Awesome 6.0
- **Charts**: Chart.js for data visualization

## Quick Start

1. **Firebase Setup**
   - Create a Firebase project at https://console.firebase.google.com/
   - Enable Firestore Database and Firebase Storage
   - Update Firebase configuration in `js/firebase-config.js`

2. **Run Locally**
   ```bash
   python3 -m http.server 5000
   ```
   Navigate to http://localhost:5000

3. **First User**
   - Visit the application and click "Create Account"
   - Fill in your employee details
   - Start using the leave management system

## Database Structure

The application uses three main Firestore collections optimized for HR system integration:

### Collections
- `users` - Employee profiles and leave balances
- `leave_requests` - All leave request data with status tracking
- `company_holidays` - Company-wide holidays and observances

See `replit.md` for detailed schema documentation.

## HR Integration Ready

This employee-side application is designed to work seamlessly with a separate HR management system. The database structure includes all necessary fields for HR approval workflows:

- Employee department and manager information
- Leave request approval/rejection tracking
- Comprehensive audit trails with timestamps
- Attachment management for supporting documents

## Deployment

### Option 1: Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

### Option 2: Static Hosting
Upload all files to any static hosting service (Netlify, Vercel, GitHub Pages, etc.)

## Security Features

- **Password Hashing** - SHA256 encryption for all passwords
- **Session Management** - Secure client-side sessions with expiration
- **File Validation** - Strict file type and size limits
- **Input Sanitization** - Protection against XSS attacks
- **Firebase Security Rules** - Database-level access control

## Browser Support

- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Configuration

### Leave Types
The system supports these leave types by default:
- Vacation Leave
- Sick Leave
- Personal Leave
- Maternity Leave
- Paternity Leave
- Other

### Default Leave Balances
New employees receive:
- Vacation: 20 days
- Sick: 10 days
- Personal: 5 days
- Maternity: 90 days
- Paternity: 15 days

## Support

For technical support or feature requests, contact the development team or refer to the documentation in `replit.md`.

## License

Proprietary - BPN Internal Use Only