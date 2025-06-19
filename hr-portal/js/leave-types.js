// HR Leave Types Management Controller
class LeaveTypesController {
    constructor() {
        this.leaveTypes = [];
        this.defaultLeaveTypes = [
            { name: 'vacation', label: 'Vacation', defaultDays: 20, color: '#3498db', description: 'Annual vacation leave' },
            { name: 'sick', label: 'Sick Leave', defaultDays: 10, color: '#e74c3c', description: 'Medical leave for illness' },
            { name: 'personal', label: 'Personal Leave', defaultDays: 5, color: '#f39c12', description: 'Personal time off' },
            { name: 'maternity', label: 'Maternity Leave', defaultDays: 90, color: '#e91e63', description: 'Maternity leave for new mothers' },
            { name: 'paternity', label: 'Paternity Leave', defaultDays: 15, color: '#9c27b0', description: 'Paternity leave for new fathers' }
        ];
    }

    async init() {
        try {
            await this.loadLeaveTypes();
            this.renderLeaveTypes();
            this.setupEventListeners();
        } catch (error) {
            console.error('Leave types initialization failed:', error);
            Utils.showToast('Failed to load leave types', 'error');
        }
    }

    async loadLeaveTypes() {
        try {
            const leaveTypesSnapshot = await db.collection('leave_types').get();
            
            if (leaveTypesSnapshot.empty) {
                // Initialize with default leave types
                await this.initializeDefaultLeaveTypes();
            } else {
                this.leaveTypes = leaveTypesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            }
        } catch (error) {
            console.error('Error loading leave types:', error);
            this.leaveTypes = [...this.defaultLeaveTypes];
        }
    }

    async initializeDefaultLeaveTypes() {
        try {
            const batch = db.batch();
            
            this.defaultLeaveTypes.forEach(leaveType => {
                const docRef = db.collection('leave_types').doc();
                batch.set(docRef, {
                    ...leaveType,
                    isActive: true,
                    createdAt: firebase.firestore.Timestamp.now(),
                    updatedAt: firebase.firestore.Timestamp.now()
                });
            });
            
            await batch.commit();
            await this.loadLeaveTypes();
            Utils.showToast('Default leave types initialized', 'success');
        } catch (error) {
            console.error('Error initializing default leave types:', error);
            this.leaveTypes = [...this.defaultLeaveTypes];
        }
    }

    renderLeaveTypes() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="page-header">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h1 class="page-title">Leave Types Management</h1>
                        <p class="page-subtitle">Configure leave types and allocations</p>
                    </div>
                    <button class="btn btn-primary" onclick="leaveTypesController.showAddLeaveTypeModal()">
                        <i class="fas fa-plus"></i>
                        Add Leave Type
                    </button>
                </div>
            </div>

            <div class="stats-grid">
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
                    <div class="stat-value">${this.leaveTypes.filter(lt => lt.isActive !== false).length}</div>
                    <div class="stat-label">Active Types</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon info">
                            <i class="fas fa-calendar-days"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.leaveTypes.reduce((sum, lt) => sum + (lt.defaultDays || 0), 0)}</div>
                    <div class="stat-label">Total Default Days</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon warning">
                            <i class="fas fa-cog"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.leaveTypes.filter(lt => lt.requiresApproval !== false).length}</div>
                    <div class="stat-label">Require Approval</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Leave Types Configuration</h3>
                </div>
                <div class="card-body">
                    <div id="leave-types-container">
                        ${this.renderLeaveTypesCards()}
                    </div>
                </div>
            </div>

            <!-- Add/Edit Leave Type Modal -->
            <div id="leave-type-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title" id="modal-title">Add Leave Type</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="leave-type-form">
                            <input type="hidden" id="leave-type-id">
                            <div class="form-group">
                                <label class="form-label">Name/Code</label>
                                <input type="text" id="leave-name" name="name" class="form-control" required placeholder="e.g., vacation, sick">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Display Label</label>
                                <input type="text" id="leave-label" name="label" class="form-control" required placeholder="e.g., Vacation, Sick Leave">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Default Annual Allocation (Days)</label>
                                <input type="number" id="leave-days" name="defaultDays" class="form-control" required min="0" max="365">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Color</label>
                                <input type="color" id="leave-color" name="color" class="form-control" value="#3498db">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Description</label>
                                <textarea id="leave-description" name="description" class="form-control" rows="3" placeholder="Brief description of this leave type"></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="requires-approval" name="requiresApproval" checked>
                                    Requires Approval
                                </label>
                            </div>
                            <div class="form-group">
                                <label class="form-label">
                                    <input type="checkbox" id="is-active" name="isActive" checked>
                                    Active
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="Utils.hideModal('leave-type-modal')">Cancel</button>
                        <button type="submit" form="leave-type-form" class="btn btn-primary" id="save-btn">Save Leave Type</button>
                    </div>
                </div>
            </div>

            <!-- Bulk Update Modal -->
            <div id="bulk-update-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Bulk Update Employee Balances</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>This will update all active employees' leave balances with the current default allocations.</p>
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            <strong>Warning:</strong> This action will overwrite existing leave balances for all employees.
                        </div>
                        <div id="bulk-update-preview">
                            ${this.renderBulkUpdatePreview()}
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="Utils.hideModal('bulk-update-modal')">Cancel</button>
                        <button type="button" class="btn btn-warning" onclick="leaveTypesController.performBulkUpdate()">Update All Employees</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderLeaveTypesCards() {
        return this.leaveTypes.map(leaveType => `
            <div class="card mb-3" style="border-left: 4px solid ${leaveType.color || '#3498db'};">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="flex-grow-1">
                            <h5 class="mb-2">
                                ${leaveType.label || leaveType.name}
                                ${leaveType.isActive !== false ? 
                                    '<span class="badge badge-active ml-2">Active</span>' : 
                                    '<span class="badge badge-rejected ml-2">Inactive</span>'
                                }
                            </h5>
                            <p class="text-muted mb-2">${leaveType.description || 'No description'}</p>
                            <div class="row">
                                <div class="col-md-4">
                                    <small class="text-muted">Code:</small><br>
                                    <strong>${leaveType.name}</strong>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">Default Allocation:</small><br>
                                    <strong>${leaveType.defaultDays || 0} days</strong>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">Requires Approval:</small><br>
                                    <strong>${leaveType.requiresApproval !== false ? 'Yes' : 'No'}</strong>
                                </div>
                            </div>
                        </div>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-primary" onclick="leaveTypesController.editLeaveType('${leaveType.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-${leaveType.isActive !== false ? 'warning' : 'success'}" 
                                    onclick="leaveTypesController.toggleLeaveType('${leaveType.id}', ${leaveType.isActive !== false})" 
                                    title="${leaveType.isActive !== false ? 'Deactivate' : 'Activate'}">
                                <i class="fas fa-${leaveType.isActive !== false ? 'pause' : 'play'}"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="leaveTypesController.deleteLeaveType('${leaveType.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderBulkUpdatePreview() {
        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Leave Type</th>
                            <th>New Allocation</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.leaveTypes.filter(lt => lt.isActive !== false).map(leaveType => `
                            <tr>
                                <td>${leaveType.label}</td>
                                <td>${leaveType.defaultDays} days</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    setupEventListeners() {
        // Leave type form
        const leaveTypeForm = document.getElementById('leave-type-form');
        if (leaveTypeForm) {
            leaveTypeForm.addEventListener('submit', (e) => this.handleSaveLeaveType(e));
        }

        // Setup modal close handlers
        Utils.setupModalClose('leave-type-modal');
        Utils.setupModalClose('bulk-update-modal');
    }

    showAddLeaveTypeModal() {
        document.getElementById('modal-title').textContent = 'Add Leave Type';
        document.getElementById('leave-type-id').value = '';
        document.getElementById('leave-type-form').reset();
        document.getElementById('leave-color').value = '#3498db';
        document.getElementById('requires-approval').checked = true;
        document.getElementById('is-active').checked = true;
        document.getElementById('save-btn').textContent = 'Add Leave Type';
        Utils.showModal('leave-type-modal');
    }

    editLeaveType(leaveTypeId) {
        const leaveType = this.leaveTypes.find(lt => lt.id === leaveTypeId);
        if (!leaveType) return;

        document.getElementById('modal-title').textContent = 'Edit Leave Type';
        document.getElementById('leave-type-id').value = leaveType.id;
        document.getElementById('leave-name').value = leaveType.name;
        document.getElementById('leave-label').value = leaveType.label;
        document.getElementById('leave-days').value = leaveType.defaultDays;
        document.getElementById('leave-color').value = leaveType.color || '#3498db';
        document.getElementById('leave-description').value = leaveType.description || '';
        document.getElementById('requires-approval').checked = leaveType.requiresApproval !== false;
        document.getElementById('is-active').checked = leaveType.isActive !== false;
        document.getElementById('save-btn').textContent = 'Update Leave Type';

        Utils.showModal('leave-type-modal');
    }

    async handleSaveLeaveType(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        try {
            const originalText = Utils.showLoading(submitBtn);
            
            const leaveTypeId = document.getElementById('leave-type-id').value;
            const leaveTypeData = {
                name: formData.get('name').toLowerCase(),
                label: formData.get('label'),
                defaultDays: parseInt(formData.get('defaultDays')),
                color: formData.get('color'),
                description: formData.get('description'),
                requiresApproval: document.getElementById('requires-approval').checked,
                isActive: document.getElementById('is-active').checked,
                updatedAt: firebase.firestore.Timestamp.now()
            };

            if (leaveTypeId) {
                // Update existing leave type
                await db.collection('leave_types').doc(leaveTypeId).update(leaveTypeData);
                Utils.showToast('Leave type updated successfully', 'success');
            } else {
                // Add new leave type
                leaveTypeData.createdAt = firebase.firestore.Timestamp.now();
                await db.collection('leave_types').add(leaveTypeData);
                Utils.showToast('Leave type added successfully', 'success');
            }

            Utils.hideModal('leave-type-modal');
            await this.loadLeaveTypes();
            document.getElementById('leave-types-container').innerHTML = this.renderLeaveTypesCards();

        } catch (error) {
            console.error('Error saving leave type:', error);
            Utils.showToast('Failed to save leave type', 'error');
        } finally {
            Utils.hideLoading(submitBtn, document.getElementById('save-btn').textContent);
        }
    }

    async toggleLeaveType(leaveTypeId, currentStatus) {
        const action = currentStatus ? 'deactivate' : 'activate';
        if (!confirm(`Are you sure you want to ${action} this leave type?`)) return;

        try {
            await db.collection('leave_types').doc(leaveTypeId).update({
                isActive: !currentStatus,
                updatedAt: firebase.firestore.Timestamp.now()
            });

            Utils.showToast(`Leave type ${action}d successfully`, 'success');
            await this.loadLeaveTypes();
            document.getElementById('leave-types-container').innerHTML = this.renderLeaveTypesCards();

        } catch (error) {
            console.error('Error updating leave type status:', error);
            Utils.showToast('Failed to update leave type status', 'error');
        }
    }

    async deleteLeaveType(leaveTypeId) {
        if (!confirm('Are you sure you want to delete this leave type? This action cannot be undone.')) return;

        try {
            await db.collection('leave_types').doc(leaveTypeId).delete();
            Utils.showToast('Leave type deleted successfully', 'success');
            await this.loadLeaveTypes();
            document.getElementById('leave-types-container').innerHTML = this.renderLeaveTypesCards();

        } catch (error) {
            console.error('Error deleting leave type:', error);
            Utils.showToast('Failed to delete leave type', 'error');
        }
    }

    showBulkUpdateModal() {
        document.getElementById('bulk-update-preview').innerHTML = this.renderBulkUpdatePreview();
        Utils.showModal('bulk-update-modal');
    }

    async performBulkUpdate() {
        try {
            Utils.showToast('Starting bulk update...', 'info');
            
            // Get all active employees
            const usersSnapshot = await db.collection('users')
                .where('isActive', '==', true)
                .get();

            const batch = db.batch();
            const leaveBalances = {};
            
            // Build leave balances object from active leave types
            this.leaveTypes.filter(lt => lt.isActive !== false).forEach(leaveType => {
                leaveBalances[leaveType.name] = leaveType.defaultDays;
            });

            // Update each employee's leave balances
            usersSnapshot.docs.forEach(doc => {
                const userRef = db.collection('users').doc(doc.id);
                batch.update(userRef, {
                    leaveBalances: leaveBalances,
                    updatedAt: firebase.firestore.Timestamp.now()
                });
            });

            await batch.commit();
            
            Utils.showToast(`Successfully updated ${usersSnapshot.size} employees`, 'success');
            Utils.hideModal('bulk-update-modal');

        } catch (error) {
            console.error('Error performing bulk update:', error);
            Utils.showToast('Failed to perform bulk update', 'error');
        }
    }
}