// HR Leave Requests Management Controller
class LeaveRequestsController {
    constructor() {
        this.leaveRequests = [];
        this.filteredRequests = [];
        this.currentFilter = 'all';
        this.currentSort = { field: 'createdAt', direction: 'desc' };
        this.searchTerm = '';
        this.realTimeListener = null;
    }

    async init() {
        try {
            await this.loadLeaveRequests();
            this.setupRealTimeListener();
            this.renderLeaveRequests();
            this.setupEventListeners();
        } catch (error) {
            console.error('Leave requests initialization failed:', error);
            Utils.showToast('Failed to load leave requests', 'error');
        }
    }

    async loadLeaveRequests() {
        try {
            const requestsSnapshot = await db.collection('leave_requests')
                .orderBy('createdAt', 'desc')
                .get();

            this.leaveRequests = requestsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startDate: doc.data().startDate.toDate(),
                endDate: doc.data().endDate.toDate(),
                createdAt: doc.data().createdAt.toDate(),
                approvedAt: doc.data().approvedAt?.toDate(),
                rejectedAt: doc.data().rejectedAt?.toDate()
            }));

            this.filteredRequests = [...this.leaveRequests];
        } catch (error) {
            console.error('Error loading leave requests:', error);
            this.leaveRequests = [];
            this.filteredRequests = [];
        }
    }

    setupRealTimeListener() {
        this.realTimeListener = db.collection('leave_requests')
            .onSnapshot((snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' || change.type === 'modified') {
                        this.loadLeaveRequests().then(() => {
                            this.applyFilters();
                            this.renderRequestsTable();
                        });
                    }
                });
            });
    }

    renderLeaveRequests() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Leave Requests Management</h1>
                <p class="page-subtitle">Review and manage employee leave requests</p>
            </div>

            <div class="card">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h3 class="card-title">Leave Requests (${this.filteredRequests.length})</h3>
                        <div class="d-flex gap-2">
                            <select id="status-filter" class="form-control form-select" style="width: 150px;">
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="approved">Approved</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <input type="text" id="search-requests" placeholder="Search requests..." class="form-control" style="width: 250px;">
                            <button class="btn btn-outline" onclick="leaveRequestsController.exportRequests()">
                                <i class="fas fa-download"></i>
                                Export
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    <div id="requests-table-container">
                        ${this.renderRequestsTable()}
                    </div>
                </div>
            </div>

            <!-- Request Details Modal -->
            <div id="request-details-modal" class="modal">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 class="modal-title">Leave Request Details</h3>
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

            <!-- Rejection Reason Modal -->
            <div id="rejection-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 class="modal-title">Reject Leave Request</h3>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="rejection-form">
                            <input type="hidden" id="reject-request-id">
                            <div class="form-group">
                                <label class="form-label">Reason for Rejection</label>
                                <textarea id="rejection-reason" class="form-control" rows="4" required placeholder="Please provide a reason for rejecting this leave request..."></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline" onclick="Utils.hideModal('rejection-modal')">Cancel</button>
                        <button type="submit" form="rejection-form" class="btn btn-danger">Reject Request</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderRequestsTable() {
        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th onclick="leaveRequestsController.sortBy('userName')">Employee</th>
                            <th onclick="leaveRequestsController.sortBy('leaveType')">Leave Type</th>
                            <th onclick="leaveRequestsController.sortBy('startDate')">Start Date</th>
                            <th onclick="leaveRequestsController.sortBy('endDate')">End Date</th>
                            <th onclick="leaveRequestsController.sortBy('days')">Days</th>
                            <th onclick="leaveRequestsController.sortBy('status')">Status</th>
                            <th onclick="leaveRequestsController.sortBy('createdAt')">Submitted</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredRequests.map(request => `
                            <tr>
                                <td>
                                    <strong>${request.userName}</strong><br>
                                    <small class="text-muted">${request.department}</small>
                                </td>
                                <td>
                                    <span class="badge badge-info">${request.leaveType}</span>
                                </td>
                                <td>${Utils.formatDate(request.startDate)}</td>
                                <td>${Utils.formatDate(request.endDate)}</td>
                                <td><strong>${request.days}</strong></td>
                                <td>${Utils.getStatusBadge(request.status)}</td>
                                <td>${Utils.formatDate(request.createdAt)}</td>
                                <td>
                                    <div class="d-flex gap-1">
                                        <button class="btn btn-sm btn-primary" onclick="leaveRequestsController.viewRequest('${request.id}')" title="View Details">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${request.status === 'pending' ? `
                                            <button class="btn btn-sm btn-success" onclick="leaveRequestsController.approveRequest('${request.id}')" title="Approve">
                                                <i class="fas fa-check"></i>
                                            </button>
                                            <button class="btn btn-sm btn-danger" onclick="leaveRequestsController.showRejectModal('${request.id}')" title="Reject">
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

    setupEventListeners() {
        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilter = e.target.value;
                this.applyFilters();
                document.getElementById('requests-table-container').innerHTML = this.renderRequestsTable();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('search-requests');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.searchTerm = e.target.value.toLowerCase();
                this.applyFilters();
                document.getElementById('requests-table-container').innerHTML = this.renderRequestsTable();
            }, 300));
        }

        // Rejection form
        const rejectionForm = document.getElementById('rejection-form');
        if (rejectionForm) {
            rejectionForm.addEventListener('submit', (e) => this.handleRejectRequest(e));
        }

        // Setup modal close handlers
        Utils.setupModalClose('request-details-modal');
        Utils.setupModalClose('rejection-modal');
    }

    applyFilters() {
        this.filteredRequests = this.leaveRequests.filter(request => {
            const statusMatch = this.currentFilter === 'all' || request.status === this.currentFilter;
            const searchMatch = this.searchTerm === '' || 
                request.userName.toLowerCase().includes(this.searchTerm) ||
                request.userEmail.toLowerCase().includes(this.searchTerm) ||
                request.leaveType.toLowerCase().includes(this.searchTerm) ||
                request.reason.toLowerCase().includes(this.searchTerm);
            
            return statusMatch && searchMatch;
        });

        this.sortRequests();
    }

    sortBy(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }
        
        this.sortRequests();
        document.getElementById('requests-table-container').innerHTML = this.renderRequestsTable();
    }

    sortRequests() {
        this.filteredRequests.sort((a, b) => {
            let aValue = a[this.currentSort.field];
            let bValue = b[this.currentSort.field];
            
            if (this.currentSort.field === 'startDate' || this.currentSort.field === 'endDate' || this.currentSort.field === 'createdAt') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            } else if (this.currentSort.field === 'days') {
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
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

    viewRequest(requestId) {
        const request = this.leaveRequests.find(req => req.id === requestId);
        if (!request) return;

        const content = document.getElementById('request-details-content');
        const actions = document.getElementById('request-actions');

        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h5>Employee Information</h5>
                    <p><strong>Name:</strong> ${request.userName}</p>
                    <p><strong>Email:</strong> ${request.userEmail}</p>
                    <p><strong>Department:</strong> ${request.department}</p>
                </div>
                <div class="col-md-6">
                    <h5>Leave Details</h5>
                    <p><strong>Type:</strong> ${request.leaveType}</p>
                    <p><strong>Duration:</strong> ${request.days} days</p>
                    <p><strong>Status:</strong> ${Utils.getStatusBadge(request.status)}</p>
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-md-6">
                    <h5>Dates</h5>
                    <p><strong>Start Date:</strong> ${Utils.formatDate(request.startDate)}</p>
                    <p><strong>End Date:</strong> ${Utils.formatDate(request.endDate)}</p>
                    <p><strong>Submitted:</strong> ${Utils.formatDateTime(request.createdAt)}</p>
                </div>
                <div class="col-md-6">
                    ${request.status !== 'pending' ? `
                        <h5>Decision Details</h5>
                        ${request.status === 'approved' ? `
                            <p><strong>Approved By:</strong> ${request.approvedBy}</p>
                            <p><strong>Approved At:</strong> ${Utils.formatDateTime(request.approvedAt)}</p>
                        ` : ''}
                        ${request.status === 'rejected' ? `
                            <p><strong>Rejected By:</strong> ${request.rejectedBy}</p>
                            <p><strong>Rejected At:</strong> ${Utils.formatDateTime(request.rejectedAt)}</p>
                            <p><strong>Reason:</strong> ${request.rejectionReason}</p>
                        ` : ''}
                    ` : ''}
                </div>
            </div>
            
            <div class="row mt-3">
                <div class="col-12">
                    <h5>Reason</h5>
                    <p>${request.reason}</p>
                </div>
            </div>
            
            ${request.attachments && request.attachments.length > 0 ? `
                <div class="row mt-3">
                    <div class="col-12">
                        <h5>Attachments</h5>
                        ${request.attachments.map(attachment => `
                            <p><a href="${attachment.url}" target="_blank">${attachment.name}</a> (${(attachment.size / 1024).toFixed(1)} KB)</p>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        if (request.status === 'pending') {
            actions.innerHTML = `
                <button class="btn btn-success" onclick="leaveRequestsController.approveRequest('${request.id}')">
                    <i class="fas fa-check"></i>
                    Approve
                </button>
                <button class="btn btn-danger" onclick="leaveRequestsController.showRejectModal('${request.id}')">
                    <i class="fas fa-times"></i>
                    Reject
                </button>
            `;
        } else {
            actions.innerHTML = '';
        }

        Utils.showModal('request-details-modal');
    }

    async approveRequest(requestId) {
        if (!confirm('Are you sure you want to approve this leave request?')) return;

        try {
            const currentUser = authService.getCurrentUser();
            
            await db.collection('leave_requests').doc(requestId).update({
                status: 'approved',
                approvedBy: `${currentUser.firstName} ${currentUser.lastName}`,
                approvedAt: firebase.firestore.Timestamp.now(),
                updatedAt: firebase.firestore.Timestamp.now()
            });

            Utils.showToast('Leave request approved successfully', 'success');
            Utils.hideModal('request-details-modal');
            
            // Refresh the list
            await this.loadLeaveRequests();
            this.applyFilters();
            document.getElementById('requests-table-container').innerHTML = this.renderRequestsTable();

        } catch (error) {
            console.error('Error approving request:', error);
            Utils.showToast('Failed to approve leave request', 'error');
        }
    }

    showRejectModal(requestId) {
        document.getElementById('reject-request-id').value = requestId;
        document.getElementById('rejection-reason').value = '';
        Utils.hideModal('request-details-modal');
        Utils.showModal('rejection-modal');
    }

    async handleRejectRequest(event) {
        event.preventDefault();
        
        const requestId = document.getElementById('reject-request-id').value;
        const reason = document.getElementById('rejection-reason').value.trim();
        const submitBtn = event.target.querySelector('button[type="submit"]');
        
        if (!reason) {
            Utils.showToast('Please provide a reason for rejection', 'error');
            return;
        }

        try {
            const originalText = Utils.showLoading(submitBtn);
            const currentUser = authService.getCurrentUser();
            
            await db.collection('leave_requests').doc(requestId).update({
                status: 'rejected',
                rejectedBy: `${currentUser.firstName} ${currentUser.lastName}`,
                rejectionReason: reason,
                rejectedAt: firebase.firestore.Timestamp.now(),
                updatedAt: firebase.firestore.Timestamp.now()
            });

            Utils.showToast('Leave request rejected successfully', 'success');
            Utils.hideModal('rejection-modal');
            
            // Refresh the list
            await this.loadLeaveRequests();
            this.applyFilters();
            document.getElementById('requests-table-container').innerHTML = this.renderRequestsTable();

        } catch (error) {
            console.error('Error rejecting request:', error);
            Utils.showToast('Failed to reject leave request', 'error');
        } finally {
            Utils.hideLoading(submitBtn, 'Reject Request');
        }
    }

    exportRequests() {
        if (this.filteredRequests.length === 0) {
            Utils.showToast('No requests to export', 'warning');
            return;
        }

        const exportData = this.filteredRequests.map(request => ({
            'Employee Name': request.userName,
            'Email': request.userEmail,
            'Department': request.department,
            'Leave Type': request.leaveType,
            'Start Date': Utils.formatDate(request.startDate),
            'End Date': Utils.formatDate(request.endDate),
            'Days': request.days,
            'Reason': request.reason,
            'Status': request.status,
            'Submitted Date': Utils.formatDate(request.createdAt),
            'Approved By': request.approvedBy || '',
            'Rejected By': request.rejectedBy || '',
            'Rejection Reason': request.rejectionReason || ''
        }));

        Utils.exportToCSV(exportData, `leave_requests_${Utils.formatDate(new Date())}.csv`);
    }

    destroy() {
        if (this.realTimeListener) {
            this.realTimeListener();
        }
    }
}