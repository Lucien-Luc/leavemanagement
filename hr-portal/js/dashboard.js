// HR Dashboard Controller
class DashboardController {
    constructor() {
        this.stats = {};
        this.recentActivities = [];
        this.realTimeListeners = [];
    }

    async init() {
        try {
            await this.loadDashboardData();
            this.setupRealTimeListeners();
            this.renderDashboard();
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            Utils.showToast('Failed to load dashboard data', 'error');
        }
    }

    async loadDashboardData() {
        try {
            // Load statistics
            await this.loadStats();
            
            // Load recent activities
            await this.loadRecentActivities();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            throw error;
        }
    }

    async loadStats() {
        try {
            // Get total employees
            const usersSnapshot = await db.collection('users').get();
            const totalEmployees = usersSnapshot.size;
            
            // Get active employees (not including HR users)
            const activeEmployees = usersSnapshot.docs.filter(doc => {
                const data = doc.data();
                return data.isActive !== false && !data.isHR;
            }).length;

            // Get leave requests statistics
            const leaveRequestsSnapshot = await db.collection('leave_requests').get();
            const allRequests = leaveRequestsSnapshot.docs.map(doc => doc.data());
            
            const pendingRequests = allRequests.filter(req => req.status === 'pending').length;
            const approvedRequests = allRequests.filter(req => req.status === 'approved').length;
            const rejectedRequests = allRequests.filter(req => req.status === 'rejected').length;

            // Get current month requests
            const currentMonth = new Date();
            const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
            const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
            
            const currentMonthRequests = allRequests.filter(req => {
                const createdAt = req.createdAt.toDate();
                return createdAt >= firstDay && createdAt <= lastDay;
            }).length;

            this.stats = {
                totalEmployees,
                activeEmployees,
                pendingRequests,
                approvedRequests,
                rejectedRequests,
                currentMonthRequests,
                totalRequests: allRequests.length
            };
        } catch (error) {
            console.error('Error loading stats:', error);
            this.stats = {
                totalEmployees: 0,
                activeEmployees: 0,
                pendingRequests: 0,
                approvedRequests: 0,
                rejectedRequests: 0,
                currentMonthRequests: 0,
                totalRequests: 0
            };
        }
    }

    async loadRecentActivities() {
        try {
            // Get recent leave requests (last 10)
            const recentRequestsSnapshot = await db.collection('leave_requests')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            this.recentActivities = recentRequestsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    type: 'leave_request',
                    action: 'submitted',
                    user: data.userName,
                    details: `${data.leaveType} leave for ${data.days} days`,
                    timestamp: data.createdAt.toDate(),
                    status: data.status
                };
            });
        } catch (error) {
            console.error('Error loading recent activities:', error);
            this.recentActivities = [];
        }
    }

    setupRealTimeListeners() {
        // Listen for new leave requests
        const leaveRequestsListener = db.collection('leave_requests')
            .where('status', '==', 'pending')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const data = change.doc.data();
                        Utils.showToast(`New leave request from ${data.userName}`, 'info');
                        this.loadStats(); // Refresh stats
                    }
                });
            });

        this.realTimeListeners.push(leaveRequestsListener);
    }

    renderDashboard() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">HR Dashboard</h1>
                <p class="page-subtitle">Manage employees and leave requests</p>
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
                        <div class="stat-icon success">
                            <i class="fas fa-user-check"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.stats.activeEmployees}</div>
                    <div class="stat-label">Active Employees</div>
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
                        <div class="stat-icon info">
                            <i class="fas fa-calendar-month"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.stats.currentMonthRequests}</div>
                    <div class="stat-label">This Month's Requests</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Leave Requests Overview</h3>
                </div>
                <div class="card-body">
                    <canvas id="leaveChart" width="400" height="200"></canvas>
                </div>
            </div>

            <div class="card mt-3">
                <div class="card-header">
                    <h3 class="card-title">Recent Activities</h3>
                </div>
                <div class="card-body">
                    <div id="recent-activities">
                        ${this.renderRecentActivities()}
                    </div>
                </div>
            </div>
        `;

        this.renderChart();
    }

    renderChart() {
        const ctx = document.getElementById('leaveChart');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Approved', 'Pending', 'Rejected'],
                datasets: [{
                    data: [
                        this.stats.approvedRequests,
                        this.stats.pendingRequests,
                        this.stats.rejectedRequests
                    ],
                    backgroundColor: [
                        'var(--success-color)',
                        'var(--warning-color)',
                        'var(--danger-color)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderRecentActivities() {
        if (this.recentActivities.length === 0) {
            return '<p class="text-muted">No recent activities</p>';
        }

        return this.recentActivities.map(activity => `
            <div class="d-flex align-items-center justify-content-between mb-2 p-2" style="border-left: 3px solid var(--primary-color); background: rgba(27, 123, 156, 0.05);">
                <div>
                    <strong>${activity.user}</strong> ${activity.action} a leave request
                    <br>
                    <small class="text-muted">${activity.details}</small>
                </div>
                <div class="text-right">
                    ${Utils.getStatusBadge(activity.status)}
                    <br>
                    <small class="text-muted">${Utils.formatDateTime(activity.timestamp)}</small>
                </div>
            </div>
        `).join('');
    }

    destroy() {
        // Clean up real-time listeners
        this.realTimeListeners.forEach(listener => listener());
        this.realTimeListeners = [];
    }
}