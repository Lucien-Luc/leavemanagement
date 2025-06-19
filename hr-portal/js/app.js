// HR Portal Main Application Controller
class HRApp {
    constructor() {
        this.currentPage = null;
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            console.log('HR Portal initialization starting...');
            this.showLoading();

            // Wait for Firebase to initialize
            await this.waitForFirebase();
            console.log('Firebase initialized for HR Portal');

            // Check authentication state and HR access
            const hasHRAccess = await authService.checkHRAccess();
            if (hasHRAccess) {
                console.log('HR user is logged in, loading portal');
                await this.loadAuthenticatedApp();
            } else {
                console.log('HR user not logged in or no HR access, redirecting to employee portal');
                alert('You need to be logged in as an HR user to access this portal. Please log in through the employee portal first.');
                window.location.href = '../index.html';
                return;
            }

            this.setupEventListeners();
            this.initialized = true;
            console.log('HR Portal initialization completed');
        } catch (error) {
            console.error('HR Portal initialization failed:', error);
            Utils.showToast('HR Portal failed to initialize', 'error');
        } finally {
            this.hideLoading();
        }
    }

    waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50;
            
            if (window.db) {
                console.log('Firebase already available');
                resolve();
                return;
            }
            
            const checkFirebase = () => {
                attempts++;
                if (window.db) {
                    resolve();
                } else if (attempts >= maxAttempts) {
                    reject(new Error('Firebase initialization timeout'));
                } else {
                    setTimeout(checkFirebase, 100);
                }
            };
            
            checkFirebase();
        });
    }

    async loadAuthenticatedApp() {
        // Show navigation
        document.getElementById('main-nav').style.display = 'block';
        
        // Update user name in nav
        const currentUser = authService.getCurrentUser();
        document.getElementById('user-name').textContent = `${currentUser.firstName} ${currentUser.lastName}`;

        // Load dashboard by default
        await this.navigateTo('dashboard');

        // Set up navigation listeners
        this.setupNavigation();
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigateTo(page);
                
                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    async navigateTo(pageName) {
        try {
            this.currentPage = pageName;
            const mainContent = document.getElementById('main-content');
            
            // Update URL hash
            window.location.hash = pageName;
            
            switch (pageName) {
                case 'dashboard':
                    await this.loadPage('pages/dashboard.html');
                    if (window.dashboardController) {
                        await window.dashboardController.init();
                    }
                    break;
                case 'employees':
                    await this.loadPage('pages/employees.html');
                    if (window.employeesController) {
                        await window.employeesController.init();
                    }
                    break;
                case 'leave-requests':
                    await this.loadPage('pages/leave-requests.html');
                    if (window.leaveRequestsController) {
                        await window.leaveRequestsController.init();
                    }
                    break;
                case 'leave-types':
                    await this.loadPage('pages/leave-types.html');
                    if (window.leaveTypesController) {
                        await window.leaveTypesController.init();
                    }
                    break;
                case 'reports':
                    await this.loadPage('pages/reports.html');
                    if (window.reportsController) {
                        await window.reportsController.init();
                    }
                    break;
                default:
                    await this.loadPage('pages/dashboard.html');
                    if (window.dashboardController) {
                        await window.dashboardController.init();
                    }
            }
        } catch (error) {
            console.error('Navigation failed:', error);
            Utils.showToast('Failed to load page', 'error');
        }
    }

    async loadPage(pagePath) {
        try {
            const response = await fetch(pagePath);
            if (!response.ok) {
                throw new Error(`Failed to load page: ${response.status}`);
            }
            const html = await response.text();
            document.getElementById('main-content').innerHTML = html;
        } catch (error) {
            console.error('Error loading page:', error);
            document.getElementById('main-content').innerHTML = `
                <div class="page-header">
                    <h1 class="page-title">Error</h1>
                    <p class="page-subtitle">Failed to load page content</p>
                </div>
            `;
        }
    }

    setupEventListeners() {
        // Logout functionality
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                authService.logout();
                window.location.href = '../index.html';
            });
        }

        // Handle browser back/forward
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash && hash !== this.currentPage) {
                this.navigateTo(hash);
                this.updateActiveNavLink(hash);
            }
        });
    }

    updateActiveNavLink(pageName) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-page') === pageName) {
                link.classList.add('active');
            }
        });
    }

    showLoading() {
        document.getElementById('loading-screen').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-screen').style.display = 'none';
    }
}

// Initialize the HR Portal application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize global controllers
    window.authService = new AuthService();
    window.dashboardController = new DashboardController();
    window.employeesController = new EmployeesController();
    window.leaveRequestsController = new LeaveRequestsController();
    window.leaveTypesController = new LeaveTypesController();
    window.reportsController = new ReportsController();
    
    // Start the application
    window.hrApp = new HRApp();
});