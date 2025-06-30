// HR Departments Controller
class DepartmentsController {
    constructor() {
        this.departments = [];
        this.availableManagers = [];
        this.employees = [];
        this.filteredDepartments = [];
        this.searchTerm = '';
        this.currentFilter = 'all';
    }

    async init() {
        try {
            await this.loadData();
            this.renderDepartmentsPage();
        } catch (error) {
            console.error('Error initializing departments controller:', error);
            Utils.showToast('Error loading departments data', 'error');
        }
    }

    async loadData() {
        await this.loadDepartments();
        await this.loadAvailableManagers();
        await this.loadEmployees();
        this.applyFilters();
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

    async loadAvailableManagers() {
        try {
            const usersSnapshot = await db.collection('users')
                .where('isActive', '==', true)
                .where('role', 'in', ['employee', 'manager'])
                .get();

            this.availableManagers = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error loading available managers:', error);
            this.availableManagers = [];
        }
    }

    async loadEmployees() {
        try {
            const employeesSnapshot = await db.collection('users').get();
            this.employees = employeesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error loading employees:', error);
            this.employees = [];
        }
    }

    applyFilters() {
        let filtered = [...this.departments];

        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(dept => 
                dept.name.toLowerCase().includes(term) ||
                dept.code.toLowerCase().includes(term) ||
                (dept.description && dept.description.toLowerCase().includes(term))
            );
        }

        switch (this.currentFilter) {
            case 'with-manager':
                filtered = filtered.filter(dept => dept.managerId);
                break;
            case 'without-manager':
                filtered = filtered.filter(dept => !dept.managerId);
                break;
            case 'active':
                filtered = filtered.filter(dept => dept.isActive !== false);
                break;
        }

        this.filteredDepartments = filtered;
    }

    renderDepartmentsPage() {
        const mainContent = document.getElementById('main-content');
        
        fetch('pages/departments.html')
            .then(response => response.text())
            .then(html => {
                mainContent.innerHTML = html;
                this.renderStats();
                this.renderDepartmentsList();
                this.setupEventListeners();
                this.populateManagerDropdowns();
            })
            .catch(error => {
                console.error('Error loading departments page:', error);
                mainContent.innerHTML = '<div class="error-message">Error loading departments page</div>';
            });
    }

    renderStats() {
        const totalDepts = this.departments.length;
        const deptsWithManagers = this.departments.filter(d => d.managerId).length;
        const totalEmployees = this.employees.length;
        const avgDeptSize = totalDepts > 0 ? Math.round(totalEmployees / totalDepts) : 0;

        document.getElementById('total-departments').textContent = totalDepts;
        document.getElementById('departments-with-managers').textContent = deptsWithManagers;
        document.getElementById('total-employees').textContent = totalEmployees;
        document.getElementById('avg-dept-size').textContent = avgDeptSize;
    }

    renderDepartmentsList() {
        const container = document.getElementById('departments-container');
        if (!container) return;

        if (this.filteredDepartments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-building"></i>
                    <h3>No Departments Found</h3>
                    <p>${this.departments.length === 0 ? 'Create your first department to get started.' : 'Try adjusting your search or filter criteria.'}</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="departments-grid">
                ${this.filteredDepartments.map(dept => this.renderDepartmentCard(dept)).join('')}
            </div>
        `;
    }

    renderDepartmentCard(department) {
        const manager = this.availableManagers.find(m => m.id === department.managerId);
        const deptEmployees = this.employees.filter(e => e.department === department.id || e.department === department.code);
        const employeeCount = deptEmployees.length;
        
        return `
            <div class="department-card">
                <div class="dept-header">
                    <div class="dept-code-badge">
                        <span class="dept-code">${department.code}</span>
                        <span class="dept-status ${department.isActive !== false ? 'active' : 'inactive'}"></span>
                    </div>
                    <div class="dept-actions">
                        <button class="btn-icon" onclick="window.departmentsController.editDepartment('${department.id}')" title="Edit Department">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="window.departmentsController.viewDepartmentDetails('${department.id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon text-danger" onclick="window.departmentsController.deleteDepartment('${department.id}')" title="Delete Department">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="dept-content">
                    <h4 class="dept-name">${department.name}</h4>
                    <p class="dept-description">${department.description || 'No description provided'}</p>
                    
                    <div class="dept-stats">
                        <div class="stat-item">
                            <i class="fas fa-users text-primary"></i>
                            <span>${employeeCount} Employee${employeeCount !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-user-tie text-success"></i>
                            <span>${manager ? `${manager.firstName} ${manager.lastName}` : 'No Manager'}</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-calendar text-info"></i>
                            <span>Created ${Utils.formatDate(department.createdAt) || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                <div class="dept-footer">
                    <div class="dept-quick-actions">
                        ${!manager ? `
                            <button class="btn btn-sm btn-primary" onclick="window.departmentsController.showAssignManagerModal('${department.id}')">
                                <i class="fas fa-user-plus"></i> Assign Manager
                            </button>
                        ` : `
                            <button class="btn btn-sm btn-outline" onclick="window.departmentsController.changeManager('${department.id}')">
                                <i class="fas fa-user-edit"></i> Change Manager
                            </button>
                        `}
                        <button class="btn btn-sm btn-info" onclick="window.departmentsController.viewEmployees('${department.id}')">
                            <i class="fas fa-users"></i> View Employees
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('dept-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchTerm = e.target.value;
                this.applyFilters();
                this.renderDepartmentsList();
            }, 300));
        }

        // Filter functionality
        const filterSelect = document.getElementById('dept-filter');
        if (filterSelect) {
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.applyFilters();
                this.renderDepartmentsList();
            });
        }

        // Create department form
        const createForm = document.getElementById('create-department-form');
        if (createForm) {
            createForm.addEventListener('submit', (e) => this.handleCreateDepartment(e));
        }

        // Assign manager form
        const assignForm = document.getElementById('assign-manager-form');
        if (assignForm) {
            assignForm.addEventListener('submit', (e) => this.handleAssignManager(e));
        }

        // Edit department form
        const editForm = document.getElementById('edit-department-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleEditDepartment(e));
        }

        // Auto-uppercase department code
        const deptCodeInput = document.getElementById('dept-code');
        if (deptCodeInput) {
            deptCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }

        // Setup modal close functionality
        Utils.setupModalClose('create-department-modal');
        Utils.setupModalClose('assign-manager-modal');
        Utils.setupModalClose('edit-department-modal');
        Utils.setupModalClose('department-details-modal');
        Utils.setupModalClose('department-employees-modal');
    }

    populateManagerDropdowns() {
        const deptManagerSelect = document.getElementById('dept-manager');
        const assignManagerSelect = document.getElementById('assign-manager-select');
        
        const managerOptions = this.availableManagers.map(manager => 
            `<option value="${manager.id}">${manager.firstName} ${manager.lastName} (${manager.department || 'No Dept'})</option>`
        ).join('');

        if (deptManagerSelect) {
            deptManagerSelect.innerHTML = '<option value="">Select manager (optional)</option>' + managerOptions;
        }
        
        if (assignManagerSelect) {
            assignManagerSelect.innerHTML = '<option value="">Select manager...</option>' + managerOptions;
        }
    }

    showCreateDepartmentModal() {
        console.log('showCreateDepartmentModal called');
        
        // Check if modal element exists
        const modal = document.getElementById('create-department-modal');
        console.log('Modal element found:', !!modal);
        
        this.populateManagerDropdowns();
        Utils.showModal('create-department-modal');
        
        console.log('Modal should now be visible');
    }

    showAssignManagerModal(departmentId) {
        document.getElementById('assign-dept-id').value = departmentId;
        this.populateManagerDropdowns();
        Utils.showModal('assign-manager-modal');
    }

    async handleCreateDepartment(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        try {
            const originalText = Utils.showLoading(submitBtn);
            
            // Check for duplicate department code
            const existingDept = this.departments.find(d => d.code === formData.get('code').toUpperCase());
            if (existingDept) {
                throw new Error('Department code already exists');
            }
            
            const departmentData = {
                code: formData.get('code').toUpperCase(),
                name: formData.get('name'),
                description: formData.get('description') || '',
                managerId: formData.get('managerId') || null,
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('departments').add(departmentData);
            
            Utils.showToast('Department created successfully', 'success');
            Utils.hideModal('create-department-modal');
            event.target.reset();
            
            await this.loadData();
            this.renderStats();
            this.renderDepartmentsList();
            
            Utils.hideLoading(submitBtn, originalText);
        } catch (error) {
            console.error('Error creating department:', error);
            Utils.showToast(error.message || 'Failed to create department', 'error');
            Utils.hideLoading(submitBtn, 'Create Department');
        }
    }

    async handleAssignManager(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const departmentId = formData.get('departmentId');
        const managerId = formData.get('managerId');
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        try {
            const originalText = Utils.showLoading(submitBtn);
            
            await db.collection('departments').doc(departmentId).update({
                managerId: managerId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            Utils.showToast('Manager assigned successfully', 'success');
            Utils.hideModal('assign-manager-modal');
            
            await this.loadData();
            this.renderStats();
            this.renderDepartmentsList();
            
            Utils.hideLoading(submitBtn, originalText);
        } catch (error) {
            console.error('Error assigning manager:', error);
            Utils.showToast('Failed to assign manager', 'error');
            Utils.hideLoading(submitBtn, 'Assign Manager');
        }
    }

    async editDepartment(departmentId) {
        const department = this.departments.find(d => d.id === departmentId);
        if (!department) return;

        // Create edit modal if it doesn't exist
        let editModal = document.getElementById('edit-department-modal');
        if (!editModal) {
            editModal = document.createElement('div');
            editModal.id = 'edit-department-modal';
            editModal.className = 'modal';
            editModal.style.display = 'none';
            document.body.appendChild(editModal);
        }

        editModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit Department</h3>
                    <span class="close" onclick="Utils.hideModal('edit-department-modal')">&times;</span>
                </div>
                
                <form id="edit-department-form">
                    <input type="hidden" name="departmentId" value="${department.id}">
                    
                    <div class="form-group">
                        <label for="edit-dept-code" class="form-label">Department Code</label>
                        <input type="text" id="edit-dept-code" name="code" class="form-control" 
                               value="${department.code}" required maxlength="6" style="text-transform: uppercase;">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-dept-name" class="form-label">Department Name</label>
                        <input type="text" id="edit-dept-name" name="name" class="form-control" 
                               value="${department.name}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-dept-description" class="form-label">Description</label>
                        <textarea id="edit-dept-description" name="description" class="form-control" rows="3">${department.description || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-dept-status" class="form-label">Status</label>
                        <select id="edit-dept-status" name="isActive" class="form-control" required>
                            <option value="true" ${department.isActive !== false ? 'selected' : ''}>Active</option>
                            <option value="false" ${department.isActive === false ? 'selected' : ''}>Inactive</option>
                        </select>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" onclick="Utils.hideModal('edit-department-modal')">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Update Department
                        </button>
                    </div>
                </form>
            </div>
        `;

        Utils.showModal('edit-department-modal');
    }

    async handleEditDepartment(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const departmentId = formData.get('departmentId');
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        try {
            const originalText = Utils.showLoading(submitBtn);
            
            const updateData = {
                code: formData.get('code').toUpperCase(),
                name: formData.get('name'),
                description: formData.get('description'),
                isActive: formData.get('isActive') === 'true',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('departments').doc(departmentId).update(updateData);
            
            Utils.showToast('Department updated successfully', 'success');
            Utils.hideModal('edit-department-modal');
            
            await this.loadData();
            this.renderStats();
            this.renderDepartmentsList();
            
            Utils.hideLoading(submitBtn, originalText);
        } catch (error) {
            console.error('Error updating department:', error);
            Utils.showToast('Failed to update department', 'error');
            Utils.hideLoading(submitBtn, 'Update Department');
        }
    }

    async deleteDepartment(departmentId) {
        const department = this.departments.find(d => d.id === departmentId);
        if (!department) return;

        const deptEmployees = this.employees.filter(e => e.department === department.id || e.department === department.code);
        
        if (deptEmployees.length > 0) {
            Utils.showToast('Cannot delete department with employees. Please reassign employees first.', 'error');
            return;
        }

        if (!confirm(`Are you sure you want to delete the department "${department.name}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await db.collection('departments').doc(departmentId).delete();
            Utils.showToast('Department deleted successfully', 'success');
            
            await this.loadData();
            this.renderStats();
            this.renderDepartmentsList();
        } catch (error) {
            console.error('Error deleting department:', error);
            Utils.showToast('Failed to delete department', 'error');
        }
    }

    changeManager(departmentId) {
        this.showAssignManagerModal(departmentId);
    }

    viewDepartmentDetails(departmentId) {
        const department = this.departments.find(d => d.id === departmentId);
        if (!department) return;

        const manager = this.availableManagers.find(m => m.id === department.managerId);
        const deptEmployees = this.employees.filter(e => e.department === department.id || e.department === department.code);

        alert(`Department Details:
        
Name: ${department.name}
Code: ${department.code}
Description: ${department.description || 'No description'}
Manager: ${manager ? `${manager.firstName} ${manager.lastName}` : 'No manager assigned'}
Employees: ${deptEmployees.length}
Status: ${department.isActive !== false ? 'Active' : 'Inactive'}
Created: ${Utils.formatDate(department.createdAt) || 'Unknown'}`);
    }

    viewEmployees(departmentId) {
        const department = this.departments.find(d => d.id === departmentId);
        if (!department) return;

        const deptEmployees = this.employees.filter(e => e.department === department.id || e.department === department.code);
        
        if (deptEmployees.length === 0) {
            Utils.showToast('No employees found in this department', 'info');
            return;
        }

        const employeeList = deptEmployees.map(emp => 
            `• ${emp.firstName} ${emp.lastName} (${emp.position || 'No position'}) - ${emp.role || 'employee'}`
        ).join('\n');

        alert(`Employees in ${department.name}:

${employeeList}`);
    }

    exportDepartments() {
        if (this.departments.length === 0) {
            Utils.showToast('No departments to export', 'info');
            return;
        }

        const exportData = this.departments.map(dept => {
            const manager = this.availableManagers.find(m => m.id === dept.managerId);
            const employeeCount = this.employees.filter(e => e.department === dept.id || e.department === dept.code).length;
            
            return {
                'Department Code': dept.code,
                'Department Name': dept.name,
                'Description': dept.description || '',
                'Manager': manager ? `${manager.firstName} ${manager.lastName}` : 'No Manager',
                'Employee Count': employeeCount,
                'Status': dept.isActive !== false ? 'Active' : 'Inactive',
                'Created Date': Utils.formatDate(dept.createdAt) || 'Unknown'
            };
        });

        Utils.exportToCSV(exportData, 'departments_export.csv');
        Utils.showToast('Departments exported successfully', 'success');
    }

    async loadDepartmentEmployeeCount(departmentId) {
        const deptEmployees = this.employees.filter(e => e.department === departmentId);
        const countElement = document.getElementById(`dept-${departmentId}-employees`);
        if (countElement) {
            countElement.textContent = deptEmployees.length;
        }
    }
}

// Global controller instance
window.departmentsController = new DepartmentsController();