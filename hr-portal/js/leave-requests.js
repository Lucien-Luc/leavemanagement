// HR Leave Requests Controller
class LeaveRequestsController {
    constructor() {
        this.leaveRequests = [];
        this.filteredRequests = [];
        this.currentFilter = 'all';
        this.searchTerm = '';
    }

    async init() {
        try {
            await this.loadLeaveRequests();
            this.renderLeaveRequestsPage();
            this.setupEventListeners();
            this.startRealTimeUpdates();
        } catch (error) {
            console.error('Leave requests controller initialization failed:', error);
            Utils.showToast('Failed to load leave requests', 'error');
        }
    }

    async loadLeaveRequests() {
        try {
            const snapshot = await db.collection('leave_requests')
                .orderBy('createdAt', 'desc')
                .get();

            this.leaveRequests = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    startDate: data.startDate?.toDate(),
                    endDate: data.endDate?.toDate(),
                    createdAt: data.createdAt?.toDate(),
                    approvedAt: data.approvedAt?.toDate(),
                    rejectedAt: data.rejectedAt?.toDate()
                };
            });
            this.applyFilters();
        } catch (error) {
            console.error('Error loading leave requests:', error);
            this.leaveRequests = [];
        }
    }

    renderLeaveRequestsPage() {
        const content = `
            <div class="page-header">
                <h1 class="page-title">Leave Requests Management</h1>
                <p class="page-subtitle">Review and manage all employee leave requests</p>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex gap-2">
                    <input type="text" id="request-search" class="form-control" placeholder="Search by employee name or email..." value="${this.searchTerm}" style="width: 300px;">
                    <select id="request-filter" class="form-select" style="width: 200px;">
                        <option value="all">All Requests</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                        <option value="today">Today's Requests</option>
                        <option value="this-week">This Week</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="leaveRequestsController.exportRequests()">
                    <i class="fas fa-download"></i> Export CSV
                </button>
            </div>

            <div class="stats-grid mb-3">
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon warning">
                            <i class="fas fa-clock"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.leaveRequests.filter(r => r.status === 'pending').length}</div>
                    <div class="stat-label">Pending Requests</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon success">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.leaveRequests.filter(r => r.status === 'approved').length}</div>
                    <div class="stat-label">Approved Requests</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon danger">
                            <i class="fas fa-times-circle"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.leaveRequests.filter(r => r.status === 'rejected').length}</div>
                    <div class="stat-label">Rejected Requests</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon info">
                            <i class="fas fa-calendar-day"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.getTotalLeaveDays()}</div>
                    <div class="stat-label">Total Days Requested</div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Leave Requests (${this.filteredRequests.length})</h3>
                </div>
                <div class="card-body">
                    ${this.renderRequestsTable()}
                </div>
            </div>

            ${this.renderRequestDetailsModal()}
        `;

        document.getElementById('main-content').innerHTML = content;
    }

    renderRequestsTable() {
        if (this.filteredRequests.length === 0) {
            return '<p class="text-muted text-center">No leave requests found matching your criteria.</p>';
        }

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Leave Type</th>
                            <th>Duration</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Status</th>
                            <th>Submitted</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredRequests.map(request => `
                            <tr>
                                <td>
                                    <div>
                                        <strong>${request.userName}</strong><br>
                                        <small class="text-muted">${request.userEmail}</small>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge badge-info">${request.department || 'N/A'}</span>
                                </td>
                                <td>
                                    <span class="badge badge-primary">${request.leaveType}</span>
                                </td>
                                <td>
                                    <strong>${request.days} days</strong>
                                </td>
                                <td>${Utils.formatDate(request.startDate)}</td>
                                <td>${Utils.formatDate(request.endDate)}</td>
                                <td>${Utils.getStatusBadge(request.status)}</td>
                                <td>
                                    <small>${Utils.formatDateTime(request.createdAt)}</small>
                                </td>
                                <td>
                                    <div class="d-flex gap-1">
                                        <button class="btn btn-outline btn-sm" onclick="leaveRequestsController.viewRequestDetails('${request.id}')">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${request.status === 'pending' ? `
                                            <button class="btn btn-success btn-sm" onclick="leaveRequestsController.approveRequest('${request.id}')">
                                                <i class="fas fa-check"></i>
                                            </button>
                                            <button class="btn btn-danger btn-sm" onclick="leaveRequestsController.rejectRequest('${request.id}')">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderRequestDetailsModal() {
        return `
            <div id="request-details-modal" class="modal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h4 class="modal-title">Leave Request Details</h4>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body" id="request-details-content">
                        <!-- Content will be populated dynamically -->
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="Utils.hideModal('request-details-modal')">Close</button>
                        <div id="request-actions">
                            <!-- Action buttons will be populated dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('request-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchTerm = e.target.value;
                this.applyFilters();
                this.renderLeaveRequestsPage();
            }, 300));
        }

        // Filter functionality
        const filterSelect = document.getElementById('request-filter');
        if (filterSelect) {
            filterSelect.value = this.currentFilter;
            filterSelect.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.applyFilters();
                this.renderLeaveRequestsPage();
            });
        }

        // Setup modal close functionality
        Utils.setupModalClose('request-details-modal');
    }

    applyFilters() {
        let filtered = [...this.leaveRequests];

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(req => 
                req.userName.toLowerCase().includes(term) ||
                req.userEmail.toLowerCase().includes(term) ||
                req.department?.toLowerCase().includes(term)
            );
        }

        // Apply status filter
        switch (this.currentFilter) {
            case 'pending':
                filtered = filtered.filter(req => req.status === 'pending');
                break;
            case 'approved':
                filtered = filtered.filter(req => req.status === 'approved');
                break;
            case 'rejected':
                filtered = filtered.filter(req => req.status === 'rejected');
                break;
            case 'today':
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                filtered = filtered.filter(req => 
                    req.createdAt >= today && req.createdAt < tomorrow
                );
                break;
            case 'this-week':
                const weekAgo = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000));
                filtered = filtered.filter(req => req.createdAt >= weekAgo);
                break;
        }

        this.filteredRequests = filtered;
    }

    getTotalLeaveDays() {
        return this.leaveRequests.reduce((total, req) => total + (req.days || 0), 0);
    }

    async viewRequestDetails(requestId) {
        const request = this.leaveRequests.find(r => r.id === requestId);
        if (!request) return;

        const content = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Employee Information</h5>
                    <p><strong>Name:</strong> ${request.userName}</p>
                    <p><strong>Email:</strong> ${request.userEmail}</p>
                    <p><strong>Department:</strong> ${request.department || 'N/A'}</p>
                </div>
                <div class="col-md-6">
                    <h5>Request Information</h5>
                    <p><strong>Leave Type:</strong> ${request.leaveType}</p>
                    <p><strong>Duration:</strong> ${request.days} days</p>
                    <p><strong>Status:</strong> ${Utils.getStatusBadge(request.status)}</p>
                </div>
            </div>
            
            <hr>
            
            <div class="row">
                <div class="col-md-6">
                    <h5>Leave Dates</h5>
                    <p><strong>Start Date:</strong> ${Utils.formatDate(request.startDate, 'readable')}</p>
                    <p><strong>End Date:</strong> ${Utils.formatDate(request.endDate, 'readable')}</p>
                </div>
                <div class="col-md-6">
                    <h5>Submission Details</h5>
                    <p><strong>Submitted:</strong> ${Utils.formatDateTime(request.createdAt)}</p>
                    ${request.approvedAt ? `<p><strong>Approved:</strong> ${Utils.formatDateTime(request.approvedAt)} by ${request.approvedBy}</p>` : ''}
                    ${request.rejectedAt ? `<p><strong>Rejected:</strong> ${Utils.formatDateTime(request.rejectedAt)} by ${request.rejectedBy}</p>` : ''}
                </div>
            </div>
            
            <hr>
            
            <h5>Reason</h5>
            <p>${request.reason || 'No reason provided'}</p>
            
            ${request.rejectionReason ? `
                <h5>Rejection Reason</h5>
                <p class="text-danger">${request.rejectionReason}</p>
            ` : ''}
            
            ${request.attachments && request.attachments.length > 0 ? `
                <h5>Attachments</h5>
                <ul>
                    ${request.attachments.map(att => `
                        <li><a href="${att.url}" target="_blank">${att.name}</a> (${(att.size / 1024).toFixed(2)} KB)</li>
                    `).join('')}
                </ul>
            ` : ''}
        `;

        document.getElementById('request-details-content').innerHTML = content;

        // Set up action buttons
        const actionsContainer = document.getElementById('request-actions');
        if (request.status === 'manager_approved') {
            actionsContainer.innerHTML = `
                <button class="btn btn-success" onclick="leaveRequestsController.confirmRequest('${request.id}'); Utils.hideModal('request-details-modal');">
                    <i class="fas fa-check-double"></i> Confirm Approval
                </button>
                <button class="btn btn-danger" onclick="leaveRequestsController.rejectRequest('${request.id}'); Utils.hideModal('request-details-modal');">
                    <i class="fas fa-times"></i> Reject
                </button>
            `;
        } else {
            actionsContainer.innerHTML = '';
        }

        Utils.showModal('request-details-modal');
    }

    async confirmRequest(requestId) {
        try {
            const currentUser = authService.getCurrentUser();
            await db.collection('leave_requests').doc(requestId).update({
                status: 'approved',
                hrApproval: {
                    hrId: currentUser.id,
                    hrName: `${currentUser.firstName} ${currentUser.lastName}`,
                    confirmedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    comments: 'Confirmed by HR'
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast('Leave request confirmed successfully', 'success');
            await this.loadLeaveRequests();
            this.renderLeaveRequestsPage();
        } catch (error) {
            console.error('Error confirming request:', error);
            Utils.showToast('Failed to confirm request', 'error');
        }
    }

    async rejectRequest(requestId) {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;

        try {
            const currentUser = authService.getCurrentUser();
            await db.collection('leave_requests').doc(requestId).update({
                status: 'rejected',
                rejectedBy: `${currentUser.firstName} ${currentUser.lastName}`,
                rejectionReason: reason,
                rejectedAt: firebase.firestore.Timestamp.now(),
                updatedAt: firebase.firestore.Timestamp.now()
            });

            Utils.showToast('Leave request rejected', 'success');
            await this.loadLeaveRequests();
            this.renderLeaveRequestsPage();
        } catch (error) {
            console.error('Error rejecting request:', error);
            Utils.showToast('Failed to reject request', 'error');
        }
    }

    exportRequests() {
        if (this.filteredRequests.length === 0) {
            Utils.showToast('No data to export', 'warning');
            return;
        }

        const exportData = this.filteredRequests.map(req => ({
            'Employee Name': req.userName,
            'Email': req.userEmail,
            'Department': req.department || 'N/A',
            'Leave Type': req.leaveType,
            'Start Date': Utils.formatDate(req.startDate),
            'End Date': Utils.formatDate(req.endDate),
            'Days': req.days,
            'Status': req.status,
            'Reason': req.reason || '',
            'Submitted': Utils.formatDateTime(req.createdAt),
            'Approved By': req.approvedBy || '',
            'Rejected By': req.rejectedBy || '',
            'Rejection Reason': req.rejectionReason || ''
        }));

        const filename = `leave-requests-${Utils.formatDate(new Date())}.csv`;
        Utils.exportToCSV(exportData, filename);
    }

    startRealTimeUpdates() {
        db.collection('leave_requests').onSnapshot(() => {
            this.loadLeaveRequests().then(() => {
                this.renderLeaveRequestsPage();
            });
        });
    }
}

// Global controller instance
window.leaveRequestsController = new LeaveRequestsController();