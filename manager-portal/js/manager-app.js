// Manager Portal Application
class ManagerApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.controllers = {};
    }

    async init() {
        console.log('Manager Portal initialization starting...');
        
        // Wait for Firebase to be ready
        await this.waitForFirebase();
        
        // Check manager access
        const hasAccess = await managerAuthService.checkManagerAccess();
        if (!hasAccess) {
            return;
        }

        // Initialize departments controller
        await departmentsController.init();

        // Load the authenticated manager portal
        await this.loadAuthenticatedApp();
        
        console.log('Manager Portal initialization completed');
    }

    waitForFirebase() {
        return new Promise((resolve) => {
            if (typeof firebase !== 'undefined' && firebase.firestore) {
                console.log('Firebase already available');
                resolve();
            } else {
                console.log('Waiting for Firebase...');
                const checkFirebase = () => {
                    if (typeof firebase !== 'undefined' && firebase.firestore) {
                        console.log('Firebase initialized');
                        resolve();
                    } else {
                        setTimeout(checkFirebase, 100);
                    }
                };
                checkFirebase();
            }
        });
    }

    async loadAuthenticatedApp() {
        try {
            // Update navigation with manager info
            this.updateNavigation();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize controllers
            this.controllers.dashboard = new ManagerDashboardController();
            this.controllers.employees = new ManagerEmployeesController();
            this.controllers.leaveRequests = new ManagerLeaveRequestsController();
            this.controllers.reports = new ManagerReportsController();
            
            // Load initial page
            await this.navigateTo('dashboard');
            
            // Hide loading screen
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading authenticated app:', error);
            Utils.showToast('Error loading manager portal', 'error');
        }
    }

    updateNavigation() {
        const manager = managerAuthService.getCurrentManager();
        if (manager) {
            const userNameElement = document.getElementById('user-name');
            if (userNameElement) {
                userNameElement.textContent = `${manager.firstName} ${manager.lastName}`;
            }
        }
    }

    setupEventListeners() {
        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.currentTarget.dataset.page;
                this.navigateTo(page);
            });
        });

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                managerAuthService.logout();
            });
        }
    }

    async navigateTo(pageName) {
        try {
            this.showLoading();
            
            // Update active navigation
            this.updateActiveNavLink(pageName);
            
            // Load page content
            await this.loadPageContent(pageName);
            
            // Update current page
            this.currentPage = pageName;
            
            this.hideLoading();
            
        } catch (error) {
            console.error(`Error navigating to ${pageName}:`, error);
            Utils.showToast(`Error loading ${pageName}`, 'error');
            this.hideLoading();
        }
    }

    async loadPageContent(pageName) {
        const mainContent = document.getElementById('main-content');
        
        switch (pageName) {
            case 'dashboard':
                await this.controllers.dashboard.init();
                break;
            case 'employees':
                await this.controllers.employees.init();
                break;
            case 'leave-requests':
                await this.controllers.leaveRequests.init();
                break;
            case 'reports':
                await this.controllers.reports.init();
                break;
            default:
                mainContent.innerHTML = '<div class="error-message">Page not found</div>';
        }
    }

    updateActiveNavLink(pageName) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`[data-page="${pageName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }

    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
}

// Initialize the manager app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.managerApp = new ManagerApp();
    window.managerApp.init();
});