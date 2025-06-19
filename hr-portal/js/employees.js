// HR Employees Management Controller
class EmployeesController {
    constructor() {
        this.employees = [];
        this.filteredEmployees = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
    }

    async init() {
        try {
            await this.loadEmployees();
            this.renderEmployeesPage();
            this.setupEventListeners();
            this.startRealTimeUpdates();
        } catch (error) {
            console.error('Employees controller initialization failed:', error);
            Utils.showToast('Failed to load employees data', 'error');
        }
    }

    async loadEmployees() {
        try {
            const snapshot = await db.collection('users').get();
            this.employees = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    startDate: data.startDate,
                    createdAt: data.createdAt?.toDate(),
                    lastLogin: data.lastLogin?.toDate()
                };
            });
            this.applyFilters();
        } catch (error) {
            console.error('Error loading employees:', error);
            this.employees = [];
        }
    }

    renderEmployeesPage() {
        const content = `
            <div class="page-header">
                <h1 class="page-title">Employee Management</h1>
                <p class="page-subtitle">Manage all employees and their information</p>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex gap-2">
                    <input type="text" id="employee-search" class="form-control" placeholder="Search employees..." value="${this.searchTerm}" style="width: 300px;">
                    <select id="employee-filter" class="form-select" style="width: 200px;">
                        <option value="all">All Employees</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="hr">HR Department</option>
                        <option value="recent">Recently Added</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="employeesController.showAddEmployeeModal()">
                    <i class="fas fa-plus"></i> Add Employee
                </button>
            </div>

            <div class="stats-grid mb-3">
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon primary">
                            <i class="fas fa-users"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.employees.length}</div>
                    <div class="stat-label">Total Employees</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon success">
                            <i class="fas fa-user-check"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.employees.filter(e => e.isActive !== false).length}</div>
                    <div class="stat-label">Active Employees</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon warning">
                            <i class="fas fa-building"></i>
                        </div>
                    </div>
                    <div class="stat-value">${new Set(this.employees.map(e => e.department)).size}</div>
                    <div class="stat-label">Departments</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon info">
                            <i class="fas fa-calendar-plus"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.employees.filter(e => {
                        const created = e.createdAt;
                        return created && (Date.now() - created.getTime()) < (30 * 24 * 60 * 60 * 1000);
                    }).length}</div>
                    <div class="stat-label">New This Month</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Employees List (${this.filteredEmployees.length})</h3>
                </div>
                <div class="card-body">
                    ${this.renderEmployeesTable()}
                </div>
            </div>

            ${this.renderAddEmployeeModal()}
            ${this.renderEditEmployeeModal()}
        `;

        document.getElementById('main-content').innerHTML = content;
    }

    renderEmployeesTable() {
        if (this.filteredEmployees.length === 0) {
            return '<p class="text-muted text-center">No employees found matching your criteria.</p>';
        }

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Employee ID</th>
                            <th>Department</th>
                            <th>Position</th>
                            <th>Start Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredEmployees.map(employee => `
                            <tr>
                                <td>
                                    <div>
                                        <strong>${employee.firstName} ${employee.lastName}</strong><br>
                                        <small class="text-muted">${employee.email}</small>
                                    </div>
                                </td>
                                <td>${employee.employeeId || 'N/A'}</td>
                                <td>
                                    <span class="badge badge-info">${employee.department || 'N/A'}</span>
                                </td>
                                <td>${employee.position || 'N/A'}</td>
                                <td>${Utils.formatDate(employee.startDate) || 'N/A'}</td>
                                <td>${Utils.getStatusBadge(employee.isActive === false ? 'inactive' : 'active')}</td>
                                <td>
                                    <button class="btn btn-outline btn-sm" onclick="employeesController.editEmployee('${employee.id}')">
                                        <i class="fas fa-edit"></i> Edit
                                    </button>
                                    <button class="btn btn-info btn-sm" onclick="employeesController.viewLeaveBalance('${employee.id}')">
                                        <i class="fas fa-calendar"></i> Leave
                                    </button>
                                    ${employee.isActive !== false ? `
                                        <button class="btn btn-danger btn-sm" onclick="employeesController.deactivateEmployee('${employee.id}')">
                                            <i class="fas fa-user-times"></i> Deactivate
                                        </button>
                                    ` : `
                                        <button class="btn btn-success btn-sm" onclick="employeesController.activateEmployee('${employee.id}')">
                                            <i class="fas fa-user-check"></i> Activate
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

    renderAddEmployeeModal() {
        return `
            <div id="add-employee-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 class="modal-title">Add New Employee</h4>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="add-employee-form">
                            <div class="form-group">
                                <label class="form-label">First Name</label>
                                <input type="text" class="form-control" name="firstName" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Last Name</label>
                                <input type="text" class="form-control" name="lastName" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" class="form-control" name="email" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Employee ID</label>
                                <input type="text" class="form-control" name="employeeId" value="${Utils.generateEmployeeId()}">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Department</label>
                                <select class="form-select" name="department" required>
                                    <option value="">Select Department</option>
                                    <option value="HR">Human Resources</option>
                                    <option value="IT">Information Technology</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Sales">Sales</option>
                                    <option value="Operations">Operations</option>
                                    <option value="Legal">Legal</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Position</label>
                                <input type="text" class="form-control" name="position" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Manager</label>
                                <input type="text" class="form-control" name="manager">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" class="form-control" name="startDate" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Initial Password</label>
                                <input type="password" class="form-control" name="password" value="BPN123456" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="Utils.hideModal('add-employee-modal')">Cancel</button>
                        <button type="submit" form="add-employee-form" class="btn btn-primary">Add Employee</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderEditEmployeeModal() {
        return `
            <div id="edit-employee-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 class="modal-title">Edit Employee</h4>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-employee-form">
                            <input type="hidden" name="employeeId" id="edit-employee-id">
                            <!-- Form fields will be populated dynamically -->
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="Utils.hideModal('edit-employee-modal')">Cancel</button>
                        <button type="submit" form="edit-employee-form" class="btn btn-primary">Update Employee</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('employee-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchTerm = e.target.value;
                this.applyFilters();
                this.renderEmployeesPage();
            }, 300));
        }

        // Filter functionality
        const filterSelect = document.getElementById('employee-filter');
        if (filterSelect) {
            filterSelect.value = this.currentFilter;
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.applyFilters();
                this.renderEmployeesPage();
            });
        }

        // Add employee form
        const addForm = document.getElementById('add-employee-form');
        if (addForm) {
            addForm.addEventListener('submit', (e) => this.handleAddEmployee(e));
        }

        // Edit employee form
        const editForm = document.getElementById('edit-employee-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleEditEmployee(e));
        }

        // Setup modal close functionality
        Utils.setupModalClose('add-employee-modal');
        Utils.setupModalClose('edit-employee-modal');
    }

    applyFilters() {
        let filtered = [...this.employees];

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(emp => 
                `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(term) ||
                emp.email.toLowerCase().includes(term) ||
                emp.employeeId?.toLowerCase().includes(term) ||
                emp.department?.toLowerCase().includes(term)
            );
        }

        // Apply status filter
        switch (this.currentFilter) {
            case 'active':
                filtered = filtered.filter(emp => emp.isActive !== false);
                break;
            case 'inactive':
                filtered = filtered.filter(emp => emp.isActive === false);
                break;
            case 'hr':
                filtered = filtered.filter(emp => emp.department === 'HR');
                break;
            case 'recent':
                const thirtyDaysAgo = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
                filtered = filtered.filter(emp => emp.createdAt && emp.createdAt > thirtyDaysAgo);
                break;
        }

        this.filteredEmployees = filtered;
    }

    showAddEmployeeModal() {
        Utils.showModal('add-employee-modal');
    }

    async handleAddEmployee(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const employeeData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email').toLowerCase(),
            employeeId: formData.get('employeeId'),
            department: formData.get('department'),
            position: formData.get('position'),
            manager: formData.get('manager'),
            startDate: formData.get('startDate'),
            password: CryptoJS.SHA256(formData.get('password')).toString(),
            isActive: true,
            leaveBalances: {
                vacation: 20,
                sick: 10,
                personal: 5,
                maternity: 90,
                paternity: 15
            },
            createdAt: firebase.firestore.Timestamp.now(),
            updatedAt: firebase.firestore.Timestamp.now()
        };

        try {
            await db.collection('users').add(employeeData);
            Utils.showToast('Employee added successfully', 'success');
            Utils.hideModal('add-employee-modal');
            e.target.reset();
            await this.loadEmployees();
            this.renderEmployeesPage();
        } catch (error) {
            console.error('Error adding employee:', error);
            Utils.showToast('Failed to add employee', 'error');
        }
    }

    async editEmployee(employeeId) {
        const employee = this.employees.find(e => e.id === employeeId);
        if (!employee) return;

        // Populate edit form
        const editForm = document.getElementById('edit-employee-form');
        editForm.innerHTML = `
            <input type="hidden" name="employeeId" value="${employee.id}">
            <div class="form-group">
                <label class="form-label">First Name</label>
                <input type="text" class="form-control" name="firstName" value="${employee.firstName}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Last Name</label>
                <input type="text" class="form-control" name="lastName" value="${employee.lastName}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" name="email" value="${employee.email}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Employee ID</label>
                <input type="text" class="form-control" name="employeeId" value="${employee.employeeId || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Department</label>
                <select class="form-select" name="department" required>
                    <option value="">Select Department</option>
                    <option value="HR" ${employee.department === 'HR' ? 'selected' : ''}>Human Resources</option>
                    <option value="IT" ${employee.department === 'IT' ? 'selected' : ''}>Information Technology</option>
                    <option value="Finance" ${employee.department === 'Finance' ? 'selected' : ''}>Finance</option>
                    <option value="Marketing" ${employee.department === 'Marketing' ? 'selected' : ''}>Marketing</option>
                    <option value="Sales" ${employee.department === 'Sales' ? 'selected' : ''}>Sales</option>
                    <option value="Operations" ${employee.department === 'Operations' ? 'selected' : ''}>Operations</option>
                    <option value="Legal" ${employee.department === 'Legal' ? 'selected' : ''}>Legal</option>
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Position</label>
                <input type="text" class="form-control" name="position" value="${employee.position || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Manager</label>
                <input type="text" class="form-control" name="manager" value="${employee.manager || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Start Date</label>
                <input type="date" class="form-control" name="startDate" value="${employee.startDate || ''}" required>
            </div>
        `;

        Utils.showModal('edit-employee-modal');
    }

    async handleEditEmployee(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const employeeId = formData.get('employeeId');
        
        const updateData = {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            email: formData.get('email').toLowerCase(),
            employeeId: formData.get('employeeId'),
            department: formData.get('department'),
            position: formData.get('position'),
            manager: formData.get('manager'),
            startDate: formData.get('startDate'),
            updatedAt: firebase.firestore.Timestamp.now()
        };

        try {
            await db.collection('users').doc(employeeId).update(updateData);
            Utils.showToast('Employee updated successfully', 'success');
            Utils.hideModal('edit-employee-modal');
            await this.loadEmployees();
            this.renderEmployeesPage();
        } catch (error) {
            console.error('Error updating employee:', error);
            Utils.showToast('Failed to update employee', 'error');
        }
    }

    async deactivateEmployee(employeeId) {
        if (!confirm('Are you sure you want to deactivate this employee?')) return;

        try {
            await db.collection('users').doc(employeeId).update({
                isActive: false,
                updatedAt: firebase.firestore.Timestamp.now()
            });
            Utils.showToast('Employee deactivated successfully', 'success');
            await this.loadEmployees();
            this.renderEmployeesPage();
        } catch (error) {
            console.error('Error deactivating employee:', error);
            Utils.showToast('Failed to deactivate employee', 'error');
        }
    }

    async activateEmployee(employeeId) {
        try {
            await db.collection('users').doc(employeeId).update({
                isActive: true,
                updatedAt: firebase.firestore.Timestamp.now()
            });
            Utils.showToast('Employee activated successfully', 'success');
            await this.loadEmployees();
            this.renderEmployeesPage();
        } catch (error) {
            console.error('Error activating employee:', error);
            Utils.showToast('Failed to activate employee', 'error');
        }
    }

    viewLeaveBalance(employeeId) {
        const employee = this.employees.find(e => e.id === employeeId);
        if (!employee) return;

        const balances = employee.leaveBalances || {};
        alert(`Leave Balances for ${employee.firstName} ${employee.lastName}:
        
Vacation: ${balances.vacation || 0} days
Sick: ${balances.sick || 0} days
Personal: ${balances.personal || 0} days
Maternity: ${balances.maternity || 0} days
Paternity: ${balances.paternity || 0} days`);
    }

    startRealTimeUpdates() {
        db.collection('users').onSnapshot(() => {
            this.loadEmployees().then(() => {
                this.renderEmployeesPage();
            });
        });
    }
}

// Global controller instance
window.employeesController = new EmployeesController();