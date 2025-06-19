# BPN Leave Management System

## Overview

The BPN Leave Management System is a web-based application designed to help employees manage their leave requests and track their leave balances. It's built as a single-page application (SPA) using vanilla JavaScript with Firebase as the backend service. The system features a clean, responsive interface with BPN brand colors and provides comprehensive leave management functionality.

## System Architecture

### Frontend Architecture
- **Single Page Application (SPA)**: Pure vanilla JavaScript with dynamic page loading
- **Modular Design**: Separate controllers for each major feature (Dashboard, Calendar, Leave Request, Profile)
- **Responsive Layout**: CSS Grid and Flexbox for mobile-friendly design
- **Client-side Routing**: Hash-based navigation with dynamic content loading

### Backend Architecture
- **Firebase Firestore**: NoSQL document database for data storage
- **Firebase Storage**: File storage for document attachments
- **Client-side Authentication**: Custom authentication system using CryptoJS for password hashing
- **Offline Support**: Firebase persistence enabled for offline functionality

### Security Architecture
- **Session Management**: Local storage-based sessions with expiration
- **Password Security**: SHA256 hashing using CryptoJS
- **Data Validation**: Client-side validation with server-side rules (Firestore security rules)

## Key Components

### Authentication System (`js/auth.js`)
- Custom authentication using email/password
- Session management with local storage
- Password hashing with CryptoJS SHA256
- User registration and login functionality

### Dashboard Controller (`js/dashboard.js`)
- Leave balance overview
- Recent leave requests display
- Statistics calculation (approved, pending, rejected leaves)
- Upcoming leaves preview

### Calendar Controller (`js/calendar.js`)
- Monthly calendar view with leave visualization
- List view for leave requests
- Holiday integration
- Navigation between months

### Leave Request Controller (`js/leave-request.js`)
- Leave request form with validation
- File attachment support
- Edit existing requests
- Leave type selection with balance checking
- Duration calculation

### Profile Controller (`js/profile.js`)
- User profile management
- Editable personal information
- Leave balance display
- Profile statistics

### Utility Functions (`js/utils.js`)
- Toast notifications
- Date formatting utilities
- Time calculations
- Form validation helpers

## Data Flow

1. **Authentication Flow**:
   - User registers/logs in through auth forms
   - Credentials validated and session created
   - User data stored in Firestore `users` collection

2. **Leave Request Flow**:
   - Employee submits leave request form
   - Data validated and stored in `leave_requests` collection
   - File attachments uploaded to Firebase Storage
   - Request appears in dashboard and calendar

3. **Data Synchronization**:
   - Real-time updates through Firestore listeners
   - Offline support with local persistence
   - Automatic sync when connection restored

## External Dependencies

### CDN Libraries
- **Firebase SDK 10.7.1**: Database and storage services
- **Font Awesome 6.0.0**: Icon library
- **CryptoJS 4.1.1**: Password hashing
- **Chart.js**: Data visualization (dashboard statistics)

### Firebase Services
- **Firestore**: Primary database
- **Firebase Storage**: File attachments
- **Firebase Hosting**: (Configured but using Python server currently)

## Deployment Strategy

### Current Setup
- **Development Server**: Python HTTP server on port 5000
- **Static File Serving**: All assets served statically
- **Environment**: Replit with Node.js 20 and Python 3.11 modules

### Production Considerations
- Firebase environment variables need to be configured
- Firestore security rules should be implemented
- Firebase Hosting can replace Python server
- Environment-specific configurations for development/production

### Configuration Requirements
- Firebase project setup with Firestore and Storage enabled
- Environment variables for Firebase configuration
- Security rules for Firestore collections
- CORS configuration for file uploads

## User Preferences

Preferred communication style: Simple, everyday language.

## Database Collections Structure

The application uses the following Firestore collections designed for easy HR integration:

### `users` Collection
```
{
  id: string (auto-generated),
  email: string,
  password: string (SHA256 hashed),
  firstName: string,
  lastName: string,
  employeeId: string,
  department: string,
  position: string,
  manager: string,
  startDate: string (YYYY-MM-DD),
  leaveBalances: {
    vacation: number,
    sick: number,
    personal: number,
    maternity: number,
    paternity: number
  },
  isActive: boolean,
  profilePicture: string (optional),
  createdAt: timestamp,
  updatedAt: timestamp,
  lastLogin: timestamp
}
```

### `leave_requests` Collection
```
{
  id: string (auto-generated),
  userId: string (references users.id),
  userName: string,
  userEmail: string,
  department: string,
  leaveType: string (vacation|sick|personal|maternity|paternity|other),
  startDate: timestamp,
  endDate: timestamp,
  days: number,
  reason: string,
  status: string (pending|approved|rejected|cancelled),
  attachments: [{
    name: string,
    url: string,
    size: number,
    type: string,
    uploadedAt: timestamp
  }],
  approvedBy: string (optional),
  rejectedBy: string (optional),
  rejectionReason: string (optional),
  approvedAt: timestamp (optional),
  rejectedAt: timestamp (optional),
  cancelledAt: timestamp (optional),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `company_holidays` Collection
```
{
  id: string (auto-generated),
  name: string,
  date: timestamp,
  description: string (optional),
  isRecurring: boolean,
  createdAt: timestamp
}
```

## User Preferences

- Communication style: Simple, everyday language
- Database: Firestore with real-time syncing
- Authentication: Custom email/password system
- File Storage: Firebase Storage for attachments
- Brand Colors: BPN blue (#1B7B9C) with professional white/grey palette

## Changelog

- June 19, 2025: Initial setup with complete employee leave management system
- June 19, 2025: Firebase integration completed with production keys
- June 19, 2025: BPN branding and logo integration added
- June 19, 2025: Database schema optimized for HR system integration
- June 19, 2025: Added rejected leave requests section to dashboard
- June 19, 2025: Updated dashboard to fetch data directly from Firestore without sample data dependency
- June 19, 2025: Enhanced dashboard stats to include rejected requests counter
- June 19, 2025: Complete UI/UX redesign with modern, clean interface
- June 19, 2025: Redesigned navigation bar with glassmorphism effects and improved responsiveness
- June 19, 2025: Redesigned all pages (Dashboard, Leave Request, Calendar, Profile) with consistent modern styling
- June 19, 2025: Added gradient headers, improved card designs, and enhanced mobile responsiveness
- June 19, 2025: Migration from Replit Agent to Replit environment completed successfully
- June 19, 2025: Created comprehensive HR Portal application at `/hr-portal/`
- June 19, 2025: HR Portal includes employee management, leave request management, leave types configuration, and analytics/reports
- June 19, 2025: Implemented role-based access control for HR functions