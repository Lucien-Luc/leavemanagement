// Sample data creation for testing dashboard functionality
class SampleDataManager {
    constructor() {
        this.sampleRequests = [
            {
                leaveType: 'vacation',
                startDate: new Date('2025-07-01'),
                endDate: new Date('2025-07-05'),
                days: 5,
                reason: 'Summer vacation with family',
                status: 'pending',
                createdAt: new Date('2025-06-15')
            },
            {
                leaveType: 'sick',
                startDate: new Date('2025-06-10'),
                endDate: new Date('2025-06-12'),
                days: 3,
                reason: 'Medical treatment',
                status: 'approved',
                approvedBy: 'HR Manager',
                approvedAt: new Date('2025-06-11'),
                createdAt: new Date('2025-06-09')
            },
            {
                leaveType: 'personal',
                startDate: new Date('2025-05-20'),
                endDate: new Date('2025-05-21'),
                days: 2,
                reason: 'Personal matters',
                status: 'rejected',
                rejectedBy: 'Department Manager',
                rejectionReason: 'Busy period, please reschedule',
                rejectedAt: new Date('2025-05-18'),
                createdAt: new Date('2025-05-15')
            },
            {
                leaveType: 'vacation',
                startDate: new Date('2025-04-15'),
                endDate: new Date('2025-04-19'),
                days: 5,
                reason: 'Easter holidays',
                status: 'approved',
                approvedBy: 'HR Manager',
                approvedAt: new Date('2025-04-10'),
                createdAt: new Date('2025-04-01')
            },
            {
                leaveType: 'personal',
                startDate: new Date('2025-03-25'),
                endDate: new Date('2025-03-25'),
                days: 1,
                reason: 'Family emergency',
                status: 'cancelled',
                cancelledAt: new Date('2025-03-24'),
                createdAt: new Date('2025-03-20')
            }
        ];
    }

    async createSampleDataForUser(userId, userEmail, userName, department) {
        try {
            console.log('Creating sample leave requests for user:', userEmail);
            
            const promises = this.sampleRequests.map(async (request) => {
                const leaveData = {
                    userId: userId,
                    userName: userName,
                    userEmail: userEmail,
                    department: department,
                    leaveType: request.leaveType,
                    startDate: firebase.firestore.Timestamp.fromDate(request.startDate),
                    endDate: firebase.firestore.Timestamp.fromDate(request.endDate),
                    days: Utils.calculateLeaveDays(request.startDate, request.endDate),
                    reason: request.reason,
                    status: request.status,
                    attachments: [],
                    createdAt: firebase.firestore.Timestamp.fromDate(request.createdAt),
                    updatedAt: firebase.firestore.Timestamp.fromDate(request.createdAt)
                };

                // Add status-specific fields
                if (request.status === 'approved') {
                    leaveData.approvedBy = request.approvedBy;
                    leaveData.approvedAt = firebase.firestore.Timestamp.fromDate(request.approvedAt);
                } else if (request.status === 'rejected') {
                    leaveData.rejectedBy = request.rejectedBy;
                    leaveData.rejectionReason = request.rejectionReason;
                    leaveData.rejectedAt = firebase.firestore.Timestamp.fromDate(request.rejectedAt);
                } else if (request.status === 'cancelled') {
                    leaveData.cancelledAt = firebase.firestore.Timestamp.fromDate(request.cancelledAt);
                }

                return db.collection('leave_requests').add(leaveData);
            });

            await Promise.all(promises);
            console.log('Sample leave requests created successfully');
            return true;
        } catch (error) {
            console.error('Error creating sample data:', error);
            return false;
        }
    }

    async checkAndCreateSampleData() {
        try {
            const user = authService.getCurrentUser();
            if (!user) return false;

            // Check if user already has leave requests
            const existingRequests = await db.collection('leave_requests')
                .where('userId', '==', user.id)
                .limit(1)
                .get();

            if (existingRequests.empty) {
                console.log('No existing leave requests found, creating sample data...');
                const userName = `${user.firstName} ${user.lastName}`;
                return await this.createSampleDataForUser(
                    user.id, 
                    user.email, 
                    userName, 
                    user.department || 'General'
                );
            }

            return true;
        } catch (error) {
            console.error('Error checking sample data:', error);
            return false;
        }
    }
}

// Export for global use
window.SampleDataManager = SampleDataManager;