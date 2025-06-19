// Dashboard Controller
class DashboardController {
    constructor() {
        this.leaveRequests = [];
        this.leaveBalances = {};
        this.stats = {};
    }

    async init() {
        try {
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
                return;
            }

            console.log('Loading dashboard data for user:', user.email);

            // Load leave requests
            try {
                const leaveRequestsSnapshot = await db.collection('leave_requests')
                    .where('userId', '==', user.id)
                    .orderBy('createdAt', 'desc')
                    .limit(10)
                    .get();

                this.leaveRequests = leaveRequestsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    startDate: doc.data().startDate?.toDate(),
                    endDate: doc.data().endDate?.toDate(),
                    createdAt: doc.data().createdAt?.toDate()
                }));

                console.log('Loaded leave requests:', this.leaveRequests.length);
            } catch (error) {
                console.error('Error loading leave requests:', error);
                this.leaveRequests = [];
            }

            // Load user data for balances
            try {
                const userDoc = await db.collection('users').doc(user.id).get();
                if (userDoc.exists) {
                    this.leaveBalances = userDoc.data().leaveBalances || {};
                    console.log('Loaded leave balances:', this.leaveBalances);
                } else {
                    console.log('User document not found in Firestore');
                    this.leaveBalances = user.leaveBalances || {};
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                this.leaveBalances = user.leaveBalances || {};
            }

            // Calculate stats
            this.calculateStats();

        } catch (error) {
            console.error('Error in loadData:', error);
            // Set default values to prevent dashboard from breaking
            this.leaveRequests = [];
            this.leaveBalances = {};
            this.calculateStats();
        }
    }

    calculateStats() {
        const currentYear = new Date().getFullYear();
        const thisYearRequests = this.leaveRequests.filter(request => 
            request.startDate && request.startDate.getFullYear() === currentYear
        );

        this.stats = {
            totalRequests: thisYearRequests.length,
            pendingRequests: thisYearRequests.filter(r => r.status === 'pending').length,
            approvedRequests: thisYearRequests.filter(r => r.status === 'approved').length,
            totalDaysUsed: thisYearRequests
                .filter(r => r.status === 'approved')
                .reduce((total, request) => total + (request.days || 0), 0),
            totalDaysRemaining: Object.values(this.leaveBalances).reduce((total, balance) => total + balance, 0)
        };
    }

    renderDashboard() {
        this.renderStats();
        this.renderLeaveBalances();
        this.renderRecentRequests();
        this.renderUpcomingLeaves();
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
            <div class="col-md-4">
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">${Utils.capitalize(type)} Leave</h4>
                    </div>
                    <div class="text-center">
                        <div class="stat-value" style="color: ${Utils.getLeaveTypeColor(type)}">${balance}</div>
                        <div class="stat-label">Days Remaining</div>
                    </div>
                </div>
            </div>
        `).join('');

        balancesContainer.innerHTML = `
            <div class="row">
                ${balanceCards}
            </div>
        `;
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
                <td><span class="badge ${Utils.getStatusBadgeClass(request.status)}">${Utils.capitalize(request.status)}</span></td>
                <td>
                    ${request.status === 'pending' ? `
                        <button class="btn btn-sm btn-outline" onclick="dashboardController.editRequest('${request.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="dashboardController.cancelRequest('${request.id}')">
                            <i class="fas fa-times"></i>
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
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Upcoming Approved Leaves</h4>
                    </div>
                    <div class="text-center" style="padding: 2rem;">
                        <i class="fas fa-calendar" style="font-size: 3rem; color: var(--medium-grey); margin-bottom: 1rem;"></i>
                        <p>No upcoming approved leaves</p>
                    </div>
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
