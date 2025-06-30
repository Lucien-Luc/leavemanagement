// Manager Leave Requests Controller
class ManagerLeaveRequestsController {
    constructor() {
        this.leaveRequests = [];
        this.filters = {
            status: 'all',
            dateRange: 'all'
        };
    }

    async init() {
        try {
            await this.loadLeaveRequests();
            this.renderLeaveRequestsPage();
        } catch (error) {
            console.error('Error initializing leave requests controller:', error);
            Utils.showToast('Error loading leave requests data', 'error');
        }
    }

    async loadLeaveRequests() {
        const manager = managerAuthService.getCurrentManager();
        if (!manager) {
            throw new Error('Manager not found');
        }

        try {
            // Load ALL requests first, then filter by manager
            const requestsSnapshot = await db.collection('leave_requests')
                .orderBy('createdAt', 'desc')
                .get();

            // Filter requests for this manager and map data
            this.leaveRequests = requestsSnapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
                        endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate),
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt)
                    };
                })
                .filter(request => {
                    console.log('Checking request:', {
                        requestId: request.id,
                        requestManagerId: request.managerId,
                        requestDepartment: request.department,
                        requestUserEmail: request.userEmail,
                        managerInfo: {
                            id: manager.id,
                            employeeId: manager.employeeId,
                            department: manager.department,
                            email: manager.email
                        }
                    });
                    
                    // Multiple ways to match requests to this manager
                    const isManagerMatch = 
                        request.managerId === manager.id || 
                        request.managerId === manager.employeeId ||
                        request.department === manager.department ||
                        (request.userEmail && manager.department && 
                         request.userEmail.toLowerCase().includes(manager.department.toLowerCase())) ||
                        // Also check if the user's manager field matches any identifier of this manager
                        (request.userId && request.managerId && 
                         (request.managerId === manager.id || request.managerId === manager.employeeId));
                    
                    if (isManagerMatch) {
                        console.log('✓ Request matches manager:', request.id);
                    }
                    
                    return isManagerMatch;
                });
        } catch (error) {
            console.error('Error loading leave requests:', error);
            this.leaveRequests = [];
        }
    }

    renderLeaveRequestsPage() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="manager-dashboard">
                <div class="dashboard-header">
                    <h1>Leave Requests</h1>
                    <p>Manage leave requests for your department</p>
                </div>

                <div class="manager-section">
                    <div class="filters-section">
                        <div class="filter-group">
                            <label for="status-filter">Status:</label>
                            <select id="status-filter" class="form-control">
                                <option value="all">All Requests</option>
                                <option value="pending">Pending Review</option>
                                <option value="approved">Approved</option>
                                <option value="hr_confirmed">HR Confirmed</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="date-filter">Date Range:</label>
                            <select id="date-filter" class="form-control">
                                <option value="all">All Time</option>
                                <option value="this-month">This Month</option>
                                <option value="last-month">Last Month</option>
                                <option value="this-year">This Year</option>
                            </select>
                        </div>
                        <button id="reset-filters" class="btn btn-secondary">Reset Filters</button>
                    </div>
                </div>

                <div class="manager-section">
                    <h2><i class="fas fa-calendar-alt"></i> Leave Requests</h2>
                    <div class="requests-container">
                        ${this.renderRequestsList()}
                    </div>
                </div>
            </div>
        `;

        this.setupEventListeners();
    }

    renderRequestsList() {
        const filteredRequests = this.getFilteredRequests();
        
        if (filteredRequests.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-calendar-times"></i>
                    <h3>No Leave Requests</h3>
                    <p>No leave requests match your current filters.</p>
                </div>
            `;
        }

        return filteredRequests.map(request => this.renderRequestCard(request)).join('');
    }

    renderRequestCard(request) {
        const statusClass = this.getStatusClass(request.status);
        const statusText = this.getStatusText(request.status);
        const canApprove = request.status === 'pending';
        const isManagerApproved = request.status === 'manager_approved';
        const isApproved = request.status === 'approved';
        
        return `
            <div class="request-card ${statusClass}">
                <div class="request-header">
                    <div class="request-employee-info">
                        <h4>${request.employeeName}</h4>
                        <p>${request.employeeId}</p>
                    </div>
                    <div class="request-status-info">
                        <span class="status-badge ${statusClass}">${statusText}</span>
                        <span class="request-date">${Utils.formatDate(request.createdAt?.toDate())}</span>
                    </div>
                </div>

                <div class="request-details">
                    <div class="detail-grid">
                        <div class="request-detail">
                            <label>Leave Type</label>
                            <span>${request.leaveType}</span>
                        </div>
                        <div class="request-detail">
                            <label>Start Date</label>
                            <span>${Utils.formatDate(request.startDate)}</span>
                        </div>
                        <div class="request-detail">
                            <label>End Date</label>
                            <span>${Utils.formatDate(request.endDate)}</span>
                        </div>
                        <div class="request-detail">
                            <label>Total Days</label>
                            <span>${request.totalDays} days</span>
                        </div>
                    </div>
                    
                    ${request.reason ? `
                        <div class="request-reason">
                            <label>Reason</label>
                            <p>${request.reason}</p>
                        </div>
                    ` : ''}

                    ${request.attachments && request.attachments.length > 0 ? `
                        <div class="request-attachments">
                            <label>Attachments</label>
                            <div class="attachments-list">
                                ${request.attachments.map(att => `
                                    <a href="${att.url}" target="_blank" class="attachment-link">
                                        <i class="fas fa-paperclip"></i> ${att.name}
                                    </a>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    ${request.managerApproval ? `
                        <div class="approval-info">
                            <label>Manager Decision</label>
                            <div class="approval-details">
                                <p><strong>${request.managerApproval.managerName}</strong></p>
                                <p>${Utils.formatDateTime(request.managerApproval.approvedAt?.toDate() || request.managerApproval.rejectedAt?.toDate())}</p>
                                ${request.managerApproval.comments ? `<p><em>"${request.managerApproval.comments}"</em></p>` : ''}
                            </div>
                        </div>
                    ` : ''}

                    ${request.hrApproval ? `
                        <div class="approval-info">
                            <label>HR Decision</label>
                            <div class="approval-details">
                                <p><strong>${request.hrApproval.hrName}</strong></p>
                                <p>${Utils.formatDateTime(request.hrApproval.confirmedAt?.toDate())}</p>
                                ${request.hrApproval.comments ? `<p><em>"${request.hrApproval.comments}"</em></p>` : ''}
                            </div>
                        </div>
                    ` : ''}
                </div>

                <div class="request-actions">
                    ${canApprove ? `
                        <button class="btn-approve" onclick="managerApp.controllers.leaveRequests.approveRequest('${request.id}')">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        <button class="btn-reject" onclick="managerApp.controllers.leaveRequests.rejectRequest('${request.id}')">
                            <i class="fas fa-times"></i> Reject
                        </button>
                    ` : ''}
                    
                    ${isManagerApproved ? `
                        <div class="status-message">
                            <i class="fas fa-clock"></i> Waiting for HR confirmation
                        </div>
                    ` : ''}
                    
                    ${isApproved ? `
                        <div class="status-message">
                            <i class="fas fa-check-circle"></i> Fully approved by HR
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getStatusClass(status) {
        const statusClasses = {
            'pending': 'status-pending',
            'manager_approved': 'status-manager-approved',
            'approved': 'status-approved',
            'rejected': 'status-rejected'
        };
        return statusClasses[status] || 'status-unknown';
    }

    getStatusText(status) {
        const statusTexts = {
            'pending': 'Pending Review',
            'manager_approved': 'Approved - Awaiting HR',
            'approved': 'Final Approval (HR Confirmed)',
            'rejected': 'Rejected'
        };
        return statusTexts[status] || 'Unknown';
    }

    getFilteredRequests() {
        let filtered = [...this.leaveRequests];

        // Apply status filter
        if (this.filters.status !== 'all') {
            filtered = filtered.filter(request => request.status === this.filters.status);
        }

        // Apply date filter
        if (this.filters.dateRange !== 'all') {
            const now = new Date();
            const filterDate = new Date();

            switch (this.filters.dateRange) {
                case 'this-month':
                    filterDate.setMonth(now.getMonth(), 1);
                    break;
                case 'last-month':
                    filterDate.setMonth(now.getMonth() - 1, 1);
                    break;
                case 'this-year':
                    filterDate.setMonth(0, 1);
                    break;
            }

            filtered = filtered.filter(request => {
                const requestDate = request.createdAt?.toDate() || new Date(0);
                return requestDate >= filterDate;
            });
        }

        return filtered;
    }

    setupEventListeners() {
        // Status filter
        const statusFilter = document.getElementById('status-filter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.filters.status = e.target.value;
                this.updateRequestsList();
            });
        }

        // Date filter
        const dateFilter = document.getElementById('date-filter');
        if (dateFilter) {
            dateFilter.addEventListener('change', (e) => {
                this.filters.dateRange = e.target.value;
                this.updateRequestsList();
            });
        }

        // Reset filters
        const resetFilters = document.getElementById('reset-filters');
        if (resetFilters) {
            resetFilters.addEventListener('click', () => {
                this.filters = { status: 'all', dateRange: 'all' };
                statusFilter.value = 'all';
                dateFilter.value = 'all';
                this.updateRequestsList();
            });
        }
    }

    updateRequestsList() {
        const requestsContainer = document.querySelector('.requests-container');
        if (requestsContainer) {
            requestsContainer.innerHTML = this.renderRequestsList();
        }
    }

    async approveRequest(requestId) {
        try {
            const manager = managerAuthService.getCurrentManager();
            
            await db.collection('leave_requests').doc(requestId).update({
                status: 'manager_approved',
                approvedBy: `${manager.firstName} ${manager.lastName}`,
                approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                managerApproval: {
                    managerId: manager.id,
                    managerName: `${manager.firstName} ${manager.lastName}`,
                    approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    comments: 'Approved by manager'
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast('Leave request approved successfully', 'success');
            await this.init(); // Reload data
        } catch (error) {
            console.error('Error approving request:', error);
            Utils.showToast('Error approving request', 'error');
        }
    }

    async rejectRequest(requestId) {
        const reason = prompt('Please provide a reason for rejection:');
        if (!reason) return;

        try {
            const manager = managerAuthService.getCurrentManager();
            
            await db.collection('leave_requests').doc(requestId).update({
                status: 'rejected',
                managerApproval: {
                    managerId: manager.id,
                    managerName: `${manager.firstName} ${manager.lastName}`,
                    rejectedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    comments: reason
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            Utils.showToast('Leave request rejected', 'success');
            await this.init(); // Reload data
        } catch (error) {
            console.error('Error rejecting request:', error);
            Utils.showToast('Error rejecting request', 'error');
        }
    }
}