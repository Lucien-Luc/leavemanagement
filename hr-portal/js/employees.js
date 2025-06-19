// HR Employees Management Controller
class EmployeesController {
    constructor() {
        this.employees = [];
        this.filteredEmployees = [];
        this.currentSort = { field: 'lastName', direction: 'asc' };
        this.searchTerm = '';
        this.realTimeListener = null;
    }

    async init() {
        try {
            await this.loadEmployees();
            this.setupRealTimeListener();
            this.renderEmployees();
            this.setupEventListeners();
        } catch (error) {
            console.error('Employees initialization failed:', error);
            Utils.showToast('Failed to load employees data', 'error');
        }
    }

    async loadEmployees() {
        try {
            const usersSnapshot = await db.collection('users')
                .orderBy('lastName')
                .get();

            this.employees = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(user => !user.isHR); // Exclude HR users from employee list

            this.filteredEmployees = [...this.employees];
        } catch (error) {
            console.error('Error loading employees:', error);
            this.employees = [];
            this.filteredEmployees = [];
        }
    }

    setupRealTimeListener() {
        this.realTimeListener = db.collection('users')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' || change.type === 'modified') {
                        this.loadEmployees().then(() => {
                            this.applyFilters();
                            this.renderEmployeesTable();
                        });
                    }
                });
            });
    }

    renderEmployees() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="page-header">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h1 class="page-title">Employee Management</h1>
                        <p class="page-subtitle">Manage employee accounts and information</p>
                    </div>
                    <button class="btn btn-primary" onclick="employeesController.showAddEmployeeModal()">
                        <i class="fas fa-plus"></i>
                        Add Employee
                    </button>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h3 class="card-title">Employees (${this.filteredEmployees.length})</h3>
                        <div class="d-flex gap-2">
                            <input type="text" id="search-employees" placeholder="Search employees..." class="form-control" style="width: 250px;">
                            <button class="btn btn-outline" onclick="employeesController.exportEmployees()">
                                <i class="fas fa-download"></i>
                                Export
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div id="employees-table-container">
                        ${this.renderEmployeesTable()}
                    </div>
                </div>
            </div>

            <!-- Add Employee Modal -->
            <div id="add-employee-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Add New Employee</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="add-employee-form">
                            <div class="form-group">
                                <label class="form-label">First Name</label>
                                <input type="text" name="firstName" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Last Name</label>
                                <input type="text" name="lastName" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Employee ID</label>
                                <input type="text" name="employeeId" class="form-control" readonly>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Department</label>
                                <select name="department" class="form-control form-select" required>
                                    <option value="">Select Department</option>
                                    <option value="IT">IT</option>
                                    <option value="Human Resources">Human Resources</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Operations">Operations</option>
                                    <option value="Sales">Sales</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Position</label>
                                <input type="text" name="position" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Manager</label>
                                <input type="text" name="manager" class="form-control">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Start Date</label>
                                <input type="date" name="startDate" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Temporary Password</label>
                                <input type="password" name="password" class="form-control" value="BPN123456" required>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="Utils.hideModal('add-employee-modal')">Cancel</button>
                        <button type="submit" form="add-employee-form" class="btn btn-primary">Add Employee</button>
                    </div>
                </div>
            </div>

            <!-- Edit Employee Modal -->
            <div id="edit-employee-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Edit Employee</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-employee-form">
                            <input type="hidden" name="employeeId" id="edit-employee-id">
                            <div class="form-group">
                                <label class="form-label">First Name</label>
                                <input type="text" name="firstName" id="edit-firstName" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Last Name</label>
                                <input type="text" name="lastName" id="edit-lastName" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Email</label>
                                <input type="email" name="email" id="edit-email" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Department</label>
                                <select name="department" id="edit-department" class="form-control form-select" required>
                                    <option value="IT">IT</option>
                                    <option value="Human Resources">Human Resources</option>
                                    <option value="Finance">Finance</option>
                                    <option value="Marketing">Marketing</option>
                                    <option value="Operations">Operations</option>
                                    <option value="Sales">Sales</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Position</label>
                                <input type="text" name="position" id="edit-position" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Manager</label>
                                <input type="text" name="manager" id="edit-manager" class="form-control">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Status</label>
                                <select name="isActive" id="edit-isActive" class="form-control form-select">
                                    <option value="true">Active</option>
                                    <option value="false">Inactive</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="Utils.hideModal('edit-employee-modal')">Cancel</button>
                        <button type="submit" form="edit-employee-form" class="btn btn-primary">Update Employee</button>
                    </div>
                </div>
            </div>
        `;

        // Generate employee ID for new employee
        document.querySelector('input[name="employeeId"]').value = Utils.generateEmployeeId();
    }

    renderEmployeesTable() {
        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th onclick="employeesController.sortBy('employeeId')">Employee ID</th>
                            <th onclick="employeesController.sortBy('lastName')">Name</th>
                            <th onclick="employeesController.sortBy('email')">Email</th>
                            <th onclick="employeesController.sortBy('department')">Department</th>
                            <th onclick="employeesController.sortBy('position')">Position</th>
                            <th onclick="employeesController.sortBy('startDate')">Start Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredEmployees.map(employee => `
                            <tr>
                                <td>${employee.employeeId || 'N/A'}</td>
                                <td>${employee.firstName} ${employee.lastName}</td>
                                <td>${employee.email}</td>
                                <td>${employee.department || 'N/A'}</td>
                                <td>${employee.position || 'N/A'}</td>
                                <td>${Utils.formatDate(employee.startDate)}</td>
                                <td>${Utils.getStatusBadge(employee.isActive !== false ? 'active' : 'inactive')}</td>
                                <td>
                                    <div class="d-flex gap-1">
                                        <button class="btn btn-sm btn-primary" onclick="employeesController.editEmployee('${employee.id}')">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-warning" onclick="employeesController.resetPassword('${employee.id}')">
                                            <i class="fas fa-key"></i>
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="employeesController.toggleEmployeeStatus('${employee.id}', ${employee.isActive !== false})">
                                            <i class="fas fa-${employee.isActive !== false ? 'ban' : 'check'}"></i>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('search-employees');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.applyFilters();
                document.getElementById('employees-table-container').innerHTML = this.renderEmployeesTable();
            }, 300));
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

        // Setup modal close handlers
        Utils.setupModalClose('add-employee-modal');
        Utils.setupModalClose('edit-employee-modal');
    }

    applyFilters() {
        this.filteredEmployees = this.employees.filter(employee => {
            const searchMatch = this.searchTerm === '' || 
                employee.firstName.toLowerCase().includes(this.searchTerm) ||
                employee.lastName.toLowerCase().includes(this.searchTerm) ||
                employee.email.toLowerCase().includes(this.searchTerm) ||
                (employee.department && employee.department.toLowerCase().includes(this.searchTerm)) ||
                (employee.employeeId && employee.employeeId.toLowerCase().includes(this.searchTerm));
            
            return searchMatch;
        });

        this.sortEmployees();
    }

    sortBy(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }
        
        this.sortEmployees();
        document.getElementById('employees-table-container').innerHTML = this.renderEmployeesTable();
    }

    sortEmployees() {
        this.filteredEmployees.sort((a, b) => {
            let aValue = a[this.currentSort.field] || '';
            let bValue = b[this.currentSort.field] || '';
            
            if (this.currentSort.field === 'startDate') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            } else {
                aValue = aValue.toString().toLowerCase();
                bValue = bValue.toString().toLowerCase();
            }
            
            if (this.currentSort.direction === 'asc') {
                return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
            } else {
                return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
            }
        });
    }

    showAddEmployeeModal() {
        // Generate new employee ID
        document.querySelector('input[name="employeeId"]').value = Utils.generateEmployeeId();
        Utils.showModal('add-employee-modal');
    }

    async handleAddEmployee(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        try {
            const originalText = Utils.showLoading(submitBtn);
            
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
                isHR: false,
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

            // Check if email already exists
            const existingUser = await db.collection('users')
                .where('email', '==', employeeData.email)
                .get();

            if (!existingUser.empty) {
                throw new Error('An employee with this email already exists');
            }

            // Add employee to Firestore
            await db.collection('users').add(employeeData);

            Utils.showToast('Employee added successfully', 'success');
            Utils.hideModal('add-employee-modal');
            event.target.reset();
            
            // Refresh employee list
            await this.loadEmployees();
            this.applyFilters();
            document.getElementById('employees-table-container').innerHTML = this.renderEmployeesTable();

        } catch (error) {
            console.error('Error adding employee:', error);
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading(submitBtn, 'Add Employee');
        }
    }

    async editEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) return;

        // Populate edit form
        document.getElementById('edit-employee-id').value = employee.id;
        document.getElementById('edit-firstName').value = employee.firstName;
        document.getElementById('edit-lastName').value = employee.lastName;
        document.getElementById('edit-email').value = employee.email;
        document.getElementById('edit-department').value = employee.department || '';
        document.getElementById('edit-position').value = employee.position || '';
        document.getElementById('edit-manager').value = employee.manager || '';
        document.getElementById('edit-isActive').value = employee.isActive !== false ? 'true' : 'false';

        Utils.showModal('edit-employee-modal');
    }

    async handleEditEmployee(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        try {
            const originalText = Utils.showLoading(submitBtn);
            
            const employeeId = formData.get('employeeId');
            const updateData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email').toLowerCase(),
                department: formData.get('department'),
                position: formData.get('position'),
                manager: formData.get('manager'),
                isActive: formData.get('isActive') === 'true',
                updatedAt: firebase.firestore.Timestamp.now()
            };

            await db.collection('users').doc(employeeId).update(updateData);

            Utils.showToast('Employee updated successfully', 'success');
            Utils.hideModal('edit-employee-modal');
            
            // Refresh employee list
            await this.loadEmployees();
            this.applyFilters();
            document.getElementById('employees-table-container').innerHTML = this.renderEmployeesTable();

        } catch (error) {
            console.error('Error updating employee:', error);
            Utils.showToast('Failed to update employee', 'error');
        } finally {
            Utils.hideLoading(submitBtn, 'Update Employee');
        }
    }

    async resetPassword(employeeId) {
        if (!confirm('Reset password to default (BPN123456)?')) return;

        try {
            const defaultPassword = CryptoJS.SHA256('BPN123456').toString();
            
            await db.collection('users').doc(employeeId).update({
                password: defaultPassword,
                updatedAt: firebase.firestore.Timestamp.now()
            });

            Utils.showToast('Password reset successfully', 'success');
        } catch (error) {
            console.error('Error resetting password:', error);
            Utils.showToast('Failed to reset password', 'error');
        }
    }

    async toggleEmployeeStatus(employeeId, currentStatus) {
        const action = currentStatus ? 'deactivate' : 'activate';
        if (!confirm(`Are you sure you want to ${action} this employee?`)) return;

        try {
            await db.collection('users').doc(employeeId).update({
                isActive: !currentStatus,
                updatedAt: firebase.firestore.Timestamp.now()
            });

            Utils.showToast(`Employee ${action}d successfully`, 'success');
            
            // Refresh employee list
            await this.loadEmployees();
            this.applyFilters();
            document.getElementById('employees-table-container').innerHTML = this.renderEmployeesTable();

        } catch (error) {
            console.error('Error updating employee status:', error);
            Utils.showToast('Failed to update employee status', 'error');
        }
    }

    exportEmployees() {
        if (this.filteredEmployees.length === 0) {
            Utils.showToast('No employees to export', 'warning');
            return;
        }

        const exportData = this.filteredEmployees.map(employee => ({
            'Employee ID': employee.employeeId || '',
            'First Name': employee.firstName,
            'Last Name': employee.lastName,
            'Email': employee.email,
            'Department': employee.department || '',
            'Position': employee.position || '',
            'Manager': employee.manager || '',
            'Start Date': Utils.formatDate(employee.startDate),
            'Status': employee.isActive !== false ? 'Active' : 'Inactive'
        }));

        Utils.exportToCSV(exportData, `employees_${Utils.formatDate(new Date())}.csv`);
    }

    destroy() {
        if (this.realTimeListener) {
            this.realTimeListener();
        }
    }
}