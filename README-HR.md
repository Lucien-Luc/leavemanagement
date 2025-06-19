# BPN HR Portal - Access Guide

## How to Access the HR Portal

The HR Portal is a separate application that allows HR staff to manage employees and leave requests. Here's how to access it:

### Step 1: Employee Portal Login
1. First, you need to log in through the main employee portal at the root URL
2. Use credentials for a user with HR department access

### Step 2: Access HR Portal
1. Once logged in to the employee portal, navigate to `/hr-portal/` in your browser
2. Or directly visit: `your-domain.com/hr-portal/`
3. The system will automatically check if you have HR access

### HR Access Requirements
To access the HR portal, your user account must meet one of these criteria:
- Department: "HR" 
- Role: "HR"
- Position contains "HR" (case-insensitive)

### Creating HR Users
You can create HR users in two ways:

1. **Through the HR Portal** (if you already have HR access):
   - Use the Employee Management section
   - Set Department to "HR" when creating new users

2. **Through Employee Registration**:
   - Register through the employee portal
   - Set Department to "HR" during registration

### Default HR Test User
You can create a test HR user with these details:
- **Email**: hr@bpn.rw
- **Password**: BPN123456
- **Department**: HR
- **Position**: HR Manager

## HR Portal Features

### Dashboard
- Overview statistics of all employees and leave requests
- Recent leave requests with approval/rejection actions
- Real-time data updates

### Employee Management
- View, add, edit, and manage all employees
- Search and filter employees by various criteria
- Employee status management (active/inactive)
- Leave balance management

### Leave Requests Management
- Review all employee leave requests
- Approve or reject pending requests
- Detailed request information with attachments
- Export leave requests data

### Leave Types Management
- Configure different types of leave
- Set approval requirements and advance notice
- Manage leave allocation and limits
- Create custom leave types

### Reports & Analytics
- Comprehensive reporting dashboard
- Charts and analytics for leave trends
- Department-wise statistics
- Export capabilities for data analysis

## Technology Stack

- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Backend**: Firebase Firestore for real-time data
- **Authentication**: Custom authentication with role-based access
- **Charts**: Chart.js for analytics visualization
- **Styling**: Modern CSS with glassmorphism effects

## Security Features

- Role-based access control
- Session management with expiration
- Real-time data synchronization
- Secure password hashing
- Client-server separation

## URL Structure

- Employee Portal: `/`
- HR Portal: `/hr-portal/`
- Both applications share the same Firebase backend
- Same authentication system with role-based access

## Support

If you have issues accessing the HR portal:
1. Ensure you're logged in to the employee portal first
2. Verify your user account has HR department/role
3. Check browser console for any error messages
4. Clear browser cache if needed

The HR portal provides a comprehensive solution for managing your organization's leave management system with modern web technologies and real-time capabilities.