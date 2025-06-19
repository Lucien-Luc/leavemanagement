// HR Reports Controller
class ReportsController {
    constructor() {
        this.reportData = {};
        this.charts = {};
    }

    async init() {
        try {
            await this.loadReportData();
            this.renderReports();
            this.setupEventListeners();
        } catch (error) {
            console.error('Reports initialization failed:', error);
            Utils.showToast('Failed to load reports', 'error');
        }
    }

    async loadReportData() {
        try {
            // Load employees data
            const usersSnapshot = await db.collection('users').get();
            const employees = usersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).filter(user => !user.isHR);

            // Load leave requests data
            const requestsSnapshot = await db.collection('leave_requests').get();
            const leaveRequests = requestsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startDate: doc.data().startDate.toDate(),
                endDate: doc.data().endDate.toDate(),
                createdAt: doc.data().createdAt.toDate()
            }));

            this.reportData = {
                employees,
                leaveRequests,
                totalEmployees: employees.length,
                activeEmployees: employees.filter(emp => emp.isActive !== false).length,
                totalRequests: leaveRequests.length,
                pendingRequests: leaveRequests.filter(req => req.status === 'pending').length,
                approvedRequests: leaveRequests.filter(req => req.status === 'approved').length,
                rejectedRequests: leaveRequests.filter(req => req.status === 'rejected').length
            };

            this.calculateAdvancedMetrics();
        } catch (error) {
            console.error('Error loading report data:', error);
            throw error;
        }
    }

    calculateAdvancedMetrics() {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        
        // Department-wise statistics
        this.reportData.departmentStats = this.groupByDepartment();
        
        // Monthly trends
        this.reportData.monthlyTrends = this.calculateMonthlyTrends(currentYear);
        
        // Leave type statistics
        this.reportData.leaveTypeStats = this.calculateLeaveTypeStats();
        
        // Employee utilization
        this.reportData.employeeUtilization = this.calculateEmployeeUtilization();
        
        // Upcoming leaves
        this.reportData.upcomingLeaves = this.getUpcomingLeaves();
    }

    groupByDepartment() {
        const departments = {};
        
        this.reportData.employees.forEach(employee => {
            const dept = employee.department || 'Unassigned';
            if (!departments[dept]) {
                departments[dept] = {
                    totalEmployees: 0,
                    activeEmployees: 0,
                    totalRequests: 0,
                    pendingRequests: 0,
                    approvedRequests: 0
                };
            }
            departments[dept].totalEmployees++;
            if (employee.isActive !== false) {
                departments[dept].activeEmployees++;
            }
        });

        this.reportData.leaveRequests.forEach(request => {
            const dept = request.department || 'Unassigned';
            if (departments[dept]) {
                departments[dept].totalRequests++;
                if (request.status === 'pending') departments[dept].pendingRequests++;
                if (request.status === 'approved') departments[dept].approvedRequests++;
            }
        });

        return departments;
    }

    calculateMonthlyTrends(year) {
        const months = Array.from({length: 12}, (_, i) => ({
            month: i,
            name: new Date(year, i, 1).toLocaleDateString('en-US', { month: 'long' }),
            requests: 0,
            approvedDays: 0
        }));

        this.reportData.leaveRequests.forEach(request => {
            if (request.createdAt.getFullYear() === year) {
                const monthIndex = request.createdAt.getMonth();
                months[monthIndex].requests++;
                if (request.status === 'approved') {
                    months[monthIndex].approvedDays += request.days || 0;
                }
            }
        });

        return months;
    }

    calculateLeaveTypeStats() {
        const leaveTypes = {};
        
        this.reportData.leaveRequests.forEach(request => {
            const type = request.leaveType;
            if (!leaveTypes[type]) {
                leaveTypes[type] = {
                    total: 0,
                    approved: 0,
                    pending: 0,
                    rejected: 0,
                    totalDays: 0,
                    approvedDays: 0
                };
            }
            
            leaveTypes[type].total++;
            leaveTypes[type].totalDays += request.days || 0;
            
            if (request.status === 'approved') {
                leaveTypes[type].approved++;
                leaveTypes[type].approvedDays += request.days || 0;
            } else if (request.status === 'pending') {
                leaveTypes[type].pending++;
            } else if (request.status === 'rejected') {
                leaveTypes[type].rejected++;
            }
        });

        return leaveTypes;
    }

    calculateEmployeeUtilization() {
        const utilization = this.reportData.employees.map(employee => {
            const employeeRequests = this.reportData.leaveRequests.filter(req => req.userId === employee.id);
            const approvedRequests = employeeRequests.filter(req => req.status === 'approved');
            const totalDaysUsed = approvedRequests.reduce((sum, req) => sum + (req.days || 0), 0);
            
            return {
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`,
                department: employee.department,
                totalRequests: employeeRequests.length,
                approvedRequests: approvedRequests.length,
                totalDaysUsed,
                utilizationRate: totalDaysUsed / (employee.leaveBalances?.vacation || 20) * 100
            };
        });

        return utilization.sort((a, b) => b.utilizationRate - a.utilizationRate);
    }

    getUpcomingLeaves() {
        const today = new Date();
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
        
        return this.reportData.leaveRequests
            .filter(request => 
                request.status === 'approved' && 
                request.startDate >= today && 
                request.startDate <= nextMonth
            )
            .sort((a, b) => a.startDate - b.startDate);
    }

    renderReports() {
        const mainContent = document.getElementById('main-content');
        
        mainContent.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Reports & Analytics</h1>
                <p class="page-subtitle">Comprehensive leave management analytics</p>
            </div>

            <!-- Summary Stats -->
            <div class="stats-grid mb-3">
                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon primary">
                            <i class="fas fa-users"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.reportData.activeEmployees}</div>
                    <div class="stat-label">Active Employees</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon success">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.reportData.approvedRequests}</div>
                    <div class="stat-label">Approved Requests</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon warning">
                            <i class="fas fa-clock"></i>
                        </div>
                    </div>
                    <div class="stat-value">${this.reportData.pendingRequests}</div>
                    <div class="stat-label">Pending Requests</div>
                </div>

                <div class="stat-card">
                    <div class="stat-header">
                        <div class="stat-icon info">
                            <i class="fas fa-chart-line"></i>
                        </div>
                    </div>
                    <div class="stat-value">${Math.round((this.reportData.approvedRequests / this.reportData.totalRequests) * 100)}%</div>
                    <div class="stat-label">Approval Rate</div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="row mb-3">
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Monthly Leave Trends</h3>
                        </div>
                        <div class="card-body">
                            <canvas id="monthlyTrendsChart" height="300"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">Leave Types Distribution</h3>
                        </div>
                        <div class="card-body">
                            <canvas id="leaveTypesChart" height="300"></canvas>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Department Stats -->
            <div class="card mb-3">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h3 class="card-title">Department-wise Statistics</h3>
                        <button class="btn btn-outline btn-sm" onclick="reportsController.exportDepartmentStats()">
                            <i class="fas fa-download"></i>
                            Export
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${this.renderDepartmentStats()}
                </div>
            </div>

            <!-- Employee Utilization -->
            <div class="card mb-3">
                <div class="card-header">
                    <div class="d-flex justify-content-between align-items-center">
                        <h3 class="card-title">Top Employee Leave Utilization</h3>
                        <button class="btn btn-outline btn-sm" onclick="reportsController.exportUtilizationReport()">
                            <i class="fas fa-download"></i>
                            Export
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    ${this.renderEmployeeUtilization()}
                </div>
            </div>

            <!-- Upcoming Leaves -->
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">Upcoming Leaves (Next 30 Days)</h3>
                </div>
                <div class="card-body">
                    ${this.renderUpcomingLeaves()}
                </div>
            </div>
        `;

        // Render charts after DOM is ready
        setTimeout(() => {
            this.renderCharts();
        }, 100);
    }

    renderDepartmentStats() {
        const departments = Object.entries(this.reportData.departmentStats);
        
        if (departments.length === 0) {
            return '<p class="text-muted">No department data available</p>';
        }

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Department</th>
                            <th>Total Employees</th>
                            <th>Active Employees</th>
                            <th>Total Requests</th>
                            <th>Pending</th>
                            <th>Approved</th>
                            <th>Approval Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${departments.map(([dept, stats]) => `
                            <tr>
                                <td><strong>${dept}</strong></td>
                                <td>${stats.totalEmployees}</td>
                                <td>${stats.activeEmployees}</td>
                                <td>${stats.totalRequests}</td>
                                <td>${stats.pendingRequests}</td>
                                <td>${stats.approvedRequests}</td>
                                <td>
                                    ${stats.totalRequests > 0 ? 
                                        Math.round((stats.approvedRequests / stats.totalRequests) * 100) + '%' : 
                                        'N/A'
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderEmployeeUtilization() {
        const topEmployees = this.reportData.employeeUtilization.slice(0, 10);
        
        if (topEmployees.length === 0) {
            return '<p class="text-muted">No utilization data available</p>';
        }

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Total Requests</th>
                            <th>Approved</th>
                            <th>Days Used</th>
                            <th>Utilization Rate</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topEmployees.map(emp => `
                            <tr>
                                <td><strong>${emp.name}</strong></td>
                                <td>${emp.department || 'N/A'}</td>
                                <td>${emp.totalRequests}</td>
                                <td>${emp.approvedRequests}</td>
                                <td>${emp.totalDaysUsed}</td>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <div class="progress" style="width: 100px; height: 20px; margin-right: 10px;">
                                            <div class="progress-bar" style="width: ${Math.min(emp.utilizationRate, 100)}%; background-color: ${emp.utilizationRate > 80 ? '#e74c3c' : emp.utilizationRate > 60 ? '#f39c12' : '#27ae60'};"></div>
                                        </div>
                                        ${Math.round(emp.utilizationRate)}%
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderUpcomingLeaves() {
        if (this.reportData.upcomingLeaves.length === 0) {
            return '<p class="text-muted">No upcoming leaves in the next 30 days</p>';
        }

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Leave Type</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Days</th>
                            <th>Department</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.reportData.upcomingLeaves.map(leave => `
                            <tr>
                                <td><strong>${leave.userName}</strong></td>
                                <td><span class="badge badge-info">${leave.leaveType}</span></td>
                                <td>${Utils.formatDate(leave.startDate)}</td>
                                <td>${Utils.formatDate(leave.endDate)}</td>
                                <td><strong>${leave.days}</strong></td>
                                <td>${leave.department || 'N/A'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderCharts() {
        this.renderMonthlyTrendsChart();
        this.renderLeaveTypesChart();
    }

    renderMonthlyTrendsChart() {
        const ctx = document.getElementById('monthlyTrendsChart');
        if (!ctx) return;

        const data = this.reportData.monthlyTrends;

        this.charts.monthlyTrends = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.name),
                datasets: [{
                    label: 'Leave Requests',
                    data: data.map(d => d.requests),
                    borderColor: 'var(--primary-color)',
                    backgroundColor: 'rgba(27, 123, 156, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Approved Days',
                    data: data.map(d => d.approvedDays),
                    borderColor: 'var(--success-color)',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: 'Number of Requests'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Days Approved'
                        },
                        grid: {
                            drawOnChartArea: false,
                        },
                    }
                }
            }
        });
    }

    renderLeaveTypesChart() {
        const ctx = document.getElementById('leaveTypesChart');
        if (!ctx) return;

        const leaveTypes = Object.entries(this.reportData.leaveTypeStats);
        
        this.charts.leaveTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: leaveTypes.map(([type, _]) => type.charAt(0).toUpperCase() + type.slice(1)),
                datasets: [{
                    data: leaveTypes.map(([_, stats]) => stats.approved),
                    backgroundColor: [
                        '#3498db',
                        '#e74c3c',
                        '#f39c12',
                        '#e91e63',
                        '#9c27b0',
                        '#4caf50',
                        '#ff9800',
                        '#607d8b'
                    ],
                    borderWidth: 0
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

    setupEventListeners() {
        // Add any interactive elements here
    }

    exportDepartmentStats() {
        const data = Object.entries(this.reportData.departmentStats).map(([dept, stats]) => ({
            'Department': dept,
            'Total Employees': stats.totalEmployees,
            'Active Employees': stats.activeEmployees,
            'Total Requests': stats.totalRequests,
            'Pending Requests': stats.pendingRequests,
            'Approved Requests': stats.approvedRequests,
            'Approval Rate': stats.totalRequests > 0 ? 
                Math.round((stats.approvedRequests / stats.totalRequests) * 100) + '%' : 
                'N/A'
        }));

        Utils.exportToCSV(data, `department_stats_${Utils.formatDate(new Date())}.csv`);
    }

    exportUtilizationReport() {
        const data = this.reportData.employeeUtilization.map(emp => ({
            'Employee Name': emp.name,
            'Department': emp.department || 'N/A',
            'Total Requests': emp.totalRequests,
            'Approved Requests': emp.approvedRequests,
            'Total Days Used': emp.totalDaysUsed,
            'Utilization Rate': Math.round(emp.utilizationRate) + '%'
        }));

        Utils.exportToCSV(data, `employee_utilization_${Utils.formatDate(new Date())}.csv`);
    }

    destroy() {
        // Clean up charts
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};
    }
}