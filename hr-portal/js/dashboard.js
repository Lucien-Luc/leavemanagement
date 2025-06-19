// HR Dashboard Controller
class DashboardController {
    constructor() {
        this.stats = {};
        this.recentRequests = [];
        this.employees = [];
    }

    async init() {
        try {
            await this.loadDashboardData();
            this.renderDashboard();
            this.setupEventListeners();
            this.startRealTimeUpdates();
        } catch (error) {
            console.error('HR Dashboard initialization failed:', error);
            Utils.showToast('Failed to load dashboard data', 'error');
        }
    }

    async loadDashboardData() {
        await Promise.all([
            this.loadStats(),
            this.loadRecentRequests(),
            this.loadEmployeeData()
        ]);
    }

    async loadStats() {
        try {
            // Get all leave requests
            const leaveRequestsSnapshot = await db.collection('leave_requests').get();
            const requests = leaveRequestsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Get all employees
            const employeesSnapshot = await db.collection('users').get();
            const employees = employeesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Calculate stats
            this.stats = {
                totalEmployees: employees.length,
                totalRequests: requests.length,
                pendingRequests: requests.filter(r => r.status === 'pending').length,
                approvedRequests: requests.filter(r => r.status === 'approved').length,
                rejectedRequests: requests.filter(r => r.status === 'rejected').length,
                activeEmployees: employees.filter(e => e.isActive !== false).length
            };

        } catch (error) {
            console.error('Error loading stats:', error);
            this.stats = {
                totalEmployees: 0,
                totalRequests: 0,
                pendingRequests: 0,
                approvedRequests: 0,
                rejectedRequests: 0,
                activeEmployees: 0
            };
        }
    }

    async loadRecentRequests() {
        try {
            const snapshot = await db.collection('leave_requests')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            this.recentRequests = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    startDate: data.startDate?.toDate(),
                    endDate: data.endDate?.toDate(),
                    createdAt: data.createdAt?.toDate()
                };
            });
        } catch (error) {
            console.error('Error loading recent requests:', error);
            this.recentRequests = [];
        }
    }

    async loadEmployeeData() {
        try {
            const snapshot = await db.collection('users').get();
            this.employees = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error loading employee data:', error);
            this.employees = [];
        }
    }

    renderDashboard() {
        const content = `
            <div class="page-header">
                <h1 class="page-title">HR Dashboard</h1>
                <p class="page-subtitle">Overview of leave management system</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon primary">
                            <i class="fas fa-users"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.stats.totalEmployees}</div>
                    <div class="stat-label">Total Employees</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon warning">
                            <i class="fas fa-clock"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.stats.pendingRequests}</div>
                    <div class="stat-label">Pending Requests</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon success">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.stats.approvedRequests}</div>
                    <div class="stat-label">Approved Requests</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon danger">
                            <i class="fas fa-times-circle"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.stats.rejectedRequests}</div>
                    <div class="stat-label">Rejected Requests</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Recent Leave Requests</h3>
                </div>
                <div class="card-body">
                    ${this.renderRecentRequestsTable()}
                </div>
            </div>
        `;

        document.getElementById('main-content').innerHTML = content;
    }

    renderRecentRequestsTable() {
        if (this.recentRequests.length === 0) {
            return '<p class="text-muted text-center">No recent leave requests found.</p>';
        }

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Leave Type</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Days</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.recentRequests.map(request => `
                            <tr>
                                <td>
                                    <div>
                                        <strong>${request.userName}</strong><br>
                                        <small class="text-muted">${request.userEmail}</small>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge badge-info">${request.leaveType}</span>
                                </td>
                                <td>${Utils.formatDate(request.startDate)}</td>
                                <td>${Utils.formatDate(request.endDate)}</td>
                                <td>${request.days}</td>
                                <td>${Utils.getStatusBadge(request.status)}</td>
                                <td>
                                    ${request.status === 'pending' ? `
                                        <button class="btn btn-success btn-sm" onclick="dashboardController.approveRequest('${request.id}')">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button class="btn btn-danger btn-sm" onclick="dashboardController.rejectRequest('${request.id}')">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    ` : `
                                        <button class="btn btn-outline btn-sm" onclick="dashboardController.viewRequest('${request.id}')">
                                            <i class="fas fa-eye"></i> View
                                        </button>
                                    `}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async approveRequest(requestId) {
        try {
            const currentUser = authService.getCurrentUser();
            await db.collection('leave_requests').doc(requestId).update({
                status: 'approved',
                approvedBy: `${currentUser.firstName} ${currentUser.lastName}`,
                approvedAt: firebase.firestore.Timestamp.now(),
                updatedAt: firebase.firestore.Timestamp.now()
            });

            Utils.showToast('Leave request approved successfully', 'success');
            await this.loadDashboardData();
            this.renderDashboard();
        } catch (error) {
            console.error('Error approving request:', error);
            Utils.showToast('Failed to approve request', 'error');
        }
    }

    async rejectRequest(requestId) {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;

        try {
            const currentUser = authService.getCurrentUser();
            await db.collection('leave_requests').doc(requestId).update({
                status: 'rejected',
                rejectedBy: `${currentUser.firstName} ${currentUser.lastName}`,
                rejectionReason: reason,
                rejectedAt: firebase.firestore.Timestamp.now(),
                updatedAt: firebase.firestore.Timestamp.now()
            });

            Utils.showToast('Leave request rejected', 'success');
            await this.loadDashboardData();
            this.renderDashboard();
        } catch (error) {
            console.error('Error rejecting request:', error);
            Utils.showToast('Failed to reject request', 'error');
        }
    }

    viewRequest(requestId) {
        // Navigate to leave requests page with this request selected
        window.location.hash = 'leave-requests';
        // You can implement detailed view logic here
    }

    setupEventListeners() {
        // Add any additional event listeners here
    }

    startRealTimeUpdates() {
        // Listen for real-time updates to leave requests
        db.collection('leave_requests').onSnapshot(() => {
            this.loadDashboardData().then(() => {
                this.renderDashboard();
            });
        });
    }
}

// Global controller instance
window.dashboardController = new DashboardController();