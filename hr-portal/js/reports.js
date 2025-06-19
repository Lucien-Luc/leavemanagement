// HR Reports Controller
class ReportsController {
    constructor() {
        this.reportData = {};
        this.charts = {};
    }

    async init() {
        try {
            await this.loadReportData();
            this.renderReportsPage();
            this.setupEventListeners();
            this.renderCharts();
        } catch (error) {
            console.error('Reports controller initialization failed:', error);
            Utils.showToast('Failed to load reports data', 'error');
        }
    }

    async loadReportData() {
        try {
            // Load leave requests
            const leaveRequestsSnapshot = await db.collection('leave_requests').get();
            const leaveRequests = leaveRequestsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    startDate: data.startDate?.toDate(),
                    endDate: data.endDate?.toDate(),
                    createdAt: data.createdAt?.toDate()
                };
            });

            // Load employees
            const employeesSnapshot = await db.collection('users').get();
            const employees = employeesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.reportData = {
                leaveRequests,
                employees,
                totalRequests: leaveRequests.length,
                approvedRequests: leaveRequests.filter(r => r.status === 'approved').length,
                rejectedRequests: leaveRequests.filter(r => r.status === 'rejected').length,
                pendingRequests: leaveRequests.filter(r => r.status === 'pending').length
            };

        } catch (error) {
            console.error('Error loading report data:', error);
            this.reportData = {
                leaveRequests: [],
                employees: [],
                totalRequests: 0,
                approvedRequests: 0,
                rejectedRequests: 0,
                pendingRequests: 0
            };
        }
    }

    renderReportsPage() {
        const content = `
            <div class="page-header">
                <h1 class="page-title">Reports & Analytics</h1>
                <p class="page-subtitle">Comprehensive insights into leave management</p>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-3">
                <div class="d-flex gap-2">
                    <select id="report-period" class="form-select" style="width: 200px;">
                        <option value="all">All Time</option>
                        <option value="this-year">This Year</option>
                        <option value="last-year">Last Year</option>
                        <option value="this-month">This Month</option>
                        <option value="last-month">Last Month</option>
                        <option value="last-3-months">Last 3 Months</option>
                        <option value="last-6-months">Last 6 Months</option>
                    </select>
                </div>
                <div class="d-flex gap-2">
                    <button class="btn btn-outline" onclick="reportsController.exportReport('summary')">
                        <i class="fas fa-download"></i> Export Summary
                    </button>
                    <button class="btn btn-primary" onclick="reportsController.exportReport('detailed')">
                        <i class="fas fa-file-excel"></i> Export Detailed
                    </button>
                </div>
            </div>

            <!-- Summary Stats -->
            <div class="stats-grid mb-4">
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon primary">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.reportData.totalRequests}</div>
                    <div class="stat-label">Total Requests</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon success">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.reportData.approvedRequests}</div>
                    <div class="stat-label">Approved (${this.getPercentage(this.reportData.approvedRequests, this.reportData.totalRequests)}%)</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon warning">
                            <i class="fas fa-clock"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.reportData.pendingRequests}</div>
                    <div class="stat-label">Pending (${this.getPercentage(this.reportData.pendingRequests, this.reportData.totalRequests)}%)</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon danger">
                            <i class="fas fa-times-circle"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.reportData.rejectedRequests}</div>
                    <div class="stat-label">Rejected (${this.getPercentage(this.reportData.rejectedRequests, this.reportData.totalRequests)}%)</div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="row mb-4">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="card-title">Leave Request Status Distribution</h4>
                        </div>
                        <div class="card-body">
                            <canvas id="status-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="card-title">Leave Types Distribution</h4>
                        </div>
                        <div class="card-body">
                            <canvas id="leave-types-chart" width="400" height="200"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Department Analysis -->
            <div class="row mb-4">
                <div class="col-md-8">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="card-title">Leave Requests by Department</h4>
                        </div>
                        <div class="card-body">
                            <canvas id="department-chart" width="600" height="300"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="card-title">Monthly Trends</h4>
                        </div>
                        <div class="card-body">
                            <canvas id="monthly-chart" width="300" height="300"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top Insights -->
            <div class="row">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="card-title">Top Leave Requesters</h4>
                        </div>
                        <div class="card-body">
                            ${this.renderTopRequesters()}
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="card-title">Department Statistics</h4>
                        </div>
                        <div class="card-body">
                            ${this.renderDepartmentStats()}
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('main-content').innerHTML = content;
    }

    renderTopRequesters() {
        const requesterStats = {};
        
        this.reportData.leaveRequests.forEach(request => {
            if (!requesterStats[request.userId]) {
                requesterStats[request.userId] = {
                    name: request.userName,
                    email: request.userEmail,
                    totalRequests: 0,
                    totalDays: 0,
                    approvedDays: 0
                };
            }
            
            requesterStats[request.userId].totalRequests++;
            requesterStats[request.userId].totalDays += request.days || 0;
            
            if (request.status === 'approved') {
                requesterStats[request.userId].approvedDays += request.days || 0;
            }
        });

        const topRequesters = Object.values(requesterStats)
            .sort((a, b) => b.totalDays - a.totalDays)
            .slice(0, 5);

        if (topRequesters.length === 0) {
            return '<p class="text-muted">No data available</p>';
        }

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Requests</th>
                            <th>Total Days</th>
                            <th>Approved Days</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topRequesters.map(requester => `
                            <tr>
                                <td>
                                    <div>
                                        <strong>${requester.name}</strong><br>
                                        <small class="text-muted">${requester.email}</small>
                                    </div>
                                </td>
                                <td>${requester.totalRequests}</td>
                                <td>${requester.totalDays}</td>
                                <td>${requester.approvedDays}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderDepartmentStats() {
        const departmentStats = {};
        
        this.reportData.employees.forEach(employee => {
            const dept = employee.department || 'Unknown';
            if (!departmentStats[dept]) {
                departmentStats[dept] = {
                    employees: 0,
                    requests: 0,
                    totalDays: 0
                };
            }
            departmentStats[dept].employees++;
        });

        this.reportData.leaveRequests.forEach(request => {
            const dept = request.department || 'Unknown';
            if (departmentStats[dept]) {
                departmentStats[dept].requests++;
                departmentStats[dept].totalDays += request.days || 0;
            }
        });

        const departments = Object.entries(departmentStats)
            .sort((a, b) => b[1].totalDays - a[1].totalDays);

        if (departments.length === 0) {
            return '<p class="text-muted">No data available</p>';
        }

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Department</th>
                            <th>Employees</th>
                            <th>Requests</th>
                            <th>Total Days</th>
                            <th>Avg Days/Employee</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${departments.map(([dept, stats]) => `
                            <tr>
                                <td><strong>${dept}</strong></td>
                                <td>${stats.employees}</td>
                                <td>${stats.requests}</td>
                                <td>${stats.totalDays}</td>
                                <td>${stats.employees > 0 ? (stats.totalDays / stats.employees).toFixed(1) : 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderCharts() {
        this.renderStatusChart();
        this.renderLeaveTypesChart();
        this.renderDepartmentChart();
        this.renderMonthlyChart();
    }

    renderStatusChart() {
        const ctx = document.getElementById('status-chart')?.getContext('2d');
        if (!ctx) return;

        if (this.charts.statusChart) {
            this.charts.statusChart.destroy();
        }

        this.charts.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Approved', 'Pending', 'Rejected'],
                datasets: [{
                    data: [
                        this.reportData.approvedRequests,
                        this.reportData.pendingRequests,
                        this.reportData.rejectedRequests
                    ],
                    backgroundColor: ['#27ae60', '#f39c12', '#e74c3c'],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderLeaveTypesChart() {
        const ctx = document.getElementById('leave-types-chart')?.getContext('2d');
        if (!ctx) return;

        const leaveTypeCounts = {};
        this.reportData.leaveRequests.forEach(request => {
            leaveTypeCounts[request.leaveType] = (leaveTypeCounts[request.leaveType] || 0) + 1;
        });

        if (this.charts.leaveTypesChart) {
            this.charts.leaveTypesChart.destroy();
        }

        this.charts.leaveTypesChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(leaveTypeCounts),
                datasets: [{
                    data: Object.values(leaveTypeCounts),
                    backgroundColor: [
                        '#3498db', '#e74c3c', '#f39c12', '#e91e63', '#9c27b0', '#607d8b'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderDepartmentChart() {
        const ctx = document.getElementById('department-chart')?.getContext('2d');
        if (!ctx) return;

        const departmentCounts = {};
        this.reportData.leaveRequests.forEach(request => {
            const dept = request.department || 'Unknown';
            departmentCounts[dept] = (departmentCounts[dept] || 0) + 1;
        });

        if (this.charts.departmentChart) {
            this.charts.departmentChart.destroy();
        }

        this.charts.departmentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(departmentCounts),
                datasets: [{
                    label: 'Number of Requests',
                    data: Object.values(departmentCounts),
                    backgroundColor: '#1B7B9C',
                    borderColor: '#155a73',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    renderMonthlyChart() {
        const ctx = document.getElementById('monthly-chart')?.getContext('2d');
        if (!ctx) return;

        const monthlyData = {};
        const currentYear = new Date().getFullYear();
        
        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = 0;
        }

        this.reportData.leaveRequests.forEach(request => {
            if (request.createdAt) {
                const monthKey = `${request.createdAt.getFullYear()}-${String(request.createdAt.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyData.hasOwnProperty(monthKey)) {
                    monthlyData[monthKey]++;
                }
            }
        });

        if (this.charts.monthlyChart) {
            this.charts.monthlyChart.destroy();
        }

        this.charts.monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Object.keys(monthlyData).map(key => {
                    const [year, month] = key.split('-');
                    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short' });
                }),
                datasets: [{
                    label: 'Requests',
                    data: Object.values(monthlyData),
                    borderColor: '#1B7B9C',
                    backgroundColor: 'rgba(27, 123, 156, 0.1)',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    setupEventListeners() {
        const periodSelect = document.getElementById('report-period');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.filterByPeriod(e.target.value);
            });
        }
    }

    filterByPeriod(period) {
        // Filter data based on selected period
        // This would filter this.reportData based on the period
        // For now, we'll just reload the charts
        this.renderCharts();
        Utils.showToast(`Reports filtered for: ${period}`, 'info');
    }

    getPercentage(value, total) {
        return total > 0 ? Math.round((value / total) * 100) : 0;
    }

    exportReport(type) {
        if (type === 'summary') {
            this.exportSummaryReport();
        } else {
            this.exportDetailedReport();
        }
    }

    exportSummaryReport() {
        const summaryData = [{
            'Total Requests': this.reportData.totalRequests,
            'Approved Requests': this.reportData.approvedRequests,
            'Pending Requests': this.reportData.pendingRequests,
            'Rejected Requests': this.reportData.rejectedRequests,
            'Approval Rate': `${this.getPercentage(this.reportData.approvedRequests, this.reportData.totalRequests)}%`,
            'Rejection Rate': `${this.getPercentage(this.reportData.rejectedRequests, this.reportData.totalRequests)}%`,
            'Total Employees': this.reportData.employees.length,
            'Generated On': Utils.formatDateTime(new Date())
        }];

        const filename = `leave-summary-report-${Utils.formatDate(new Date())}.csv`;
        Utils.exportToCSV(summaryData, filename);
    }

    exportDetailedReport() {
        const detailedData = this.reportData.leaveRequests.map(request => ({
            'Request ID': request.id,
            'Employee Name': request.userName,
            'Employee Email': request.userEmail,
            'Department': request.department || 'N/A',
            'Leave Type': request.leaveType,
            'Start Date': Utils.formatDate(request.startDate),
            'End Date': Utils.formatDate(request.endDate),
            'Days': request.days || 0,
            'Status': request.status,
            'Reason': request.reason || '',
            'Submitted On': Utils.formatDateTime(request.createdAt),
            'Approved By': request.approvedBy || '',
            'Approved On': request.approvedAt ? Utils.formatDateTime(request.approvedAt) : '',
            'Rejected By': request.rejectedBy || '',
            'Rejected On': request.rejectedAt ? Utils.formatDateTime(request.rejectedAt) : '',
            'Rejection Reason': request.rejectionReason || ''
        }));

        const filename = `leave-detailed-report-${Utils.formatDate(new Date())}.csv`;
        Utils.exportToCSV(detailedData, filename);
    }
}

// Global controller instance
window.reportsController = new ReportsController();