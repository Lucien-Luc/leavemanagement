// Dashboard Controller
class DashboardController {
    constructor() {
        this.leaveRequests = [];
        this.leaveBalances = {};
        this.stats = {};
    }

    async init() {
        try {
            // Load data directly from Firestore without sample data dependency
            await this.loadData();
            this.renderDashboard();
            this.setupEventListeners();
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            Utils.showToast('Failed to load dashboard data', 'error');
        }
    }

    async loadData() {
        try {
            const user = authService.getCurrentUser();
            if (!user) {
                console.log('No user logged in');
                this.leaveRequests = [];
                this.leaveBalances = {};
                this.calculateStats();
                return;
            }

            console.log('Loading dashboard data for user:', user.email, 'User ID:', user.id);

            // Initialize arrays and objects
            this.leaveRequests = [];
            this.leaveBalances = {};

            // Load user data without sample data

            // Load leave requests directly from Firestore
            try {
                console.log('Querying leave requests for user ID:', user.id);
                // Try without orderBy first to avoid index issues
                const leaveRequestsSnapshot = await db.collection('leave_requests')
                    .where('userId', '==', user.id)
                    .get();

                console.log('Found documents:', leaveRequestsSnapshot.docs.length);

                this.leaveRequests = leaveRequestsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    console.log('Processing leave request:', doc.id, data);
                    return {
                        id: doc.id,
                        ...data,
                        startDate: data.startDate?.toDate(),
                        endDate: data.endDate?.toDate(),
                        createdAt: data.createdAt?.toDate(),
                        approvedAt: data.approvedAt?.toDate(),
                        rejectedAt: data.rejectedAt?.toDate(),
                        cancelledAt: data.cancelledAt?.toDate()
                    };
                });

                console.log('Processed leave requests:', this.leaveRequests.length);
                console.log('Leave requests data:', this.leaveRequests);
            } catch (error) {
                console.error('Error loading leave requests:', error);
                this.leaveRequests = [];
            }

            // Load user data for balances
            try {
                console.log('Loading user document for ID:', user.id);
                const userDoc = await db.collection('users').doc(user.id).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    this.leaveBalances = userData.leaveBalances || {};
                    console.log('Loaded leave balances from Firestore:', this.leaveBalances);
                } else {
                    console.log('User document not found in Firestore, using local data');
                    this.leaveBalances = user.leaveBalances || {
                        vacation: 20,
                        sick: 10,
                        personal: 5,
                        maternity: 90,
                        paternity: 15
                    };
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                this.leaveBalances = user.leaveBalances || {
                    vacation: 20,
                    sick: 10,
                    personal: 5,
                    maternity: 90,
                    paternity: 15
                };
            }

            // Calculate stats
            this.calculateStats();
            console.log('Calculated stats:', this.stats);

        } catch (error) {
            console.error('Error in loadData:', error);
            // Set default values to prevent dashboard from breaking
            this.leaveRequests = [];
            this.leaveBalances = {
                vacation: 20,
                sick: 10,
                personal: 5,
                maternity: 90,
                paternity: 15
            };
            this.calculateStats();
        }
    }

    calculateStats() {
        console.log('Calculating stats with requests:', this.leaveRequests.length);
        console.log('Leave balances:', this.leaveBalances);
        
        const currentYear = new Date().getFullYear();
        const thisYearRequests = this.leaveRequests.filter(request => {
            if (!request.startDate) return false;
            const requestYear = request.startDate.getFullYear();
            console.log('Request year:', requestYear, 'Current year:', currentYear);
            return requestYear === currentYear;
        });

        console.log('This year requests:', thisYearRequests.length);

        this.stats = {
            totalRequests: thisYearRequests.length,
            pendingRequests: thisYearRequests.filter(r => r.status === 'pending').length,
            approvedRequests: thisYearRequests.filter(r => r.status === 'approved').length,
            rejectedRequests: thisYearRequests.filter(r => r.status === 'rejected').length,
            totalDaysUsed: thisYearRequests
                .filter(r => r.status === 'approved')
                .reduce((total, request) => total + (request.days || 0), 0),
            totalDaysRemaining: Object.values(this.leaveBalances || {}).reduce((total, balance) => total + (balance || 0), 0)
        };

        console.log('Final calculated stats:', this.stats);
    }

    renderDashboard() {
        this.updateWelcomeMessage();
        this.renderStats();
        this.renderLeaveBalances();
        this.renderRecentRequests();
        this.renderRejectedRequests();
        this.renderUpcomingLeaves();
    }

    updateWelcomeMessage() {
        const user = authService.getCurrentUser();
        const welcomeElement = document.getElementById('welcome-message');
        if (welcomeElement && user) {
            const firstName = user.firstName || 'User';
            const currentHour = new Date().getHours();
            let greeting = 'Good morning';
            if (currentHour >= 12 && currentHour < 17) greeting = 'Good afternoon';
            else if (currentHour >= 17) greeting = 'Good evening';
            
            welcomeElement.textContent = `${greeting}, ${firstName}! Here's your leave management overview.`;
        }
    }

    renderStats() {
        const statsContainer = document.getElementById('dashboard-stats');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-calendar-check"></i>
                </div>
                <div class="stat-value">${this.stats.totalRequests}</div>
                <div class="stat-label">Total Requests This Year</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="stat-value">${this.stats.pendingRequests}</div>
                <div class="stat-label">Pending Requests</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-value">${this.stats.approvedRequests}</div>
                <div class="stat-label">Approved Requests</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-times-circle"></i>
                </div>
                <div class="stat-value">${this.stats.rejectedRequests}</div>
                <div class="stat-label">Rejected Requests</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-calendar-days"></i>
                </div>
                <div class="stat-value">${this.stats.totalDaysUsed}</div>
                <div class="stat-label">Days Used This Year</div>
            </div>
        `;
    }

    renderLeaveBalances() {
        const balancesContainer = document.getElementById('leave-balances');
        if (!balancesContainer) return;

        const balanceCards = Object.entries(this.leaveBalances).map(([type, balance]) => `
            <div class="balance-card">
                <div class="balance-header">
                    <div class="balance-icon">
                        <i class="fas ${this.getLeaveTypeIcon(type)}"></i>
                    </div>
                    <div class="balance-info">
                        <h5>${Utils.capitalize(type)} Leave</h5>
                        <span class="balance-days">${balance} days</span>
                    </div>
                </div>
                <div class="balance-progress">
                    <div class="progress-bar" style="width: ${Math.min((balance / this.getMaxDays(type)) * 100, 100)}%; background-color: ${Utils.getLeaveTypeColor(type)};"></div>
                </div>
            </div>
        `).join('');

        balancesContainer.innerHTML = balanceCards;
    }

    getLeaveTypeIcon(type) {
        const icons = {
            vacation: 'fa-umbrella-beach',
            sick: 'fa-stethoscope',
            personal: 'fa-user',
            maternity: 'fa-baby',
            paternity: 'fa-baby'
        };
        return icons[type] || 'fa-calendar';
    }

    getMaxDays(type) {
        const maxDays = {
            vacation: 30,
            sick: 15,
            personal: 10,
            maternity: 120,
            paternity: 20
        };
        return maxDays[type] || 30;
    }

    renderRecentRequests() {
        const requestsContainer = document.getElementById('recent-requests');
        if (!requestsContainer) return;

        if (this.leaveRequests.length === 0) {
            requestsContainer.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Recent Leave Requests</h4>
                    </div>
                    <div class="text-center" style="padding: 2rem;">
                        <i class="fas fa-inbox" style="font-size: 3rem; color: var(--medium-grey); margin-bottom: 1rem;"></i>
                        <p>No leave requests found</p>
                        <a href="#" class="btn btn-primary" onclick="app.navigateTo('leave-request')">
                            <i class="fas fa-plus"></i> Create Leave Request
                        </a>
                    </div>
                </div>
            `;
            return;
        }

        const requestRows = this.leaveRequests.slice(0, 5).map(request => `
            <tr>
                <td>${Utils.capitalize(request.leaveType)}</td>
                <td>${Utils.formatDate(request.startDate)} - ${Utils.formatDate(request.endDate)}</td>
                <td>${request.days} days</td>
                <td>
                    <span class="badge ${Utils.getWorkflowStatusBadge(request.status)}">${Utils.getWorkflowStatusText(request.status)}</span>
                    <div class="progress-bar-mini" style="width: 100%; height: 4px; background: #f0f0f0; border-radius: 2px; margin-top: 4px;">
                        <div style="width: ${Utils.getWorkflowProgress(request.status)}%; height: 100%; background: var(--primary); border-radius: 2px;"></div>
                    </div>
                </td>
                <td>
                    ${request.status === 'pending' ? `
                        <button class="btn btn-sm btn-outline" onclick="dashboardController.editRequest('${request.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="dashboardController.cancelRequest('${request.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    ${request.status === 'manager_rejected' && request.managerReason ? `
                        <button class="btn btn-sm btn-info" onclick="alert('Manager Reason: ${request.managerReason}')" title="View rejection reason">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        requestsContainer.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Recent Leave Requests</h4>
                    <a href="#" class="btn btn-primary" onclick="app.navigateTo('leave-request')">
                        <i class="fas fa-plus"></i> New Request
                    </a>
                </div>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Dates</th>
                                <th>Days</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${requestRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderRejectedRequests() {
        const rejectedContainer = document.getElementById('rejected-requests');
        if (!rejectedContainer) return;

        const rejectedRequests = this.leaveRequests.filter(request => 
            request.status === 'rejected'
        ).slice(0, 3);

        if (rejectedRequests.length === 0) {
            rejectedContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle" style="font-size: 2rem; color: var(--success); margin-bottom: 0.5rem;"></i>
                    <p style="margin: 0; color: var(--medium-grey); font-size: 0.9rem;">No rejected requests</p>
                </div>
            `;
            return;
        }

        const rejectedItems = rejectedRequests.map(request => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--light-grey);">
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #dc3545;">
                        ${Utils.capitalize(request.leaveType)} Leave
                    </div>
                    <div style="color: var(--medium-grey); font-size: 0.875rem;">
                        ${Utils.formatDate(request.startDate)} - ${Utils.formatDate(request.endDate)} (${request.days} days)
                    </div>
                    ${request.rejectionReason ? `
                        <div style="background: #f8f9fa; padding: 0.5rem; margin-top: 0.5rem; border-radius: 4px; font-size: 0.875rem;">
                            <strong>Reason:</strong> ${request.rejectionReason}
                        </div>
                    ` : ''}
                </div>
                <div style="text-align: right; color: var(--medium-grey); font-size: 0.875rem;">
                    <div>Rejected by:</div>
                    <div style="font-weight: 600;">${request.rejectedBy || 'HR'}</div>
                </div>
            </div>
        `).join('');

        rejectedContainer.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Recent Rejected Requests</h4>
                </div>
                ${rejectedItems}
            </div>
        `;
    }

    renderUpcomingLeaves() {
        const upcomingContainer = document.getElementById('upcoming-leaves');
        if (!upcomingContainer) return;

        const today = new Date();
        const upcomingLeaves = this.leaveRequests.filter(request => 
            request.status === 'approved' && 
            request.startDate > today
        ).slice(0, 3);

        if (upcomingLeaves.length === 0) {
            upcomingContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar-plus" style="font-size: 2rem; color: var(--primary-blue); margin-bottom: 0.5rem;"></i>
                    <p style="margin: 0; color: var(--medium-grey); font-size: 0.9rem;">No upcoming leaves</p>
                </div>
            `;
            return;
        }

        const leaveItems = upcomingLeaves.map(leave => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--light-grey);">
                <div>
                    <div style="font-weight: 600; color: ${Utils.getLeaveTypeColor(leave.leaveType)}">
                        ${Utils.capitalize(leave.leaveType)} Leave
                    </div>
                    <div style="color: var(--medium-grey); font-size: 0.875rem;">
                        ${Utils.formatDate(leave.startDate)} - ${Utils.formatDate(leave.endDate)}
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 600;">${leave.days} days</div>
                    <div style="color: var(--medium-grey); font-size: 0.875rem;">
                        ${Math.ceil((leave.startDate - today) / (1000 * 60 * 60 * 24))} days away
                    </div>
                </div>
            </div>
        `).join('');

        upcomingContainer.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Upcoming Approved Leaves</h4>
                </div>
                ${leaveItems}
            </div>
        `;
    }

    setupEventListeners() {
        // Quick actions
        const quickRequestBtn = document.getElementById('quick-request-btn');
        if (quickRequestBtn) {
            quickRequestBtn.addEventListener('click', () => {
                app.navigateTo('leave-request');
            });
        }
    }

    async editRequest(requestId) {
        try {
            // Store request ID for editing
            localStorage.setItem('editingLeaveRequest', requestId);
            app.navigateTo('leave-request');
        } catch (error) {
            Utils.showToast('Failed to edit request', 'error');
        }
    }

    async cancelRequest(requestId) {
        if (!confirm('Are you sure you want to cancel this leave request?')) {
            return;
        }

        try {
            await db.collection('leave_requests').doc(requestId).update({
                status: 'cancelled',
                cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast('Leave request cancelled successfully', 'success');
            await this.loadData();
            this.renderDashboard();
        } catch (error) {
            console.error('Error cancelling request:', error);
            Utils.showToast('Failed to cancel leave request', 'error');
        }
    }

    async refresh() {
        await this.loadData();
        this.renderDashboard();
    }
}

// Initialize dashboard controller
const dashboardController = new DashboardController();
window.dashboardController = dashboardController;
