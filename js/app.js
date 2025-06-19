// Main Application Controller
class App {
    constructor() {
        this.currentPage = null;
        this.initialized = false;
        this.init();
    }

    async init() {
        try {
            console.log('App initialization starting...');
            // Show loading screen
            this.showLoading();

            // Wait for Firebase to initialize
            console.log('Waiting for Firebase...');
            await this.waitForFirebase();
            console.log('Firebase initialized');

            // Check authentication state
            if (authService.isLoggedIn()) {
                console.log('User is logged in, loading authenticated app');
                const user = authService.getCurrentUser();
                console.log('Current user:', user.email);
                await this.loadAuthenticatedApp();
            } else {
                console.log('User not logged in, loading login page');
                await this.loadLoginPage();
            }

            // Set up global event listeners
            this.setupEventListeners();

            this.initialized = true;
            console.log('App initialization completed');
        } catch (error) {
            console.error('App initialization failed:', error);
            Utils.showToast('Application failed to initialize', 'error');
        } finally {
            this.hideLoading();
        }
    }

    waitForFirebase() {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max wait
            
            if (window.db) {
                console.log('Firebase already available');
                resolve();
                return;
            }
            
            const checkFirebase = setInterval(() => {
                attempts++;
                console.log(`Checking Firebase availability... attempt ${attempts}`);
                
                if (window.db) {
                    console.log('Firebase is now available');
                    clearInterval(checkFirebase);
                    resolve();
                } else if (attempts >= maxAttempts) {
                    console.error('Firebase failed to initialize within timeout');
                    clearInterval(checkFirebase);
                    reject(new Error('Firebase initialization timeout'));
                }
            }, 100);
        });
    }

    async loadAuthenticatedApp() {
        // Show navigation
        document.getElementById('main-nav').style.display = 'block';
        
        // Update user name in nav
        const user = authService.getCurrentUser();
        document.getElementById('user-name').textContent = `${user.firstName} ${user.lastName}`;

        // Load dashboard by default
        await this.navigateTo('dashboard');

        // Set up navigation listeners
        this.setupNavigation();
    }

    async loadLoginPage() {
        // Hide navigation
        document.getElementById('main-nav').style.display = 'none';
        
        // Load login page
        await this.loadPageContent('login');
    }

    setupEventListeners() {
        // Global logout handler
        document.getElementById('logout-btn')?.addEventListener('click', () => {
            authService.logout();
        });

        // Handle browser back/forward
        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.page) {
                this.navigateTo(event.state.page, false);
            }
        });

        // Handle unload for cleanup
        window.addEventListener('beforeunload', () => {
            // Cleanup operations if needed
        });
    }

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page');
                this.navigateTo(page);
            });
        });
    }

    async navigateTo(page, pushState = true) {
        try {
            // Check authentication for protected pages
            if (!authService.isLoggedIn() && page !== 'login' && page !== 'register') {
                await this.loadLoginPage();
                return;
            }

            // Update active navigation
            this.updateActiveNavigation(page);

            // Load page content
            await this.loadPageContent(page);

            // Update browser history
            if (pushState) {
                history.pushState({ page }, '', `#${page}`);
            }

            this.currentPage = page;

            // Initialize page-specific functionality
            await this.initializePage(page);

        } catch (error) {
            console.error(`Failed to navigate to ${page}:`, error);
            Utils.showToast(`Failed to load ${page} page`, 'error');
        }
    }

    updateActiveNavigation(page) {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            if (link.getAttribute('data-page') === page) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    async loadPageContent(page) {
        const mainContent = document.getElementById('main-content');
        const pageContent = await Utils.loadPage(page);
        mainContent.innerHTML = pageContent;
        
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    async initializePage(page) {
        switch (page) {
            case 'login':
                this.initializeLoginPage();
                break;
            case 'register':
                this.initializeRegisterPage();
                break;
            case 'dashboard':
                await dashboardController.init();
                break;
            case 'leave-request':
                await leaveRequestController.init();
                break;
            case 'calendar':
                await calendarController.init();
                break;
            case 'profile':
                await profileController.init();
                break;
        }
    }

    initializeLoginPage() {
        console.log('Initializing login page...');
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            console.log('Login form found, adding event listener');
            loginForm.addEventListener('submit', async (e) => {
                console.log('Login form submitted');
                e.preventDefault();
                await this.handleLogin(e);
            });
        } else {
            console.error('Login form not found!');
        }

        // Register link
        const registerLink = document.getElementById('register-link');
        if (registerLink) {
            console.log('Register link found, adding event listener');
            registerLink.addEventListener('click', (e) => {
                console.log('Register link clicked');
                e.preventDefault();
                this.navigateTo('register');
            });
        } else {
            console.error('Register link not found!');
        }
    }

    initializeRegisterPage() {
        const registerForm = document.getElementById('register-form');
        if (registerForm) {
            registerForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleRegister(e);
            });
        }

        // Login link
        const loginLink = document.getElementById('login-link');
        if (loginLink) {
            loginLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigateTo('login');
            });
        }
    }

    async handleLogin(event) {
        console.log('handleLogin called');
        const formData = new FormData(event.target);
        const email = formData.get('email');
        const password = formData.get('password');
        const submitBtn = event.target.querySelector('button[type="submit"]');

        console.log('Login attempt:', { email, password: password ? '***' : 'empty' });

        try {
            const originalText = Utils.showLoading(submitBtn);
            console.log('Calling authService.login...');

            await authService.login(email, password);
            
            console.log('Login successful');
            Utils.showToast('Login successful!', 'success');
            await this.loadAuthenticatedApp();

        } catch (error) {
            console.error('Login error:', error);
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading(submitBtn, 'Sign In');
        }
    }

    async handleRegister(event) {
        const formData = new FormData(event.target);
        const userData = {
            email: formData.get('email'),
            password: formData.get('password'),
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            employeeId: formData.get('employeeId'),
            department: formData.get('department'),
            position: formData.get('position'),
            manager: formData.get('manager'),
            startDate: formData.get('startDate')
        };

        const submitBtn = event.target.querySelector('button[type="submit"]');

        try {
            const originalText = Utils.showLoading(submitBtn);

            // Validate passwords match
            const confirmPassword = formData.get('confirmPassword');
            if (userData.password !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            await authService.register(userData);
            
            Utils.showToast('Registration successful!', 'success');
            await this.loadAuthenticatedApp();

        } catch (error) {
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading(submitBtn, 'Create Account');
        }
    }

    showLoading() {
        document.getElementById('loading-screen').style.display = 'flex';
    }

    hideLoading() {
        document.getElementById('loading-screen').style.display = 'none';
    }

    // Error handling
    handleError(error, context = '') {
        console.error(`Error in ${context}:`, error);
        Utils.showToast(`An error occurred${context ? ' in ' + context : ''}`, 'error');
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// Handle initial page load from URL hash
window.addEventListener('load', () => {
    const hash = window.location.hash.slice(1);
    if (hash && window.app && window.app.initialized) {
        window.app.navigateTo(hash);
    }
});
