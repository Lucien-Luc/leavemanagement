// HR Leave Types Controller
class LeaveTypesController {
    constructor() {
        this.leaveTypes = [];
    }

    async init() {
        try {
            await this.loadLeaveTypes();
            this.renderLeaveTypesPage();
            this.setupEventListeners();
        } catch (error) {
            console.error('Leave types controller initialization failed:', error);
            Utils.showToast('Failed to load leave types', 'error');
        }
    }

    async loadLeaveTypes() {
        try {
            // For now, we'll use predefined leave types
            // In a full implementation, these would be stored in Firestore
            this.leaveTypes = [
                {
                    id: 'vacation',
                    name: 'Vacation Leave',
                    description: 'Annual vacation time for rest and relaxation',
                    defaultDays: 20,
                    maxDaysPerRequest: 15,
                    requiresApproval: true,
                    advanceNotice: 7,
                    isActive: true,
                    color: '#3498db'
                },
                {
                    id: 'sick',
                    name: 'Sick Leave',
                    description: 'Time off for illness or medical appointments',
                    defaultDays: 10,
                    maxDaysPerRequest: 10,
                    requiresApproval: false,
                    advanceNotice: 0,
                    isActive: true,
                    color: '#e74c3c'
                },
                {
                    id: 'personal',
                    name: 'Personal Leave',
                    description: 'Personal time off for various personal matters',
                    defaultDays: 5,
                    maxDaysPerRequest: 3,
                    requiresApproval: true,
                    advanceNotice: 3,
                    isActive: true,
                    color: '#f39c12'
                },
                {
                    id: 'maternity',
                    name: 'Maternity Leave',
                    description: 'Leave for new mothers',
                    defaultDays: 90,
                    maxDaysPerRequest: 90,
                    requiresApproval: true,
                    advanceNotice: 30,
                    isActive: true,
                    color: '#e91e63'
                },
                {
                    id: 'paternity',
                    name: 'Paternity Leave',
                    description: 'Leave for new fathers',
                    defaultDays: 15,
                    maxDaysPerRequest: 15,
                    requiresApproval: true,
                    advanceNotice: 30,
                    isActive: true,
                    color: '#9c27b0'
                },
                {
                    id: 'bereavement',
                    name: 'Bereavement Leave',
                    description: 'Time off for family loss and funeral arrangements',
                    defaultDays: 3,
                    maxDaysPerRequest: 5,
                    requiresApproval: false,
                    advanceNotice: 0,
                    isActive: true,
                    color: '#607d8b'
                }
            ];
        } catch (error) {
            console.error('Error loading leave types:', error);
            this.leaveTypes = [];
        }
    }

    renderLeaveTypesPage() {
        const content = `
            <div class="page-header">
                <h1 class="page-title">Leave Types Management</h1>
                <p class="page-subtitle">Configure and manage different types of leave</p>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex gap-2">
                    <span class="text-muted">Total Leave Types: ${this.leaveTypes.length}</span>
                </div>
                <button class="btn btn-primary" onclick="leaveTypesController.showAddLeaveTypeModal()">
                    <i class="fas fa-plus"></i> Add Leave Type
                </button>
            </div>

            <div class="stats-grid mb-3">
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon primary">
                            <i class="fas fa-list"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.leaveTypes.length}</div>
                    <div class="stat-label">Total Leave Types</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon success">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.leaveTypes.filter(lt => lt.isActive).length}</div>
                    <div class="stat-label">Active Types</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon warning">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.leaveTypes.filter(lt => lt.requiresApproval).length}</div>
                    <div class="stat-label">Require Approval</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon info">
                            <i class="fas fa-calendar-plus"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.leaveTypes.reduce((total, lt) => total + lt.defaultDays, 0)}</div>
                    <div class="stat-label">Total Default Days</div>
                </div>
            </div>

            <div class="row">
                ${this.leaveTypes.map(leaveType => this.renderLeaveTypeCard(leaveType)).join('')}
            </div>

            ${this.renderAddLeaveTypeModal()}
            ${this.renderEditLeaveTypeModal()}
        `;

        document.getElementById('main-content').innerHTML = content;
    }

    renderLeaveTypeCard(leaveType) {
        return `
            <div class="col-md-6 col-lg-4 mb-3">
                <div class="card">
                    <div class="card-header" style="background: ${leaveType.color}; color: white;">
                        <h4 class="card-title mb-0">
                            <i class="fas fa-${this.getLeaveTypeIcon(leaveType.id)}"></i>
                            ${leaveType.name}
                        </h4>
                    </div>
                    <div class="card-body">
                        <p class="text-muted mb-3">${leaveType.description}</p>
                        
                        <div class="mb-2">
                            <strong>Default Days:</strong> ${leaveType.defaultDays}
                        </div>
                        <div class="mb-2">
                            <strong>Max Days/Request:</strong> ${leaveType.maxDaysPerRequest}
                        </div>
                        <div class="mb-2">
                            <strong>Advance Notice:</strong> ${leaveType.advanceNotice} days
                        </div>
                        <div class="mb-3">
                            <strong>Requires Approval:</strong> 
                            ${leaveType.requiresApproval ? 
                                '<span class="badge badge-warning">Yes</span>' : 
                                '<span class="badge badge-success">No</span>'
                            }
                        </div>
                        <div class="mb-3">
                            <strong>Status:</strong> 
                            ${Utils.getStatusBadge(leaveType.isActive ? 'active' : 'inactive')}
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline btn-sm" onclick="leaveTypesController.editLeaveType('${leaveType.id}')">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-${leaveType.isActive ? 'danger' : 'success'} btn-sm" 
                                    onclick="leaveTypesController.toggleLeaveTypeStatus('${leaveType.id}')">
                                <i class="fas fa-${leaveType.isActive ? 'times' : 'check'}"></i> 
                                ${leaveType.isActive ? 'Disable' : 'Enable'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAddLeaveTypeModal() {
        return `
            <div id="add-leave-type-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 class="modal-title">Add New Leave Type</h4>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="add-leave-type-form">
                            <div class="form-group">
                                <label class="form-label">Leave Type ID</label>
                                <input type="text" class="form-control" name="id" placeholder="e.g., emergency" required>
                                <small class="text-muted">Unique identifier (lowercase, no spaces)</small>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Name</label>
                                <input type="text" class="form-control" name="name" placeholder="e.g., Emergency Leave" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Description</label>
                                <textarea class="form-control" name="description" rows="3" placeholder="Brief description of this leave type"></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Default Days per Year</label>
                                <input type="number" class="form-control" name="defaultDays" min="0" max="365" value="5" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Maximum Days per Request</label>
                                <input type="number" class="form-control" name="maxDaysPerRequest" min="1" max="365" value="5" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Advance Notice Required (days)</label>
                                <input type="number" class="form-control" name="advanceNotice" min="0" max="90" value="0" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Color</label>
                                <input type="color" class="form-control" name="color" value="#3498db" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" name="requiresApproval" checked>
                                    Requires Approval
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="Utils.hideModal('add-leave-type-modal')">Cancel</button>
                        <button type="submit" form="add-leave-type-form" class="btn btn-primary">Add Leave Type</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderEditLeaveTypeModal() {
        return `
            <div id="edit-leave-type-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h4 class="modal-title">Edit Leave Type</h4>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="edit-leave-type-form">
                            <input type="hidden" name="originalId" id="edit-leave-type-id">
                            <!-- Form fields will be populated dynamically -->
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="Utils.hideModal('edit-leave-type-modal')">Cancel</button>
                        <button type="submit" form="edit-leave-type-form" class="btn btn-primary">Update Leave Type</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Add leave type form
        const addForm = document.getElementById('add-leave-type-form');
        if (addForm) {
            addForm.addEventListener('submit', (e) => this.handleAddLeaveType(e));
        }

        // Edit leave type form
        const editForm = document.getElementById('edit-leave-type-form');
        if (editForm) {
            editForm.addEventListener('submit', (e) => this.handleEditLeaveType(e));
        }

        // Setup modal close functionality
        Utils.setupModalClose('add-leave-type-modal');
        Utils.setupModalClose('edit-leave-type-modal');
    }

    getLeaveTypeIcon(typeId) {
        const icons = {
            vacation: 'umbrella-beach',
            sick: 'user-nurse',
            personal: 'user',
            maternity: 'baby',
            paternity: 'male',
            bereavement: 'heart',
            emergency: 'exclamation-triangle'
        };
        return icons[typeId] || 'calendar';
    }

    showAddLeaveTypeModal() {
        Utils.showModal('add-leave-type-modal');
    }

    handleAddLeaveType(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const newLeaveType = {
            id: formData.get('id').toLowerCase().replace(/\s+/g, '-'),
            name: formData.get('name'),
            description: formData.get('description'),
            defaultDays: parseInt(formData.get('defaultDays')),
            maxDaysPerRequest: parseInt(formData.get('maxDaysPerRequest')),
            advanceNotice: parseInt(formData.get('advanceNotice')),
            requiresApproval: formData.has('requiresApproval'),
            color: formData.get('color'),
            isActive: true
        };

        // Check if ID already exists
        if (this.leaveTypes.find(lt => lt.id === newLeaveType.id)) {
            Utils.showToast('Leave type ID already exists', 'error');
            return;
        }

        this.leaveTypes.push(newLeaveType);
        Utils.showToast('Leave type added successfully', 'success');
        Utils.hideModal('add-leave-type-modal');
        e.target.reset();
        this.renderLeaveTypesPage();
    }

    editLeaveType(typeId) {
        const leaveType = this.leaveTypes.find(lt => lt.id === typeId);
        if (!leaveType) return;

        // Populate edit form
        const editForm = document.getElementById('edit-leave-type-form');
        editForm.innerHTML = `
            <input type="hidden" name="originalId" value="${leaveType.id}">
            <div class="form-group">
                <label class="form-label">Leave Type ID</label>
                <input type="text" class="form-control" name="id" value="${leaveType.id}" required>
                <small class="text-muted">Unique identifier (lowercase, no spaces)</small>
            </div>
            <div class="form-group">
                <label class="form-label">Name</label>
                <input type="text" class="form-control" name="name" value="${leaveType.name}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Description</label>
                <textarea class="form-control" name="description" rows="3">${leaveType.description}</textarea>
            </div>
            <div class="form-group">
                <label class="form-label">Default Days per Year</label>
                <input type="number" class="form-control" name="defaultDays" min="0" max="365" value="${leaveType.defaultDays}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Maximum Days per Request</label>
                <input type="number" class="form-control" name="maxDaysPerRequest" min="1" max="365" value="${leaveType.maxDaysPerRequest}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Advance Notice Required (days)</label>
                <input type="number" class="form-control" name="advanceNotice" min="0" max="90" value="${leaveType.advanceNotice}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Color</label>
                <input type="color" class="form-control" name="color" value="${leaveType.color}" required>
            </div>
            <div class="form-group">
                <label class="form-label">
                    <input type="checkbox" name="requiresApproval" ${leaveType.requiresApproval ? 'checked' : ''}>
                    Requires Approval
                </label>
            </div>
        `;

        Utils.showModal('edit-leave-type-modal');
    }

    handleEditLeaveType(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const originalId = formData.get('originalId');
        const newId = formData.get('id').toLowerCase().replace(/\s+/g, '-');
        
        // Check if new ID already exists (and it's not the current one)
        if (newId !== originalId && this.leaveTypes.find(lt => lt.id === newId)) {
            Utils.showToast('Leave type ID already exists', 'error');
            return;
        }

        const updatedLeaveType = {
            id: newId,
            name: formData.get('name'),
            description: formData.get('description'),
            defaultDays: parseInt(formData.get('defaultDays')),
            maxDaysPerRequest: parseInt(formData.get('maxDaysPerRequest')),
            advanceNotice: parseInt(formData.get('advanceNotice')),
            requiresApproval: formData.has('requiresApproval'),
            color: formData.get('color'),
            isActive: true
        };

        // Update the leave type
        const index = this.leaveTypes.findIndex(lt => lt.id === originalId);
        if (index !== -1) {
            this.leaveTypes[index] = updatedLeaveType;
            Utils.showToast('Leave type updated successfully', 'success');
            Utils.hideModal('edit-leave-type-modal');
            this.renderLeaveTypesPage();
        }
    }

    toggleLeaveTypeStatus(typeId) {
        const leaveType = this.leaveTypes.find(lt => lt.id === typeId);
        if (!leaveType) return;

        leaveType.isActive = !leaveType.isActive;
        Utils.showToast(`Leave type ${leaveType.isActive ? 'enabled' : 'disabled'} successfully`, 'success');
        this.renderLeaveTypesPage();
    }

    exportLeaveTypesConfig() {
        const exportData = this.leaveTypes.map(lt => ({
            'ID': lt.id,
            'Name': lt.name,
            'Description': lt.description,
            'Default Days': lt.defaultDays,
            'Max Days Per Request': lt.maxDaysPerRequest,
            'Advance Notice (days)': lt.advanceNotice,
            'Requires Approval': lt.requiresApproval ? 'Yes' : 'No',
            'Color': lt.color,
            'Status': lt.isActive ? 'Active' : 'Inactive'
        }));

        const filename = `leave-types-config-${Utils.formatDate(new Date())}.csv`;
        Utils.exportToCSV(exportData, filename);
    }
}

// Global controller instance
window.leaveTypesController = new LeaveTypesController();