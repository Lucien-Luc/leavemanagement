// Manager Authentication Module
class ManagerAuthService {
    constructor() {
        this.currentManager = null;
    }

    async checkManagerAccess() {
        const authService = window.authService || new AuthService();
        
        if (!authService.isLoggedIn()) {
            window.location.href = '../';
            return false;
        }

        const user = authService.getCurrentUser();
        
        // Check if user has manager role
        if (user.role !== 'manager') {
            Utils.showToast('Access denied. Manager role required.', 'error');
            setTimeout(() => {
                window.location.href = '../';
            }, 2000);
            return false;
        }

        // Check if manager is active
        if (!user.isActive) {
            Utils.showToast('Your account is inactive. Please contact HR.', 'error');
            setTimeout(() => {
                window.location.href = '../';
            }, 2000);
            return false;
        }

        this.currentManager = user;
        return true;
    }

    getCurrentManager() {
        return this.currentManager;
    }

    createManagerSession(manager) {
        this.currentManager = manager;
        // Use the existing auth service session
        const authService = window.authService || new AuthService();
        authService.createSession(manager);
    }

    logout() {
        this.currentManager = null;
        const authService = window.authService || new AuthService();
        authService.logout();
    }
}

// Global instance
window.managerAuthService = new ManagerAuthService();