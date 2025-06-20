// HR Departments Controller
class DepartmentsController {
    constructor() {
        this.departments = [];
        this.availableManagers = [];
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

    renderDepartmentsPage() {
        const mainContent = document.getElementById('main-content');
        
        // Load the departments page HTML
        fetch('pages/departments.html')
            .then(response => response.text())
            .then(html => {
                mainContent.innerHTML = html;
                this.renderDepartmentsList();
                this.setupEventListeners();
                this.populateManagerDropdowns();
            })
            .catch(error => {
                console.error('Error loading departments page:', error);
                mainContent.innerHTML = '<div class="error-message">Error loading departments page</div>';
            });
    }

    renderDepartmentsList() {
        const container = document.getElementById('departments-container');
        if (!container) return;

        if (this.departments.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-building"></i>
                    <h3>No Departments</h3>
                    <p>Create your first department to get started.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="departments-grid">
                ${this.departments.map(dept => this.renderDepartmentCard(dept)).join('')}
            </div>
        `;
    }

    renderDepartmentCard(department) {
        const manager = this.availableManagers.find(m => m.id === department.managerId);
        
        return `
            <div class="department-card">
                <div class="dept-header">
                    <div class="dept-code">${department.code}</div>
                    <div class="dept-status">
                        <span class="status-badge ${department.isActive ? 'active' : 'inactive'}">
                            ${department.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                
                <div class="dept-info">
                    <h3>${department.name}</h3>
                    ${department.description ? `<p class="dept-description">${department.description}</p>` : ''}
                </div>
                
                <div class="dept-manager">
                    <label>Manager:</label>
                    ${manager ? 
                        `<span class="manager-name">${manager.firstName} ${manager.lastName}</span>` :
                        `<span class="no-manager">No manager assigned</span>`
                    }
                </div>
                
                <div class="dept-stats">
                    <div class="stat-item">
                        <span class="stat-label">Employees:</span>
                        <span class="stat-value" id="dept-${department.id}-employees">-</span>
                    </div>
                </div>
                
                <div class="dept-actions">
                    ${!manager ? 
                        `<button class="btn btn-primary btn-sm" onclick="hrApp.controllers.departments.showAssignManagerModal('${department.id}')">
                            <i class="fas fa-user-plus"></i> Assign Manager
                        </button>` : 
                        `<button class="btn btn-secondary btn-sm" onclick="hrApp.controllers.departments.changeManager('${department.id}')">
                            <i class="fas fa-user-edit"></i> Change Manager
                        </button>`
                    }
                    <button class="btn btn-outline btn-sm" onclick="hrApp.controllers.departments.viewDepartmentDetails('${department.id}')">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `;
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