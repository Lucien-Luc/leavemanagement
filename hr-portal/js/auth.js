// HR Portal Authentication Service
class AuthService {
    constructor() {
        this.currentUser = null;
        this.sessionKey = 'bpn_hr_session';
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

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem(this.sessionKey);
    }

    // For HR portal, we'll use the same authentication as employee portal
    // but check if user has HR privileges
    async checkHRAccess() {
        const employeeSession = localStorage.getItem('bpn_leave_session');
        if (!employeeSession) return false;

        try {
            const session = JSON.parse(employeeSession);
            if (session.expires > Date.now()) {
                const user = session.user;
                // Check if user has HR role - must be exactly 'hr'
                if (user.role === 'hr') {
                    this.currentUser = user;
                    this.createHRSession(user);
                    return true;
                }
            }
        } catch (error) {
            console.error('Error checking HR access:', error);
        }
        
        return false;
    }

    createHRSession(user) {
        const sessionData = {
            user: user,
            expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    }
}

// Global auth service instance
window.authService = new AuthService();