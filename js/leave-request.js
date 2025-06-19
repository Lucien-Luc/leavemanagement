// Leave Request Controller
class LeaveRequestController {
    constructor() {
        this.editingRequestId = null;
        this.attachments = [];
    }

    async init() {
        try {
            this.currentFilter = 'all';
            this.allRequests = [];
            
            // Check if we're editing an existing request
            this.editingRequestId = localStorage.getItem('editingLeaveRequest');
            if (this.editingRequestId) {
                await this.loadRequestForEditing();
                localStorage.removeItem('editingLeaveRequest');
            }

            this.setupEventListeners();
            this.setupFileUpload();
            await this.loadLeaveHistory();
        } catch (error) {
            console.error('Leave request initialization failed:', error);
            Utils.showToast('Failed to initialize leave request page', 'error');
        }
    }

    setupEventListeners() {
        // Leave request form
        const leaveForm = document.getElementById('leave-request-form');
        if (leaveForm) {
            leaveForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Date change handlers for calculating days
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        
        if (startDateInput && endDateInput) {
            startDateInput.addEventListener('change', () => this.calculateDays());
            endDateInput.addEventListener('change', () => this.calculateDays());
        }

        // Leave type change handler
        const leaveTypeSelect = document.getElementById('leave-type');
        if (leaveTypeSelect) {
            leaveTypeSelect.addEventListener('change', () => this.updateLeaveTypeInfo());
        }

        // Cancel editing button
        const cancelEditBtn = document.getElementById('cancel-edit-btn');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.cancelEditing());
        }
    }

    setupFileUpload() {
        const fileUploadArea = document.getElementById('file-upload-area');
        const fileInput = document.getElementById('attachment-file');

        if (fileUploadArea && fileInput) {
            // Drag and drop handlers
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadArea.classList.add('dragover');
            });

            fileUploadArea.addEventListener('dragleave', () => {
                fileUploadArea.classList.remove('dragover');
            });

            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadArea.classList.remove('dragover');
                const files = Array.from(e.dataTransfer.files);
                this.handleFileSelection(files);
            });

            // Click to upload
            fileUploadArea.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                this.handleFileSelection(files);
            });
        }
    }

    handleFileSelection(files) {
        files.forEach(file => {
            // Validate file
            if (this.validateFile(file)) {
                this.attachments.push({
                    id: Utils.generateId(),
                    file: file,
                    name: file.name,
                    size: file.size,
                    type: file.type
                });
            }
        });

        this.renderAttachments();
    }

    validateFile(file) {
        const maxSize = 5 * 1024 * 1024; // 5MB
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];

        if (file.size > maxSize) {
            Utils.showToast('File size must be less than 5MB', 'error');
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            Utils.showToast('File type not supported', 'error');
            return false;
        }

        return true;
    }

    renderAttachments() {
        const attachmentsContainer = document.getElementById('attachments-list');
        if (!attachmentsContainer) return;

        if (this.attachments.length === 0) {
            attachmentsContainer.innerHTML = '';
            return;
        }

        const attachmentItems = this.attachments.map(attachment => `
            <div class="attachment-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--light-grey); border-radius: var(--border-radius); margin-bottom: 0.5rem;">
                <div>
                    <i class="fas fa-file"></i>
                    <span>${attachment.name}</span>
                    <small style="color: var(--medium-grey);">(${Utils.formatFileSize(attachment.size)})</small>
                </div>
                <button type="button" class="btn btn-sm btn-danger" onclick="leaveRequestController.removeAttachment('${attachment.id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

        attachmentsContainer.innerHTML = attachmentItems;
    }

    removeAttachment(attachmentId) {
        this.attachments = this.attachments.filter(att => att.id !== attachmentId);
        this.renderAttachments();
    }

    calculateDays() {
        const startDate = document.getElementById('start-date')?.value;
        const endDate = document.getElementById('end-date')?.value;
        const daysDisplay = document.getElementById('calculated-days');

        if (startDate && endDate && daysDisplay) {
            const validation = Utils.validateLeaveDates(startDate, endDate);
            if (validation) {
                daysDisplay.innerHTML = `<span style="color: var(--danger);">${validation}</span>`;
                return;
            }

            const days = Utils.calculateLeaveDays(startDate, endDate);
            daysDisplay.innerHTML = `<strong>${days} business days</strong> <small>(weekends excluded)</small>`;
        }
    }

    updateLeaveTypeInfo() {
        const leaveType = document.getElementById('leave-type')?.value;
        const leaveTypeInfo = document.getElementById('leave-type-info');
        
        if (leaveTypeInfo && leaveType) {
            const user = authService.getCurrentUser();
            const balance = user?.leaveBalances?.[leaveType] || 0;
            
            leaveTypeInfo.innerHTML = `
                <div style="padding: 1rem; background: var(--light-blue); border-radius: var(--border-radius); margin-top: 0.5rem;">
                    <strong>Available Balance:</strong> ${balance} days
                </div>
            `;
        }
    }

    async loadRequestForEditing() {
        try {
            const requestDoc = await db.collection('leave_requests').doc(this.editingRequestId).get();
            if (!requestDoc.exists) {
                throw new Error('Leave request not found');
            }

            const requestData = requestDoc.data();
            
            // Check if request can be edited (only pending requests)
            if (requestData.status !== 'pending') {
                Utils.showToast('Only pending requests can be edited', 'warning');
                this.editingRequestId = null;
                return;
            }

            // Populate form with existing data
            this.populateFormForEditing(requestData);
            
            // Show editing mode UI
            const editingIndicator = document.getElementById('editing-indicator');
            if (editingIndicator) {
                editingIndicator.style.display = 'block';
            }

        } catch (error) {
            console.error('Error loading request for editing:', error);
            Utils.showToast('Failed to load leave request for editing', 'error');
            this.editingRequestId = null;
        }
    }

    populateFormForEditing(requestData) {
        // Populate form fields
        document.getElementById('leave-type').value = requestData.leaveType || '';
        document.getElementById('start-date').value = requestData.startDate?.toDate().toISOString().split('T')[0] || '';
        document.getElementById('end-date').value = requestData.endDate?.toDate().toISOString().split('T')[0] || '';
        document.getElementById('reason').value = requestData.reason || '';

        // Update calculated days and leave type info
        this.calculateDays();
        this.updateLeaveTypeInfo();

        // Load attachments if any
        if (requestData.attachments && requestData.attachments.length > 0) {
            // Note: For editing, we'll show existing attachments as read-only
            // New attachments can be added but existing ones can't be modified
            this.renderExistingAttachments(requestData.attachments);
        }
    }

    renderExistingAttachments(existingAttachments) {
        const existingContainer = document.getElementById('existing-attachments');
        if (!existingContainer) return;

        const attachmentItems = existingAttachments.map(attachment => `
            <div class="attachment-item" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: var(--light-grey); border-radius: var(--border-radius); margin-bottom: 0.5rem;">
                <div>
                    <i class="fas fa-file"></i>
                    <span>${attachment.name}</span>
                    <small style="color: var(--medium-grey);">(Existing attachment)</small>
                </div>
                <a href="${attachment.url}" target="_blank" class="btn btn-sm btn-outline">
                    <i class="fas fa-external-link-alt"></i>
                </a>
            </div>
        `).join('');

        existingContainer.innerHTML = `
            <h5>Existing Attachments</h5>
            ${attachmentItems}
        `;
    }

    cancelEditing() {
        this.editingRequestId = null;
        const editingIndicator = document.getElementById('editing-indicator');
        if (editingIndicator) {
            editingIndicator.style.display = 'none';
        }
        
        // Clear form
        document.getElementById('leave-request-form')?.reset();
        this.attachments = [];
        this.renderAttachments();
        
        Utils.showToast('Editing cancelled', 'info');
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        try {
            const originalText = Utils.showLoading(submitBtn);

            // Validate form data
            const leaveData = this.validateAndCollectFormData(formData);
            
            // Upload attachments if any
            if (this.attachments.length > 0) {
                leaveData.attachments = await this.uploadAttachments();
            }

            // Submit or update the request
            if (this.editingRequestId) {
                await this.updateLeaveRequest(leaveData);
            } else {
                await this.submitLeaveRequest(leaveData);
            }

            // Reset form and state
            this.resetForm();
            
            // Navigate back to dashboard
            app.navigateTo('dashboard');

        } catch (error) {
            console.error('Error submitting leave request:', error);
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading(submitBtn, this.editingRequestId ? 'Update Request' : 'Submit Request');
        }
    }

    validateAndCollectFormData(formData) {
        const leaveType = formData.get('leave-type');
        const startDate = formData.get('start-date');
        const endDate = formData.get('end-date');
        const reason = formData.get('reason');

        // Validation
        if (!leaveType || !startDate || !endDate || !reason) {
            throw new Error('All fields are required');
        }

        const dateValidation = Utils.validateLeaveDates(startDate, endDate);
        if (dateValidation) {
            throw new Error(dateValidation);
        }

        const days = Utils.calculateLeaveDays(startDate, endDate);
        const user = authService.getCurrentUser();
        const availableBalance = user.leaveBalances?.[leaveType] || 0;

        if (days > availableBalance) {
            throw new Error(`Insufficient leave balance. You have ${availableBalance} days available.`);
        }

        return {
            leaveType,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason: reason.trim(),
            days,
            status: 'pending',
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            userEmail: user.email,
            department: user.department || '',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
    }

    async uploadAttachments() {
        const uploadPromises = this.attachments.map(async (attachment) => {
            const fileName = `leave_attachments/${Utils.generateId()}_${attachment.name}`;
            const downloadURL = await Utils.uploadFile(attachment.file, fileName);
            
            return {
                name: attachment.name,
                url: downloadURL,
                size: attachment.size,
                type: attachment.type,
                uploadedAt: new Date()
            };
        });

        return await Promise.all(uploadPromises);
    }

    async submitLeaveRequest(leaveData) {
        leaveData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        
        await db.collection('leave_requests').add(leaveData);
        
        Utils.showToast('Leave request submitted successfully!', 'success');
    }

    async updateLeaveRequest(leaveData) {
        await db.collection('leave_requests').doc(this.editingRequestId).update(leaveData);
        
        Utils.showToast('Leave request updated successfully!', 'success');
        this.editingRequestId = null;
    }

    resetForm() {
        document.getElementById('leave-request-form')?.reset();
        this.attachments = [];
        this.renderAttachments();
        
        const editingIndicator = document.getElementById('editing-indicator');
        if (editingIndicator) {
            editingIndicator.style.display = 'none';
        }
        
        const calculatedDays = document.getElementById('calculated-days');
        if (calculatedDays) {
            calculatedDays.innerHTML = '';
        }
        
        const leaveTypeInfo = document.getElementById('leave-type-info');
        if (leaveTypeInfo) {
            leaveTypeInfo.innerHTML = '';
        }
    }

    async loadLeaveHistory() {
        try {
            const user = authService.getCurrentUser();
            const historyContainer = document.getElementById('leave-history');
            
            if (!historyContainer) return;

            const leaveRequestsSnapshot = await db.collection('leave_requests')
                .where('userId', '==', user.id)
                .orderBy('createdAt', 'desc')
                .get();

            const requests = leaveRequestsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startDate: doc.data().startDate?.toDate(),
                endDate: doc.data().endDate?.toDate(),
                createdAt: doc.data().createdAt?.toDate()
            }));

            this.allRequests = requests;
            this.renderLeaveHistory(this.getFilteredRequests());

        } catch (error) {
            console.error('Error loading leave history:', error);
        }
    }

    renderLeaveHistory(requests) {
        const historyContainer = document.getElementById('leave-history');
        if (!historyContainer) return;

        if (requests.length === 0) {
            historyContainer.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Leave Request History</h4>
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <button class="btn btn-sm btn-outline" onclick="leaveRequestController.filterByStatus('all')" id="filter-all">All</button>
                            <button class="btn btn-sm btn-warning" onclick="leaveRequestController.filterByStatus('pending')" id="filter-pending">Pending</button>
                            <button class="btn btn-sm btn-success" onclick="leaveRequestController.filterByStatus('approved')" id="filter-approved">Approved</button>
                            <button class="btn btn-sm btn-danger" onclick="leaveRequestController.filterByStatus('rejected')" id="filter-rejected">Rejected</button>
                            <button class="btn btn-sm btn-secondary" onclick="leaveRequestController.filterByStatus('cancelled')" id="filter-cancelled">Cancelled</button>
                        </div>
                    </div>
                    <div class="text-center" style="padding: 2rem;">
                        <i class="fas fa-history" style="font-size: 3rem; color: var(--medium-grey); margin-bottom: 1rem;"></i>
                        <p>No leave requests found</p>
                    </div>
                </div>
            `;
            return;
        }

        const requestRows = requests.map(request => `
            <tr>
                <td>${Utils.capitalize(request.leaveType)}</td>
                <td>${Utils.formatDate(request.startDate)} - ${Utils.formatDate(request.endDate)}</td>
                <td>${request.days} business days</td>
                <td><span class="badge ${Utils.getStatusBadgeClass(request.status)}">${Utils.capitalize(request.status)}</span></td>
                <td>${Utils.formatDate(request.createdAt, true)}</td>
                <td>
                    ${request.status === 'pending' ? `
                        <button class="btn btn-sm btn-outline" onclick="leaveRequestController.editRequest('${request.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="leaveRequestController.cancelRequest('${request.id}')">
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                    ${request.status === 'rejected' && request.rejectionReason ? `
                        <button class="btn btn-sm btn-warning" title="${request.rejectionReason}">
                            <i class="fas fa-info-circle"></i>
                        </button>
                    ` : ''}
                    ${request.attachments && request.attachments.length > 0 ? `
                        <button class="btn btn-sm btn-info" onclick="leaveRequestController.viewAttachments('${request.id}')">
                            <i class="fas fa-paperclip"></i>
                        </button>
                    ` : ''}
                </td>
            </tr>
        `).join('');

        historyContainer.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Leave Request History</h4>
                    <div style="display: flex; gap: 0.5rem; margin-top: 1rem; flex-wrap: wrap;">
                        <button class="btn btn-sm ${this.currentFilter === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="leaveRequestController.filterByStatus('all')" id="filter-all">All (${this.allRequests.length})</button>
                        <button class="btn btn-sm ${this.currentFilter === 'pending' ? 'btn-primary' : 'btn-outline'}" onclick="leaveRequestController.filterByStatus('pending')" id="filter-pending">Pending (${this.allRequests.filter(r => r.status === 'pending').length})</button>
                        <button class="btn btn-sm ${this.currentFilter === 'approved' ? 'btn-success' : 'btn-outline'}" onclick="leaveRequestController.filterByStatus('approved')" id="filter-approved">Approved (${this.allRequests.filter(r => r.status === 'approved').length})</button>
                        <button class="btn btn-sm ${this.currentFilter === 'rejected' ? 'btn-danger' : 'btn-outline'}" onclick="leaveRequestController.filterByStatus('rejected')" id="filter-rejected">Rejected (${this.allRequests.filter(r => r.status === 'rejected').length})</button>
                        <button class="btn btn-sm ${this.currentFilter === 'cancelled' ? 'btn-secondary' : 'btn-outline'}" onclick="leaveRequestController.filterByStatus('cancelled')" id="filter-cancelled">Cancelled (${this.allRequests.filter(r => r.status === 'cancelled').length})</button>
                    </div>
                </div>
                <div class="table-responsive">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Dates</th>
                                <th>Days</th>
                                <th>Status</th>
                                <th>Submitted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${requestRows}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async editRequest(requestId) {
        this.editingRequestId = requestId;
        await this.loadRequestForEditing();
    }

    async cancelRequest(requestId) {
        if (!confirm('Are you sure you want to cancel this leave request?')) {
            return;
        }

        try {
            await db.collection('leave_requests').doc(requestId).update({
                status: 'cancelled',
                cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast('Leave request cancelled successfully', 'success');
            await this.loadLeaveHistory();
        } catch (error) {
            console.error('Error cancelling request:', error);
            Utils.showToast('Failed to cancel leave request', 'error');
        }
    }

    viewAttachments(requestId) {
        // This could open a modal or navigate to a detailed view
        Utils.showToast('View attachments feature - to be implemented', 'info');
    }

    filterByStatus(status) {
        this.currentFilter = status;
        this.renderLeaveHistory(this.getFilteredRequests());
        
        // Update active filter button
        document.querySelectorAll('[id^="filter-"]').forEach(btn => {
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-outline');
        });
        
        const activeBtn = document.getElementById(`filter-${status}`);
        if (activeBtn) {
            activeBtn.classList.remove('btn-outline');
            activeBtn.classList.add('btn-primary');
        }
    }

    getFilteredRequests() {
        if (this.currentFilter === 'all') {
            return this.allRequests;
        }
        return this.allRequests.filter(request => request.status === this.currentFilter);
    }
}

// Initialize leave request controller
const leaveRequestController = new LeaveRequestController();
window.leaveRequestController = leaveRequestController;
