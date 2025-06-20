// Authentication Module
class AuthService {
    constructor() {
        this.currentUser = null;
        this.sessionKey = 'bpn_leave_session';
        this.init();
    }

    init() {
        // Check for existing session
        const sessionData = localStorage.getItem(this.sessionKey);
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                if (session.expires > Date.now()) {
                    this.currentUser = session.user;
                } else {
                    localStorage.removeItem(this.sessionKey);
                }
            } catch (error) {
                localStorage.removeItem(this.sessionKey);
            }
        }
    }

    async register(userData) {
        try {
            console.log('Starting registration process...', userData);
            
            // Validate input
            if (!userData.email || !userData.password || !userData.firstName || !userData.lastName) {
                throw new Error('All fields are required');
            }

            if (userData.password.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            // Check if user already exists
            const existingUser = await db.collection('users')
                .where('email', '==', userData.email.toLowerCase())
                .get();

            if (!existingUser.empty) {
                throw new Error('User with this email already exists');
            }

            // Hash password
            const hashedPassword = CryptoJS.SHA256(userData.password).toString();

            // Check if this is HR registration (special case)
            const isHRRegistration = userData.role === 'hr';
            
            if (!isHRRegistration) {
                // Validate manager selection for regular employees
                if (!userData.manager) {
                    throw new Error('Manager selection is required');
                }

                // Get manager information to determine department
                const managerDoc = await db.collection('users').doc(userData.manager).get();
                if (!managerDoc.exists) {
                    throw new Error('Selected manager not found');
                }

                const managerData = managerDoc.data();
                if (managerData.role !== 'manager' || !managerData.isActive) {
                    throw new Error('Selected user is not an active manager');
                }
            }

            // Create user document
            const newUser = {
                email: userData.email.toLowerCase(),
                password: hashedPassword,
                firstName: userData.firstName,
                lastName: userData.lastName,
                employeeId: userData.employeeId || '',
                department: isHRRegistration ? 'HR' : (managerData?.department || ''),
                position: userData.position || '',
                managerId: isHRRegistration ? null : userData.manager,
                startDate: userData.startDate || new Date().toISOString().split('T')[0],
                role: isHRRegistration ? 'hr' : 'employee',
                leaveBalances: {
                    vacation: isHRRegistration ? 30 : 25,
                    sick: isHRRegistration ? 15 : 12,
                    personal: isHRRegistration ? 10 : 8,
                    maternity: 90,
                    paternity: 15
                },
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            console.log('Creating user document...');
            const docRef = await db.collection('users').add(newUser);
            console.log('User created with ID:', docRef.id);
            
            // Create employee approval request for manager (only for regular employees)
            if (!isHRRegistration && userData.manager) {
                await db.collection('employee_requests').add({
                    userId: docRef.id,
                    managerId: userData.manager,
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email.toLowerCase(),
                    employeeId: userData.employeeId || '',
                    position: userData.position || '',
                    startDate: userData.startDate || new Date().toISOString().split('T')[0],
                    status: 'pending',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            // Remove password from user object for session
            const userForSession = { ...newUser, id: docRef.id };
            delete userForSession.password;

            // Create session
            this.createSession(userForSession);

            return userForSession;
        } catch (error) {
            console.error('Registration error:', error);
            throw new Error(error.message || 'Registration failed');
        }
    }

    async login(email, password) {
        try {
            if (!email || !password) {
                throw new Error('Email and password are required');
            }

            // Hash the provided password
            const hashedPassword = CryptoJS.SHA256(password).toString();

            // Find user by email and password
            const userQuery = await db.collection('users')
                .where('email', '==', email.toLowerCase())
                .where('password', '==', hashedPassword)
                .where('isActive', '==', true)
                .get();

            if (userQuery.empty) {
                throw new Error('Invalid email or password');
            }

            const userDoc = userQuery.docs[0];
            const userData = { id: userDoc.id, ...userDoc.data() };
            
            // Remove password from user object
            delete userData.password;

            // Update last login
            await db.collection('users').doc(userData.id).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Create session
            this.createSession(userData);

            return userData;
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    }

    createSession(user) {
        this.currentUser = user;
        const sessionData = {
            user: user,
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.sessionKey);
        window.location.reload();
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async updateProfile(updates) {
        try {
            if (!this.currentUser) {
                throw new Error('User not logged in');
            }

            const updateData = {
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('users').doc(this.currentUser.id).update(updateData);

            // Update current user object
            Object.assign(this.currentUser, updates);
            this.createSession(this.currentUser);

            return this.currentUser;
        } catch (error) {
            throw new Error(error.message || 'Profile update failed');
        }
    }

    async changePassword(currentPassword, newPassword) {
        try {
            if (!this.currentUser) {
                throw new Error('User not logged in');
            }

            if (newPassword.length < 6) {
                throw new Error('New password must be at least 6 characters long');
            }

            // Verify current password
            const hashedCurrentPassword = CryptoJS.SHA256(currentPassword).toString();
            const userDoc = await db.collection('users').doc(this.currentUser.id).get();
            
            if (!userDoc.exists || userDoc.data().password !== hashedCurrentPassword) {
                throw new Error('Current password is incorrect');
            }

            // Update password
            const hashedNewPassword = CryptoJS.SHA256(newPassword).toString();
            await db.collection('users').doc(this.currentUser.id).update({
                password: hashedNewPassword,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return true;
        } catch (error) {
            throw new Error(error.message || 'Password change failed');
        }
    }
}

// Initialize auth service
const authService = new AuthService();
window.authService = authService;
