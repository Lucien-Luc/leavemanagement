// Calendar Controller
class CalendarController {
    constructor() {
        this.currentDate = new Date();
        this.currentMonth = this.currentDate.getMonth();
        this.currentYear = this.currentDate.getFullYear();
        this.leaveRequests = [];
        this.holidays = [];
    }

    async init() {
        try {
            await this.loadData();
            this.renderCalendar();
            this.setupEventListeners();
        } catch (error) {
            console.error('Calendar initialization failed:', error);
            Utils.showToast('Failed to load calendar', 'error');
        }
    }

    async loadData() {
        await Promise.all([
            this.loadLeaveRequests(),
            this.loadHolidays()
        ]);
    }

    async loadLeaveRequests() {
        try {
            const user = authService.getCurrentUser();
            
            // Load approved leave requests for the current year
            const startOfYear = new Date(this.currentYear, 0, 1);
            const endOfYear = new Date(this.currentYear, 11, 31);

            const leaveRequestsSnapshot = await db.collection('leave_requests')
                .where('userId', '==', user.id)
                .where('status', '==', 'approved')
                .where('startDate', '>=', startOfYear)
                .where('startDate', '<=', endOfYear)
                .get();

            this.leaveRequests = leaveRequestsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startDate: doc.data().startDate?.toDate(),
                endDate: doc.data().endDate?.toDate()
            }));

        } catch (error) {
            console.error('Error loading leave requests:', error);
            this.leaveRequests = [];
        }
    }

    async loadHolidays() {
        try {
            // Load company holidays for the current year
            const startOfYear = new Date(this.currentYear, 0, 1);
            const endOfYear = new Date(this.currentYear, 11, 31);

            const holidaysSnapshot = await db.collection('company_holidays')
                .where('date', '>=', startOfYear)
                .where('date', '<=', endOfYear)
                .orderBy('date')
                .get();

            this.holidays = holidaysSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate()
            }));

        } catch (error) {
            console.error('Error loading holidays:', error);
            this.holidays = [];
        }
    }

    setupEventListeners() {
        // Previous month button
        const prevBtn = document.getElementById('prev-month');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousMonth());
        }

        // Next month button
        const nextBtn = document.getElementById('next-month');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextMonth());
        }

        // Today button
        const todayBtn = document.getElementById('today-btn');
        if (todayBtn) {
            todayBtn.addEventListener('click', () => this.goToToday());
        }

        // View toggle buttons
        const monthViewBtn = document.getElementById('month-view-btn');
        const listViewBtn = document.getElementById('list-view-btn');
        
        if (monthViewBtn && listViewBtn) {
            monthViewBtn.addEventListener('click', () => this.switchToMonthView());
            listViewBtn.addEventListener('click', () => this.switchToListView());
        }
    }

    renderCalendar() {
        this.updateCalendarHeader();
        this.renderCalendarGrid();
        this.renderUpcomingEvents();
        this.renderLeavesSummary();
    }

    updateCalendarHeader() {
        const calendarTitle = document.getElementById('calendar-title');
        if (calendarTitle) {
            const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
            ];
            calendarTitle.textContent = `${monthNames[this.currentMonth]} ${this.currentYear}`;
        }
    }

    renderCalendarGrid() {
        const calendarGrid = document.getElementById('calendar-grid');
        if (!calendarGrid) return;

        // Clear existing grid
        calendarGrid.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        dayHeaders.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day-header';
            dayHeader.textContent = day;
            dayHeader.style.cssText = `
                background: var(--primary-blue);
                color: white;
                padding: 1rem;
                text-align: center;
                font-weight: 600;
            `;
            calendarGrid.appendChild(dayHeader);
        });

        // Get first day of month and number of days
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        // Add empty cells for days before month starts
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(this.currentYear, this.currentMonth, day);
            const dayElement = this.createDayElement(day, currentDate);
            calendarGrid.appendChild(dayElement);
        }

        // Update grid template to accommodate headers
        calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
    }

    createDayElement(day, date) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        // Check if this day has any events
        const dayLeaves = this.getLeavesForDate(date);
        const dayHolidays = this.getHolidaysForDate(date);
        
        // Add classes based on content
        if (dayLeaves.length > 0) {
            dayElement.classList.add('has-leave');
        }
        
        if (dayHolidays.length > 0) {
            dayElement.classList.add('has-holiday');
        }

        // Check if it's today
        const today = new Date();
        if (date.toDateString() === today.toDateString()) {
            dayElement.classList.add('today');
        }

        // Build day content
        let dayContent = `<div class="calendar-day-number">${day}</div>`;

        // Add holidays
        dayHolidays.forEach(holiday => {
            dayContent += `<div class="calendar-holiday" style="background: var(--danger); color: white; font-size: 0.75rem; padding: 0.25rem; border-radius: 4px; margin-bottom: 0.25rem;">${holiday.name}</div>`;
        });

        // Add leaves
        dayLeaves.forEach(leave => {
            const color = Utils.getLeaveTypeColor(leave.leaveType);
            dayContent += `<div class="calendar-leave" style="background: ${color}; color: white; font-size: 0.75rem; padding: 0.25rem; border-radius: 4px; margin-bottom: 0.25rem;">${Utils.capitalize(leave.leaveType)}</div>`;
        });

        dayElement.innerHTML = dayContent;

        // Add click handler for day details
        dayElement.addEventListener('click', () => this.showDayDetails(date, dayLeaves, dayHolidays));

        return dayElement;
    }

    getLeavesForDate(date) {
        return this.leaveRequests.filter(leave => {
            return date >= leave.startDate && date <= leave.endDate;
        });
    }

    getHolidaysForDate(date) {
        return this.holidays.filter(holiday => {
            return holiday.date.toDateString() === date.toDateString();
        });
    }

    showDayDetails(date, leaves, holidays) {
        if (leaves.length === 0 && holidays.length === 0) {
            return;
        }

        let content = `<h4>${Utils.formatDate(date)}</h4>`;

        if (holidays.length > 0) {
            content += '<h5>Holidays:</h5><ul>';
            holidays.forEach(holiday => {
                content += `<li>${holiday.name}</li>`;
            });
            content += '</ul>';
        }

        if (leaves.length > 0) {
            content += '<h5>Your Leaves:</h5><ul>';
            leaves.forEach(leave => {
                content += `<li>${Utils.capitalize(leave.leaveType)} Leave${leave.reason ? ` - ${leave.reason}` : ''}</li>`;
            });
            content += '</ul>';
        }

        // Show in a simple alert for now (could be enhanced with a modal)
        Utils.showToast(content, 'info', 10000);
    }

    renderUpcomingEvents() {
        const upcomingContainer = document.getElementById('upcoming-events');
        if (!upcomingContainer) return;

        const today = new Date();
        const upcomingLeaves = this.leaveRequests.filter(leave => leave.startDate > today).slice(0, 5);
        const upcomingHolidays = this.holidays.filter(holiday => holiday.date > today).slice(0, 5);

        let content = '<div class="card"><div class="card-header"><h4 class="card-title">Upcoming Events</h4></div>';

        if (upcomingLeaves.length === 0 && upcomingHolidays.length === 0) {
            content += '<div style="padding: 2rem; text-align: center;"><p>No upcoming events</p></div>';
        } else {
            content += '<div style="padding: 1rem;">';

            if (upcomingHolidays.length > 0) {
                content += '<h5>Upcoming Holidays</h5>';
                upcomingHolidays.forEach(holiday => {
                    const daysUntil = Math.ceil((holiday.date - today) / (1000 * 60 * 60 * 24));
                    content += `
                        <div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid var(--light-grey);">
                            <span>${holiday.name}</span>
                            <span style="color: var(--medium-grey);">${Utils.formatDate(holiday.date)} (${daysUntil} days)</span>
                        </div>
                    `;
                });
            }

            if (upcomingLeaves.length > 0) {
                content += '<h5 style="margin-top: 1rem;">Your Upcoming Leaves</h5>';
                upcomingLeaves.forEach(leave => {
                    const daysUntil = Math.ceil((leave.startDate - today) / (1000 * 60 * 60 * 24));
                    content += `
                        <div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid var(--light-grey);">
                            <span>${Utils.capitalize(leave.leaveType)} Leave</span>
                            <span style="color: var(--medium-grey);">${Utils.formatDate(leave.startDate)} (${daysUntil} days)</span>
                        </div>
                    `;
                });
            }

            content += '</div>';
        }

        content += '</div>';
        upcomingContainer.innerHTML = content;
    }

    renderLeavesSummary() {
        const summaryContainer = document.getElementById('leaves-summary');
        if (!summaryContainer) return;

        // Calculate leave statistics for current year
        const thisYearLeaves = this.leaveRequests.filter(leave => 
            leave.startDate.getFullYear() === this.currentYear
        );

        const leaveStats = {};
        thisYearLeaves.forEach(leave => {
            if (!leaveStats[leave.leaveType]) {
                leaveStats[leave.leaveType] = 0;
            }
            leaveStats[leave.leaveType] += leave.days;
        });

        let content = '<div class="card"><div class="card-header"><h4 class="card-title">Leave Summary - ' + this.currentYear + '</h4></div>';

        if (Object.keys(leaveStats).length === 0) {
            content += '<div style="padding: 2rem; text-align: center;"><p>No approved leaves this year</p></div>';
        } else {
            content += '<div class="row" style="padding: 1rem;">';
            
            Object.entries(leaveStats).forEach(([type, days]) => {
                const color = Utils.getLeaveTypeColor(type);
                content += `
                    <div class="col-md-4">
                        <div style="text-align: center; padding: 1rem; border-left: 4px solid ${color};">
                            <div style="font-size: 2rem; font-weight: bold; color: ${color};">${days}</div>
                            <div style="color: var(--medium-grey); text-transform: uppercase; font-size: 0.875rem;">${type} Days Used</div>
                        </div>
                    </div>
                `;
            });

            content += '</div>';
        }

        content += '</div>';
        summaryContainer.innerHTML = content;
    }

    previousMonth() {
        this.currentMonth--;
        if (this.currentMonth < 0) {
            this.currentMonth = 11;
            this.currentYear--;
        }
        this.loadData().then(() => this.renderCalendar());
    }

    nextMonth() {
        this.currentMonth++;
        if (this.currentMonth > 11) {
            this.currentMonth = 0;
            this.currentYear++;
        }
        this.loadData().then(() => this.renderCalendar());
    }

    goToToday() {
        const today = new Date();
        this.currentMonth = today.getMonth();
        this.currentYear = today.getFullYear();
        this.loadData().then(() => this.renderCalendar());
    }

    switchToMonthView() {
        document.getElementById('calendar-view').style.display = 'block';
        document.getElementById('list-view').style.display = 'none';
        
        document.getElementById('month-view-btn').classList.add('active');
        document.getElementById('list-view-btn').classList.remove('active');
    }

    switchToListView() {
        document.getElementById('calendar-view').style.display = 'none';
        document.getElementById('list-view').style.display = 'block';
        
        document.getElementById('month-view-btn').classList.remove('active');
        document.getElementById('list-view-btn').classList.add('active');
        
        this.renderListView();
    }

    renderListView() {
        const listContainer = document.getElementById('list-view-content');
        if (!listContainer) return;

        // Combine and sort all events
        const allEvents = [];

        // Add leaves
        this.leaveRequests.forEach(leave => {
            allEvents.push({
                type: 'leave',
                date: leave.startDate,
                endDate: leave.endDate,
                title: `${Utils.capitalize(leave.leaveType)} Leave`,
                description: leave.reason,
                days: leave.days,
                color: Utils.getLeaveTypeColor(leave.leaveType)
            });
        });

        // Add holidays
        this.holidays.forEach(holiday => {
            allEvents.push({
                type: 'holiday',
                date: holiday.date,
                title: holiday.name,
                description: holiday.description || '',
                color: '#DC3545'
            });
        });

        // Sort by date
        allEvents.sort((a, b) => a.date - b.date);

        if (allEvents.length === 0) {
            listContainer.innerHTML = `
                <div class="card">
                    <div style="padding: 3rem; text-align: center;">
                        <i class="fas fa-calendar" style="font-size: 3rem; color: var(--medium-grey); margin-bottom: 1rem;"></i>
                        <h4>No events found</h4>
                        <p>No leaves or holidays found for ${this.currentYear}</p>
                    </div>
                </div>
            `;
            return;
        }

        const eventItems = allEvents.map(event => {
            let dateText = Utils.formatDate(event.date);
            if (event.endDate && event.endDate.getTime() !== event.date.getTime()) {
                dateText += ` - ${Utils.formatDate(event.endDate)}`;
            }

            return `
                <div class="card" style="margin-bottom: 1rem; border-left: 4px solid ${event.color};">
                    <div style="padding: 1rem;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div style="flex: 1;">
                                <h5 style="margin-bottom: 0.5rem; color: ${event.color};">${event.title}</h5>
                                <p style="color: var(--medium-grey); margin-bottom: 0.5rem;">${dateText}</p>
                                ${event.description ? `<p style="margin-bottom: 0;">${event.description}</p>` : ''}
                            </div>
                            ${event.days ? `<div style="text-align: right;"><strong>${event.days} days</strong></div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = eventItems;
    }

    async refresh() {
        await this.loadData();
        this.renderCalendar();
    }
}

// Initialize calendar controller
const calendarController = new CalendarController();
window.calendarController = calendarController;
