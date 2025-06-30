// Manager Dashboard Controller
class ManagerDashboardController {
    constructor() {
        this.teamData = [];
        this.pendingRequests = [];
        this.stats = {};
    }

    async init() {
        try {
            await this.loadData();
            this.renderDashboard();
        } catch (error) {
            console.error('Error initializing manager dashboard:', error);
            Utils.showToast('Error loading dashboard data', 'error');
        }
    }

    async loadData() {
        const manager = managerAuthService.getCurrentManager();
        if (!manager || !manager.department) {
            throw new Error('Manager department not found');
        }

        // Load team members
        this.teamData = await departmentsController.getDepartmentEmployees(manager.department);
        
        // Load pending leave requests for the department
        await this.loadPendingRequests();
        
        // Calculate stats
        this.calculateStats();
    }

    async loadPendingRequests() {
        try {
            const manager = managerAuthService.getCurrentManager();
            const requestsSnapshot = await db.collection('leave_requests')
                .where('managerId', '==', manager.id)
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .limit(10)
                .get();

            this.pendingRequests = requestsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
                    endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate),
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
                };
            });
        } catch (error) {
            console.error('Error loading pending requests:', error);
            this.pendingRequests = [];
        }
    }

    calculateStats() {
        const totalEmployees = this.teamData.length;
        const activeEmployees = this.teamData.filter(emp => emp.isActive).length;
        const onLeaveToday = this.getEmployeesOnLeaveToday();
        const pendingRequestsCount = this.pendingRequests.length;

        this.stats = {
            totalEmployees,
            activeEmployees,
            onLeaveToday: onLeaveToday.length,
            pendingRequests: pendingRequestsCount
        };
    }

    getEmployeesOnLeaveToday() {
        // This would need to check against approved leave requests for today
        // For now, return empty array - will be implemented with leave request integration
        return [];
    }

    renderDashboard() {
        const mainContent = document.getElementById('main-content');
        const manager = managerAuthService.getCurrentManager();
        
        mainContent.innerHTML = `
            <div class="manager-dashboard">
                <div class="dashboard-header">
                    <h1>Welcome, ${manager.firstName}!</h1>
                    <p>Department: ${manager.department} | Manager Dashboard</p>
                </div>

                <div class="manager-stats">
                    <div class="manager-stat-card">
                        <h3>Total Team Members</h3>
                        <p class="stat-value">${this.stats.totalEmployees}</p>
                    </div>
                    <div class="manager-stat-card">
                        <h3>Active Employees</h3>
                        <p class="stat-value">${this.stats.activeEmployees}</p>
                    </div>
                    <div class="manager-stat-card">
                        <h3>On Leave Today</h3>
                        <p class="stat-value">${this.stats.onLeaveToday}</p>
                    </div>
                    <div class="manager-stat-card">
                        <h3>Pending Requests</h3>
                        <p class="stat-value">${this.stats.pendingRequests}</p>
                    </div>
                </div>

                <div class="manager-section">
                    <h2><i class="fas fa-users"></i> Team Overview</h2>
                    <div class="team-grid">
                        ${this.renderTeamMembers()}
                    </div>
                </div>

                <div class="manager-section">
                    <h2><i class="fas fa-clock"></i> Pending Leave Requests</h2>
                    <div class="pending-requests">
                        ${this.renderPendingRequests()}
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    renderTeamMembers() {
        if (this.teamData.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Team Members</h3>
                    <p>No employees are assigned to your department yet.</p>
                </div>
            `;
        }

        return this.teamData.map(employee => {
            const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`;
            const status = employee.isActive ? 'available' : 'inactive';
            
            return `
                <div class="team-member-card">
                    <div class="team-member-header">
                        <div class="team-member-avatar">${initials}</div>
                        <div class="team-member-info">
                            <h4>${employee.firstName} ${employee.lastName}</h4>
                            <p>${employee.position || 'Employee'}</p>
                            <p>ID: ${employee.employeeId}</p>
                        </div>
                    </div>
                    <div class="team-member-status">
                        <span class="status-badge ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        <span class="leave-balance">
                            Vacation: ${employee.leaveBalances?.vacation || 0} days
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderPendingRequests() {
        if (this.pendingRequests.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-calendar-check"></i>
                    <h3>No Pending Requests</h3>
                    <p>All leave requests have been processed.</p>
                </div>
            `;
        }

        return this.pendingRequests.map(request => `
            <div class="request-card">
                <div class="request-header">
                    <span class="request-employee">${request.employeeName}</span>
                    <span class="request-date">${Utils.formatDate(request.createdAt?.toDate())}</span>
                </div>
                <div class="request-details">
                    <div class="request-detail">
                        <label>Leave Type</label>
                        <span>${request.leaveType}</span>
                    </div>
                    <div class="request-detail">
                        <label>Duration</label>
                        <span>${Utils.formatDate(request.startDate)} - ${Utils.formatDate(request.endDate)}</span>
                    </div>
                    <div class="request-detail">
                        <label>Days</label>
                        <span>${request.totalDays} days</span>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-view" onclick="managerApp.controllers.dashboard.viewRequest('${request.id}')">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-approve" onclick="managerApp.controllers.dashboard.approveRequest('${request.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-reject" onclick="managerApp.controllers.dashboard.rejectRequest('${request.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Event listeners are handled through onclick attributes in the template
        // This method can be used for additional event setup if needed
    }

    async approveRequest(requestId) {
        try {
            const manager = managerAuthService.getCurrentManager();
            
            await db.collection('leave_requests').doc(requestId).update({
                status: 'manager_approved',
                managerDecision: {
                    managerId: manager.id,
                    managerName: `${manager.firstName} ${manager.lastName}`,
                    approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    decision: 'approved'
                },
                workflow: {
                    stage: 2,
                    stageDescription: 'Pending HR Confirmation'
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast('Leave request approved and sent to HR for confirmation', 'success');
            await this.init(); // Reload data
        } catch (error) {
            console.error('Error approving request:', error);
            Utils.showToast('Error approving request', 'error');
        }
    }

    async rejectRequest(requestId) {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason || reason.trim() === '') return;

        try {
            const manager = managerAuthService.getCurrentManager();
            
            await db.collection('leave_requests').doc(requestId).update({
                status: 'manager_rejected',
                managerReason: reason.trim(),
                managerDecision: {
                    managerId: manager.id,
                    managerName: `${manager.firstName} ${manager.lastName}`,
                    rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    reason: reason.trim()
                },
                workflow: {
                    stage: 3,
                    stageDescription: 'Rejected by Manager'
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast('Leave request rejected successfully', 'success');
            await this.init(); // Reload data
        } catch (error) {
            console.error('Error rejecting request:', error);
            Utils.showToast('Error rejecting request', 'error');
        }
    }

    viewRequest(requestId) {
        // Navigate to leave requests page with specific request
        managerApp.navigateTo('leave-requests');
        // The leave requests controller will handle showing the specific request
    }

    async refresh() {
        await this.init();
    }
}