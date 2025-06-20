// Manager Reports Controller
class ManagerReportsController {
    constructor() {
        this.reportData = {};
        this.charts = {};
    }

    async init() {
        try {
            await this.loadReportData();
            this.renderReportsPage();
        } catch (error) {
            console.error('Error initializing reports controller:', error);
            Utils.showToast('Error loading reports data', 'error');
        }
    }

    async loadReportData() {
        const manager = managerAuthService.getCurrentManager();
        if (!manager || !manager.department) {
            throw new Error('Manager department not found');
        }

        // Load employees
        const employees = await departmentsController.getDepartmentEmployees(manager.department);
        
        // Load leave requests for the department
        const requestsSnapshot = await db.collection('leave_requests')
            .where('department', '==', manager.department)
            .get();

        const leaveRequests = requestsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        this.reportData = {
            employees,
            leaveRequests,
            departmentStats: this.calculateDepartmentStats(employees, leaveRequests)
        };
    }

    calculateDepartmentStats(employees, leaveRequests) {
        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(emp => emp.isActive).length;
        
        const requestsByStatus = {
            pending: leaveRequests.filter(req => req.status === 'pending').length,
            managerApproved: leaveRequests.filter(req => req.status === 'manager_approved').length,
            approved: leaveRequests.filter(req => req.status === 'approved').length,
            rejected: leaveRequests.filter(req => req.status === 'rejected').length
        };

        const requestsByType = {};
        leaveRequests.forEach(req => {
            requestsByType[req.leaveType] = (requestsByType[req.leaveType] || 0) + 1;
        });

        const thisMonth = new Date();
        thisMonth.setDate(1);
        const requestsThisMonth = leaveRequests.filter(req => {
            const reqDate = req.createdAt?.toDate() || new Date(0);
            return reqDate >= thisMonth;
        }).length;

        return {
            totalEmployees,
            activeEmployees,
            totalRequests: leaveRequests.length,
            requestsThisMonth,
            requestsByStatus,
            requestsByType
        };
    }

    renderReportsPage() {
        const mainContent = document.getElementById('main-content');
        const manager = managerAuthService.getCurrentManager();
        
        mainContent.innerHTML = `
            <div class="manager-dashboard">
                <div class="dashboard-header">
                    <h1>Department Reports</h1>
                    <p>Analytics and insights for ${manager.department} department</p>
                </div>

                <div class="manager-stats">
                    <div class="manager-stat-card">
                        <h3>Total Employees</h3>
                        <p class="stat-value">${this.reportData.departmentStats.totalEmployees}</p>
                    </div>
                    <div class="manager-stat-card">
                        <h3>Active Employees</h3>
                        <p class="stat-value">${this.reportData.departmentStats.activeEmployees}</p>
                    </div>
                    <div class="manager-stat-card">
                        <h3>Total Requests</h3>
                        <p class="stat-value">${this.reportData.departmentStats.totalRequests}</p>
                    </div>
                    <div class="manager-stat-card">
                        <h3>This Month</h3>
                        <p class="stat-value">${this.reportData.departmentStats.requestsThisMonth}</p>
                    </div>
                </div>

                <div class="reports-grid">
                    <div class="manager-section chart-section">
                        <h2><i class="fas fa-chart-pie"></i> Requests by Status</h2>
                        <canvas id="statusChart" width="400" height="200"></canvas>
                    </div>

                    <div class="manager-section chart-section">
                        <h2><i class="fas fa-chart-bar"></i> Requests by Type</h2>
                        <canvas id="typeChart" width="400" height="200"></canvas>
                    </div>
                </div>

                <div class="manager-section">
                    <h2><i class="fas fa-users"></i> Employee Leave Summary</h2>
                    <div class="employee-summary-table">
                        ${this.renderEmployeeSummary()}
                    </div>
                </div>

                <div class="manager-section">
                    <div class="export-actions">
                        <button class="btn btn-primary" onclick="managerApp.controllers.reports.exportReport('summary')">
                            <i class="fas fa-download"></i> Export Summary Report
                        </button>
                        <button class="btn btn-secondary" onclick="managerApp.controllers.reports.exportReport('detailed')">
                            <i class="fas fa-file-excel"></i> Export Detailed Report
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.renderCharts();
    }

    renderEmployeeSummary() {
        if (this.reportData.employees.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Employees</h3>
                    <p>No employees in this department.</p>
                </div>
            `;
        }

        const tableHeader = `
            <table class="summary-table">
                <thead>
                    <tr>
                        <th>Employee</th>
                        <th>Position</th>
                        <th>Vacation</th>
                        <th>Sick</th>
                        <th>Personal</th>
                        <th>Total Requests</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const tableRows = this.reportData.employees.map(employee => {
            const employeeRequests = this.reportData.leaveRequests.filter(req => req.employeeId === employee.id);
            const totalRequests = employeeRequests.length;
            
            return `
                <tr>
                    <td>
                        <div class="employee-cell">
                            <strong>${employee.firstName} ${employee.lastName}</strong>
                            <small>${employee.employeeId}</small>
                        </div>
                    </td>
                    <td>${employee.position || 'Employee'}</td>
                    <td>${employee.leaveBalances?.vacation || 0} days</td>
                    <td>${employee.leaveBalances?.sick || 0} days</td>
                    <td>${employee.leaveBalances?.personal || 0} days</td>
                    <td>${totalRequests}</td>
                    <td>
                        <span class="status-badge ${employee.isActive ? 'available' : 'inactive'}">
                            ${employee.isActive ? 'Active' : 'Inactive'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');

        return tableHeader + tableRows + '</tbody></table>';
    }

    renderCharts() {
        setTimeout(() => {
            this.renderStatusChart();
            this.renderTypeChart();
        }, 100);
    }

    renderStatusChart() {
        const ctx = document.getElementById('statusChart')?.getContext('2d');
        if (!ctx) return;

        const stats = this.reportData.departmentStats.requestsByStatus;
        
        this.charts.statusChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Manager Approved', 'HR Approved', 'Rejected'],
                datasets: [{
                    data: [stats.pending, stats.managerApproved, stats.approved, stats.rejected],
                    backgroundColor: ['#ffc107', '#17a2b8', '#28a745', '#dc3545'],
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

    renderTypeChart() {
        const ctx = document.getElementById('typeChart')?.getContext('2d');
        if (!ctx) return;

        const typeData = this.reportData.departmentStats.requestsByType;
        const labels = Object.keys(typeData);
        const data = Object.values(typeData);
        
        this.charts.typeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Requests',
                    data: data,
                    backgroundColor: '#007bff',
                    borderColor: '#0056b3',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    exportReport(type) {
        if (type === 'summary') {
            this.exportSummaryReport();
        } else if (type === 'detailed') {
            this.exportDetailedReport();
        }
    }

    exportSummaryReport() {
        const manager = managerAuthService.getCurrentManager();
        const stats = this.reportData.departmentStats;
        
        const data = [
            ['Department Report Summary'],
            ['Department:', manager.department],
            ['Manager:', `${manager.firstName} ${manager.lastName}`],
            ['Report Date:', new Date().toLocaleDateString()],
            [''],
            ['Statistics'],
            ['Total Employees:', stats.totalEmployees],
            ['Active Employees:', stats.activeEmployees],
            ['Total Leave Requests:', stats.totalRequests],
            ['Requests This Month:', stats.requestsThisMonth],
            [''],
            ['Requests by Status'],
            ['Pending:', stats.requestsByStatus.pending],
            ['Manager Approved:', stats.requestsByStatus.managerApproved],
            ['HR Approved:', stats.requestsByStatus.approved],
            ['Rejected:', stats.requestsByStatus.rejected]
        ];

        Utils.exportToCSV(data, `${manager.department}_summary_report_${new Date().toISOString().split('T')[0]}.csv`);
        Utils.showToast('Summary report exported successfully', 'success');
    }

    exportDetailedReport() {
        const manager = managerAuthService.getCurrentManager();
        
        const headers = [
            'Employee ID', 'Employee Name', 'Position', 'Email', 'Status',
            'Vacation Balance', 'Sick Balance', 'Personal Balance',
            'Total Requests', 'Pending Requests', 'Approved Requests', 'Rejected Requests'
        ];

        const data = [headers];
        
        this.reportData.employees.forEach(employee => {
            const employeeRequests = this.reportData.leaveRequests.filter(req => req.employeeId === employee.id);
            const pendingCount = employeeRequests.filter(req => req.status === 'pending').length;
            const approvedCount = employeeRequests.filter(req => req.status === 'approved').length;
            const rejectedCount = employeeRequests.filter(req => req.status === 'rejected').length;
            
            data.push([
                employee.employeeId,
                `${employee.firstName} ${employee.lastName}`,
                employee.position || 'Employee',
                employee.email,
                employee.isActive ? 'Active' : 'Inactive',
                employee.leaveBalances?.vacation || 0,
                employee.leaveBalances?.sick || 0,
                employee.leaveBalances?.personal || 0,
                employeeRequests.length,
                pendingCount,
                approvedCount,
                rejectedCount
            ]);
        });

        Utils.exportToCSV(data, `${manager.department}_detailed_report_${new Date().toISOString().split('T')[0]}.csv`);
        Utils.showToast('Detailed report exported successfully', 'success');
    }
}