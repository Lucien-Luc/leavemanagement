// Manager Employees Controller
class ManagerEmployeesController {
    constructor() {
        this.employees = [];
        this.pendingEmployees = [];
    }

    async init() {
        try {
            await this.loadEmployees();
            this.renderEmployeesPage();
        } catch (error) {
            console.error('Error initializing employees controller:', error);
            Utils.showToast('Error loading employees data', 'error');
        }
    }

    async loadEmployees() {
        const manager = managerAuthService.getCurrentManager();
        if (!manager || !manager.department) {
            throw new Error('Manager department not found');
        }

        // Load active employees
        this.employees = await departmentsController.getDepartmentEmployees(manager.department);
        
        // Load pending employee approvals
        await this.loadPendingEmployees();
    }

    async loadPendingEmployees() {
        try {
            const manager = managerAuthService.getCurrentManager();
            const pendingSnapshot = await db.collection('employee_requests')
                .where('managerId', '==', manager.id)
                .where('status', '==', 'pending')
                .orderBy('createdAt', 'desc')
                .get();

            this.pendingEmployees = pendingSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error loading pending employees:', error);
            this.pendingEmployees = [];
        }
    }

    renderEmployeesPage() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="manager-dashboard">
                <div class="dashboard-header">
                    <h1>My Team</h1>
                    <p>Manage your department employees</p>
                </div>

                ${this.pendingEmployees.length > 0 ? `
                <div class="manager-section">
                    <h2><i class="fas fa-user-clock"></i> Pending Employee Approvals</h2>
                    <div class="pending-employees">
                        ${this.renderPendingEmployees()}
                    </div>
                </div>
                ` : ''}

                <div class="manager-section">
                    <h2><i class="fas fa-users"></i> Department Employees</h2>
                    <div class="employees-list">
                        ${this.renderEmployeesList()}
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    renderPendingEmployees() {
        return this.pendingEmployees.map(request => `
            <div class="request-card">
                <div class="request-header">
                    <span class="request-employee">${request.firstName} ${request.lastName}</span>
                    <span class="request-date">${Utils.formatDate(request.createdAt?.toDate())}</span>
                </div>
                <div class="request-details">
                    <div class="request-detail">
                        <label>Email</label>
                        <span>${request.email}</span>
                    </div>
                    <div class="request-detail">
                        <label>Employee ID</label>
                        <span>${request.employeeId}</span>
                    </div>
                    <div class="request-detail">
                        <label>Position</label>
                        <span>${request.position}</span>
                    </div>
                    <div class="request-detail">
                        <label>Start Date</label>
                        <span>${Utils.formatDate(request.startDate)}</span>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-approve" onclick="managerApp.controllers.employees.approveEmployee('${request.id}')">
                        <i class="fas fa-check"></i> Approve
                    </button>
                    <button class="btn-reject" onclick="managerApp.controllers.employees.rejectEmployee('${request.id}')">
                        <i class="fas fa-times"></i> Reject
                    </button>
                </div>
            </div>
        `).join('');
    }

    renderEmployeesList() {
        if (this.employees.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Employees</h3>
                    <p>No employees are assigned to your department yet.</p>
                </div>
            `;
        }

        return `
            <div class="employees-grid">
                ${this.employees.map(employee => this.renderEmployeeCard(employee)).join('')}
            </div>
        `;
    }

    renderEmployeeCard(employee) {
        const initials = `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`;
        const joinDate = employee.startDate ? Utils.formatDate(employee.startDate) : 'N/A';
        
        return `
            <div class="employee-card">
                <div class="employee-header">
                    <div class="employee-avatar">${initials}</div>
                    <div class="employee-info">
                        <h4>${employee.firstName} ${employee.lastName}</h4>
                        <p>${employee.position || 'Employee'}</p>
                        <p class="employee-id">ID: ${employee.employeeId}</p>
                    </div>
                    <div class="employee-status">
                        <span class="status-badge ${employee.isActive ? 'available' : 'inactive'}">
                            ${employee.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                
                <div class="employee-details">
                    <div class="detail-row">
                        <span class="detail-label">Email:</span>
                        <span class="detail-value">${employee.email}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Join Date:</span>
                        <span class="detail-value">${joinDate}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Last Login:</span>
                        <span class="detail-value">${employee.lastLogin ? Utils.formatDate(employee.lastLogin.toDate()) : 'Never'}</span>
                    </div>
                </div>

                <div class="leave-balances">
                    <h5>Leave Balances</h5>
                    <div class="balance-grid">
                        <div class="balance-item">
                            <span class="balance-type">Vacation</span>
                            <span class="balance-value">${employee.leaveBalances?.vacation || 0}</span>
                        </div>
                        <div class="balance-item">
                            <span class="balance-type">Sick</span>
                            <span class="balance-value">${employee.leaveBalances?.sick || 0}</span>
                        </div>
                        <div class="balance-item">
                            <span class="balance-type">Personal</span>
                            <span class="balance-value">${employee.leaveBalances?.personal || 0}</span>
                        </div>
                    </div>
                </div>

                <div class="employee-actions">
                    <button class="btn btn-primary" onclick="managerApp.controllers.employees.viewEmployeeDetails('${employee.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                    ${employee.isActive ? 
                        `<button class="btn btn-warning" onclick="managerApp.controllers.employees.deactivateEmployee('${employee.id}')">
                            <i class="fas fa-user-slash"></i> Deactivate
                        </button>` :
                        `<button class="btn btn-success" onclick="managerApp.controllers.employees.activateEmployee('${employee.id}')">
                            <i class="fas fa-user-check"></i> Activate
                        </button>`
                    }
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Add any additional event listeners here
    }

    async approveEmployee(requestId) {
        try {
            const request = this.pendingEmployees.find(req => req.id === requestId);
            if (!request) {
                throw new Error('Employee request not found');
            }

            const manager = managerAuthService.getCurrentManager();

            // Update the employee request status
            await db.collection('employee_requests').doc(requestId).update({
                status: 'approved',
                approvedBy: manager.id,
                approvedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update the user's status to active and confirm department assignment
            await db.collection('users').doc(request.userId).update({
                isActive: true,
                department: manager.department,
                approvedBy: manager.id,
                approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast(`${request.firstName} ${request.lastName} has been approved and activated`, 'success');
            await this.init(); // Reload data
        } catch (error) {
            console.error('Error approving employee:', error);
            Utils.showToast('Error approving employee', 'error');
        }
    }

    async rejectEmployee(requestId) {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;

        try {
            const request = this.pendingEmployees.find(req => req.id === requestId);
            if (!request) {
                throw new Error('Employee request not found');
            }

            const manager = managerAuthService.getCurrentManager();

            // Update the employee request status
            await db.collection('employee_requests').doc(requestId).update({
                status: 'rejected',
                rejectedBy: manager.id,
                rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
                rejectionReason: reason
            });

            // Deactivate the user account
            await db.collection('users').doc(request.userId).update({
                isActive: false,
                rejectionReason: reason,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast(`Employee request rejected`, 'success');
            await this.init(); // Reload data
        } catch (error) {
            console.error('Error rejecting employee:', error);
            Utils.showToast('Error rejecting employee', 'error');
        }
    }

    async deactivateEmployee(employeeId) {
        if (!confirm('Are you sure you want to deactivate this employee?')) {
            return;
        }

        try {
            await db.collection('users').doc(employeeId).update({
                isActive: false,
                deactivatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast('Employee deactivated successfully', 'success');
            await this.init(); // Reload data
        } catch (error) {
            console.error('Error deactivating employee:', error);
            Utils.showToast('Error deactivating employee', 'error');
        }
    }

    async activateEmployee(employeeId) {
        try {
            await db.collection('users').doc(employeeId).update({
                isActive: true,
                reactivatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast('Employee activated successfully', 'success');
            await this.init(); // Reload data
        } catch (error) {
            console.error('Error activating employee:', error);
            Utils.showToast('Error activating employee', 'error');
        }
    }

    viewEmployeeDetails(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        Utils.showModal('employee-details-modal');
        // Implementation for detailed employee view modal would go here
    }
}