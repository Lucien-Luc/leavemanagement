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
            // Load users who could be managers (not assigned to departments or already managers)
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

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(dept => 
                dept.name.toLowerCase().includes(term) ||
                dept.code.toLowerCase().includes(term) ||
                (dept.description && dept.description.toLowerCase().includes(term))
            );
        }

        // Apply status filter
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
        
        // Load the departments page HTML
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
                            <span>Created ${Utils.formatDate(department.createdAt)}</span>
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

        // Setup modal close functionality
        Utils.setupModalClose('create-department-modal');
        Utils.setupModalClose('assign-manager-modal');
        Utils.setupModalClose('edit-department-modal');
        Utils.setupModalClose('department-details-modal');
        Utils.setupModalClose('department-employees-modal');
    }

    setupEventListeners() {
        // Create department form
        const createForm = document.getElementById('create-department-form');
        if (createForm) {
            createForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleCreateDepartment(e);
            });
        }

        // Assign manager form
        const assignForm = document.getElementById('assign-manager-form');
        if (assignForm) {
            assignForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.handleAssignManager(e);
            });
        }

        // Auto-uppercase department code
        const deptCodeInput = document.getElementById('dept-code');
        if (deptCodeInput) {
            deptCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }
    }

    populateManagerDropdowns() {
        const dropdowns = ['dept-manager', 'assign-manager-select'];
        
        dropdowns.forEach(dropdownId => {
            const dropdown = document.getElementById(dropdownId);
            if (dropdown) {
                const currentOptions = dropdown.innerHTML;
                dropdown.innerHTML = currentOptions.split('</option>')[0] + '</option>';
                
                this.availableManagers.forEach(manager => {
                    const option = document.createElement('option');
                    option.value = manager.id;
                    option.textContent = `${manager.firstName} ${manager.lastName} (${manager.employeeId})`;
                    dropdown.appendChild(option);
                });
            }
        });
    }

    showCreateDepartmentModal() {
        Utils.showModal('create-department-modal');
    }

    showAssignManagerModal(departmentId) {
        document.getElementById('assign-dept-id').value = departmentId;
        Utils.showModal('assign-manager-modal');
    }

    async handleCreateDepartment(event) {
        const formData = new FormData(event.target);
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        try {
            const originalText = Utils.showLoading(submitBtn);
            
            const departmentData = {
                code: formData.get('code').toUpperCase(),
                name: formData.get('name'),
                description: formData.get('description'),
                managerId: formData.get('managerId') || null
            };

            // Validate department code
            if (departmentData.code.length > 6) {
                throw new Error('Department code must be 6 characters or less');
            }

            if (this.departments.find(d => d.code === departmentData.code)) {
                throw new Error('Department code already exists');
            }

            await departmentsController.createDepartment(departmentData);
            
            Utils.showToast('Department created successfully', 'success');
            Utils.hideModal('create-department-modal');
            
            // Reset form
            event.target.reset();
            
            // Reload data
            await this.loadData();
            this.renderDepartmentsList();
            
            Utils.hideLoading(submitBtn, originalText);
        } catch (error) {
            console.error('Error creating department:', error);
            Utils.showToast(error.message || 'Error creating department', 'error');
            Utils.hideLoading(submitBtn, 'Create Department');
        }
    }

    async handleAssignManager(event) {
        const formData = new FormData(event.target);
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        try {
            const originalText = Utils.showLoading(submitBtn);
            
            const departmentId = formData.get('departmentId');
            const managerId = formData.get('managerId');
            
            if (!managerId) {
                throw new Error('Please select a manager');
            }

            await departmentsController.assignManager(departmentId, managerId);
            
            Utils.showToast('Manager assigned successfully', 'success');
            Utils.hideModal('assign-manager-modal');
            
            // Reload data
            await this.loadData();
            this.renderDepartmentsList();
            
            Utils.hideLoading(submitBtn, originalText);
        } catch (error) {
            console.error('Error assigning manager:', error);
            Utils.showToast(error.message || 'Error assigning manager', 'error');
            Utils.hideLoading(submitBtn, 'Assign Manager');
        }
    }

    changeManager(departmentId) {
        this.showAssignManagerModal(departmentId);
    }

    viewDepartmentDetails(departmentId) {
        const department = this.departments.find(d => d.id === departmentId);
        if (!department) return;

        // Navigate to department details or show modal
        console.log('Viewing department details:', department);
        Utils.showToast(`Viewing details for ${department.name}`, 'info');
    }

    async loadDepartmentEmployeeCount(departmentId) {
        try {
            const employeesSnapshot = await db.collection('users')
                .where('department', '==', departmentId)
                .where('isActive', '==', true)
                .get();

            const count = employeesSnapshot.size;
            const countElement = document.getElementById(`dept-${departmentId}-employees`);
            if (countElement) {
                countElement.textContent = count;
            }
        } catch (error) {
            console.error('Error loading employee count:', error);
        }
    }
}