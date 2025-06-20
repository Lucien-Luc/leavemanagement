// HR Employees Management Controller
class EmployeesController {
    constructor() {
        this.employees = [];
        this.filteredEmployees = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.managers = [];
        this.departments = [];
    }

    async init() {
        try {
            await this.loadEmployees();
            await this.loadManagers();
            await this.loadDepartments();
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

    async loadManagers() {
        try {
            const managersSnapshot = await db.collection('users')
                .where('role', '==', 'manager')
                .where('isActive', '==', true)
                .get();

            this.managers = managersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error loading managers:', error);
            this.managers = [];
        }
    }

    async loadDepartments() {
        try {
            const departmentsSnapshot = await db.collection('departments').get();
            this.departments = departmentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error loading departments:', error);
            this.departments = [];
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
                            <th>Role</th>
                            <th>Department</th>
                            <th>Position</th>
                            <th>Manager</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredEmployees.map(employee => {
                            const manager = this.managers.find(m => m.id === employee.managerId);
                            return `
                            <tr>
                                <td>
                                    <div>
                                        <strong>${employee.firstName} ${employee.lastName}</strong><br>
                                        <small class="text-muted">${employee.email}</small>
                                    </div>
                                </td>
                                <td>${employee.employeeId || 'N/A'}</td>
                                <td>
                                    <span class="badge ${employee.role === 'manager' ? 'badge-success' : 'badge-primary'}">${employee.role === 'manager' ? 'Manager' : 'Employee'}</span>
                                </td>
                                <td>
                                    <span class="badge badge-info">${employee.department || 'N/A'}</span>
                                </td>
                                <td>${employee.position || 'N/A'}</td>
                                <td>${manager ? `${manager.firstName} ${manager.lastName}` : (employee.role === 'manager' ? 'N/A' : 'No Manager')}</td>
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
                        `; 
                        }).join('')}
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
                                <select class="form-select" name="department" id="hr-dept-select" required>
                                    <option value="">Select Department</option>
                                    ${this.departments.map(dept => `<option value="${dept.id}">${dept.name}</option>`).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Position</label>
                                <input type="text" class="form-control" name="position" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Role</label>
                                <select class="form-select" name="role" id="hr-role-select" required>
                                    <option value="employee">Employee</option>
                                    <option value="manager">Manager</option>
                                </select>
                            </div>
                            <div class="form-group" id="manager-selection-group">
                                <label class="form-label">Manager</label>
                                <select class="form-select" name="manager" id="hr-manager-select">
                                    <option value="">Select Manager</option>
                                    ${this.managers.map(manager => `
                                        <option value="${manager.id}">${manager.firstName} ${manager.lastName} (${manager.department})</option>
                                    `).join('')}
                                </select>
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

        // Role selection change handler
        const roleSelect = document.getElementById('hr-role-select');
        if (roleSelect) {
            roleSelect.addEventListener('change', (e) => this.handleRoleChange(e));
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

    handleRoleChange(e) {
        const role = e.target.value;
        const managerGroup = document.getElementById('manager-selection-group');
        const managerSelect = document.getElementById('hr-manager-select');
        
        if (role === 'manager') {
            // Hide manager selection for manager role
            managerGroup.style.display = 'none';
            managerSelect.removeAttribute('required');
            managerSelect.value = '';
        } else {
            // Show manager selection for employee role
            managerGroup.style.display = 'block';
            managerSelect.setAttribute('required', 'required');
        }
    }

    showAddEmployeeModal() {
        Utils.showModal('add-employee-modal');
        // Reset role selection to show manager field by default
        setTimeout(() => {
            const roleSelect = document.getElementById('hr-role-select');
            const managerGroup = document.getElementById('manager-selection-group');
            if (roleSelect && managerGroup) {
                roleSelect.value = 'employee';
                managerGroup.style.display = 'block';
            }
        }, 100);
    }

    async handleAddEmployee(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        try {
            const originalText = Utils.showLoading(submitBtn);
            
            // Validate email doesn't exist
            const existingUser = await db.collection('users')
                .where('email', '==', formData.get('email').toLowerCase())
                .get();
            
            if (!existingUser.empty) {
                throw new Error('User with this email already exists');
            }
            
            const selectedRole = formData.get('role');
            const managerId = formData.get('manager');
            let managerDepartment = '';
            
            // Get department info
            if (managerId && selectedRole === 'employee') {
                const managerDoc = await db.collection('users').doc(managerId).get();
                if (managerDoc.exists) {
                    managerDepartment = managerDoc.data().department;
                }
            } else if (selectedRole === 'manager') {
                // For managers, use the selected department directly
                const selectedDeptId = formData.get('department');
                const deptDoc = await db.collection('departments').doc(selectedDeptId).get();
                if (deptDoc.exists) {
                    managerDepartment = deptDoc.data().id || deptDoc.data().code;
                }
            }
            
            const employeeData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email').toLowerCase(),
                password: CryptoJS.SHA256(formData.get('password')).toString(),
                employeeId: formData.get('employeeId'),
                department: managerDepartment || formData.get('department'),
                position: formData.get('position'),
                managerId: selectedRole === 'employee' ? (managerId || null) : null,
                startDate: formData.get('startDate') || new Date().toISOString().split('T')[0],
                role: selectedRole,
                isActive: true,
                leaveBalances: {
                    vacation: selectedRole === 'manager' ? 30 : 25,
                    sick: selectedRole === 'manager' ? 15 : 12,
                    personal: selectedRole === 'manager' ? 10 : 8,
                    maternity: 90,
                    paternity: 15
                },
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            console.log('Creating employee:', employeeData);
            const docRef = await db.collection('users').add(employeeData);
            console.log('Employee created with ID:', docRef.id);
            
            Utils.showToast('Employee added successfully', 'success');
            Utils.hideModal('add-employee-modal');
            e.target.reset();
            await this.loadEmployees();
            this.renderEmployeesPage();
            
            Utils.hideLoading(submitBtn, originalText);
        } catch (error) {
            console.error('Error adding employee:', error);
            Utils.showToast(error.message || 'Failed to add employee', 'error');
            Utils.hideLoading(submitBtn, 'Add Employee');
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
                <label class="form-label">Position</label>
                <input type="text" class="form-control" name="position" value="${employee.position || ''}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Role</label>
                <select class="form-select" name="role" id="edit-role-select" required>
                    <option value="employee" ${employee.role === 'employee' ? 'selected' : ''}>Employee</option>
                    <option value="manager" ${employee.role === 'manager' ? 'selected' : ''}>Manager</option>
                </select>
            </div>
            <div class="form-group" id="edit-manager-group" style="display: ${employee.role === 'manager' ? 'none' : 'block'}">
                <label class="form-label">Manager</label>
                <select class="form-select" name="manager" id="edit-manager-select" ${employee.role === 'employee' ? 'required' : ''}>
                    <option value="">Select Manager</option>
                    ${this.managers.map(manager => `
                        <option value="${manager.id}" ${employee.managerId === manager.id ? 'selected' : ''}>
                            ${manager.firstName} ${manager.lastName} (${manager.department})
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Department</label>
                <select class="form-select" name="department" id="edit-dept-select" required>
                    <option value="">Select Department</option>
                    ${this.departments.map(dept => `
                        <option value="${dept.id}" ${employee.department === dept.id ? 'selected' : ''}>
                            ${dept.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="form-group">
                <label class="form-label">Status</label>
                <select class="form-select" name="isActive" required>
                    <option value="true" ${employee.isActive !== false ? 'selected' : ''}>Active</option>
                    <option value="false" ${employee.isActive === false ? 'selected' : ''}>Inactive</option>
                </select>
            </div>
        `;

        // Setup role change handler for edit form
        setTimeout(() => {
            const editRoleSelect = document.getElementById('edit-role-select');
            if (editRoleSelect) {
                editRoleSelect.addEventListener('change', (e) => {
                    const role = e.target.value;
                    const managerGroup = document.getElementById('edit-manager-group');
                    const managerSelect = document.getElementById('edit-manager-select');
                    
                    if (role === 'manager') {
                        managerGroup.style.display = 'none';
                        managerSelect.removeAttribute('required');
                        managerSelect.value = '';
                    } else {
                        managerGroup.style.display = 'block';
                        managerSelect.setAttribute('required', 'required');
                    }
                });
            }
        }, 100);

        Utils.showModal('edit-employee-modal');
    }

    async handleEditEmployee(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const employeeId = formData.get('employeeId');
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        try {
            const originalText = Utils.showLoading(submitBtn);
            
            const selectedRole = formData.get('role');
            const managerId = formData.get('manager');
            let departmentToAssign = formData.get('department');
            
            // If changing to manager role and selecting a department, use that department
            // If employee role, use manager's department if manager selected
            if (selectedRole === 'employee' && managerId) {
                const managerDoc = await db.collection('users').doc(managerId).get();
                if (managerDoc.exists) {
                    departmentToAssign = managerDoc.data().department;
                }
            }
            
            const updateData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email').toLowerCase(),
                position: formData.get('position'),
                role: selectedRole,
                department: departmentToAssign,
                managerId: selectedRole === 'employee' ? (managerId || null) : null,
                isActive: formData.get('isActive') === 'true',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log('Updating employee:', employeeId, updateData);
            await db.collection('users').doc(employeeId).update(updateData);
            
            Utils.showToast('Employee updated successfully', 'success');
            Utils.hideModal('edit-employee-modal');
            await this.loadEmployees();
            this.renderEmployeesPage();
            
            Utils.hideLoading(submitBtn, originalText);
        } catch (error) {
            console.error('Error updating employee:', error);
            Utils.showToast(error.message || 'Failed to update employee', 'error');
            Utils.hideLoading(submitBtn, 'Update Employee');
        }
    }

    async handleEditEmployee(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const employeeId = formData.get('employeeId');
        const submitBtn = e.target.querySelector('button[type="submit"]');
        
        try {
            const originalText = Utils.showLoading(submitBtn);
            
            const selectedRole = formData.get('role');
            const managerId = formData.get('manager');
            let departmentToAssign = formData.get('department');
            
            // If changing to employee role and selecting a manager, use manager's department
            if (selectedRole === 'employee' && managerId) {
                const managerDoc = await db.collection('users').doc(managerId).get();
                if (managerDoc.exists) {
                    departmentToAssign = managerDoc.data().department;
                }
            }
            
            const updateData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email').toLowerCase(),
                position: formData.get('position'),
                role: selectedRole,
                department: departmentToAssign,
                managerId: selectedRole === 'employee' ? (managerId || null) : null,
                isActive: formData.get('isActive') === 'true',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            console.log('Updating employee:', employeeId, updateData);
            await db.collection('users').doc(employeeId).update(updateData);
            
            Utils.showToast('Employee updated successfully', 'success');
            Utils.hideModal('edit-employee-modal');
            await this.loadEmployees();
            await this.loadManagers(); // Reload managers in case role changed
            this.renderEmployeesPage();
            
            Utils.hideLoading(submitBtn, originalText);
        } catch (error) {
            console.error('Error updating employee:', error);
            Utils.showToast(error.message || 'Failed to update employee', 'error');
            Utils.hideLoading(submitBtn, 'Update Employee');
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