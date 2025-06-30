// Complete workflow test script
// This script will test the entire leave approval workflow

// Test workflow steps:
// 1. Create test manager
// 2. Create test employee under that manager  
// 3. Employee submits leave request
// 4. Manager sees and approves request (status: manager_approved)
// 5. HR sees manager-approved request and confirms it (status: approved)

async function testCompleteWorkflow() {
    console.log('🚀 Starting complete workflow test...');
    
    try {
        // Step 1: Create Test Manager
        console.log('📝 Creating test manager...');
        const managerData = {
            email: 'test.manager@bpn.test',
            password: CryptoJS.SHA256('TestPassword123').toString(),
            firstName: 'Sarah',
            lastName: 'Manager',
            employeeId: 'MGR-2025-001',
            department: 'Engineering',
            position: 'Engineering Manager',
            role: 'manager',
            managerId: null,
            startDate: '2023-01-15',
            leaveBalances: {
                vacation: 30,
                sick: 15,
                personal: 10,
                maternity: 90,
                paternity: 15
            },
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const managerRef = await db.collection('users').add(managerData);
        const managerId = managerRef.id;
        console.log('✅ Test manager created with ID:', managerId);
        
        // Step 2: Create Test Employee
        console.log('📝 Creating test employee...');
        const employeeData = {
            email: 'test.employee@bpn.test',
            password: CryptoJS.SHA256('TestPassword123').toString(),
            firstName: 'John',
            lastName: 'Developer',
            employeeId: 'EMP-2025-001',
            department: 'Engineering',
            position: 'Senior Developer',
            role: 'employee',
            managerId: managerId, // Link to the manager we just created
            startDate: '2024-03-01',
            leaveBalances: {
                vacation: 25,
                sick: 12,
                personal: 8,
                maternity: 90,
                paternity: 15
            },
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const employeeRef = await db.collection('users').add(employeeData);
        const employeeId = employeeRef.id;
        console.log('✅ Test employee created with ID:', employeeId);
        
        // Step 3: Create Leave Request
        console.log('📝 Creating leave request...');
        const leaveRequestData = {
            leaveType: 'vacation',
            startDate: new Date('2025-08-01'),
            endDate: new Date('2025-08-05'),
            reason: 'Summer vacation with family',
            days: 5,
            totalDays: 5,
            status: 'pending',
            userId: employeeId,
            employeeId: employeeData.employeeId,
            employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
            userName: `${employeeData.firstName} ${employeeData.lastName}`,
            employeeEmail: employeeData.email,
            userEmail: employeeData.email,
            department: employeeData.department,
            managerId: managerId, // This is crucial for manager portal filtering
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const leaveRequestRef = await db.collection('leave_requests').add(leaveRequestData);
        const requestId = leaveRequestRef.id;
        console.log('✅ Leave request created with ID:', requestId);
        
        console.log('🎉 Test data created successfully!');
        console.log(`
        📊 Summary:
        - Manager: ${managerData.firstName} ${managerData.lastName} (${managerId})
        - Employee: ${employeeData.firstName} ${employeeData.lastName} (${employeeId})
        - Leave Request: ${requestId} (status: pending)
        
        🔗 Next steps to test:
        1. Login as manager (test.manager@bpn.test) in manager portal
        2. Approve the leave request (should change status to 'manager_approved')
        3. Login as HR user in HR portal  
        4. Confirm the manager-approved request (should change status to 'approved')
        `);
        
        return {
            managerId,
            employeeId, 
            requestId,
            managerEmail: managerData.email,
            employeeEmail: employeeData.email
        };
        
    } catch (error) {
        console.error('❌ Error in workflow test:', error);
        throw error;
    }
}

// Function to test manager approval
async function testManagerApproval(requestId, managerId) {
    console.log('🔄 Testing manager approval...');
    
    try {
        // Get manager data
        const managerDoc = await db.collection('users').doc(managerId).get();
        const manager = managerDoc.data();
        
        // Simulate manager approval
        await db.collection('leave_requests').doc(requestId).update({
            status: 'manager_approved',
            approvedBy: `${manager.firstName} ${manager.lastName}`,
            approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
            managerApproval: {
                managerId: managerId,
                managerName: `${manager.firstName} ${manager.lastName}`,
                approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                comments: 'Approved by manager - test'
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ Manager approval completed for request:', requestId);
        
    } catch (error) {
        console.error('❌ Error in manager approval test:', error);
        throw error;
    }
}

// Function to test HR confirmation
async function testHRConfirmation(requestId) {
    console.log('🔄 Testing HR confirmation...');
    
    try {
        // Create test HR user if needed
        let hrUser = null;
        const hrQuery = await db.collection('users')
            .where('email', '==', 'test.hr@bpn.test')
            .limit(1)
            .get();
            
        if (hrQuery.empty) {
            console.log('📝 Creating test HR user...');
            const hrData = {
                email: 'test.hr@bpn.test',
                password: CryptoJS.SHA256('TestPassword123').toString(),
                firstName: 'Alice',
                lastName: 'HR',
                employeeId: 'HR-2025-001',
                department: 'HR',
                position: 'HR Manager',
                role: 'hr',
                managerId: null,
                startDate: '2023-01-01',
                leaveBalances: {
                    vacation: 30,
                    sick: 15,
                    personal: 10,
                    maternity: 90,
                    paternity: 15
                },
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            const hrRef = await db.collection('users').add(hrData);
            hrUser = { id: hrRef.id, ...hrData };
            console.log('✅ Test HR user created');
        } else {
            hrUser = { id: hrQuery.docs[0].id, ...hrQuery.docs[0].data() };
        }
        
        // Simulate HR confirmation
        await db.collection('leave_requests').doc(requestId).update({
            status: 'approved',
            hrApproval: {
                hrId: hrUser.id,
                hrName: `${hrUser.firstName} ${hrUser.lastName}`,
                confirmedAt: firebase.firestore.FieldValue.serverTimestamp(),
                comments: 'Confirmed by HR - test'
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log('✅ HR confirmation completed for request:', requestId);
        
    } catch (error) {
        console.error('❌ Error in HR confirmation test:', error);
        throw error;
    }
}

// Function to clean up test data
async function cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
    
    try {
        // Delete test users
        const testEmails = [
            'test.manager@bpn.test',
            'test.employee@bpn.test', 
            'test.hr@bpn.test'
        ];
        
        for (const email of testEmails) {
            const userQuery = await db.collection('users').where('email', '==', email).get();
            for (const doc of userQuery.docs) {
                await doc.ref.delete();
                console.log('🗑️ Deleted user:', email);
            }
        }
        
        // Delete test leave requests
        const requestQuery = await db.collection('leave_requests')
            .where('userEmail', 'in', testEmails)
            .get();
            
        for (const doc of requestQuery.docs) {
            await doc.ref.delete();
            console.log('🗑️ Deleted leave request:', doc.id);
        }
        
        console.log('✅ Cleanup completed');
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    }
}

// Complete workflow test function
async function runCompleteWorkflowTest() {
    try {
        // Step 1: Create test data
        const testData = await testCompleteWorkflow();
        
        // Step 2: Test manager approval
        await testManagerApproval(testData.requestId, testData.managerId);
        
        // Step 3: Test HR confirmation  
        await testHRConfirmation(testData.requestId);
        
        console.log('🎉 Complete workflow test successful!');
        
        // Verify final state
        const finalRequest = await db.collection('leave_requests').doc(testData.requestId).get();
        const finalData = finalRequest.data();
        
        console.log('📋 Final request status:', finalData.status);
        console.log('📋 Manager approval:', finalData.managerApproval ? 'Yes' : 'No');
        console.log('📋 HR approval:', finalData.hrApproval ? 'Yes' : 'No');
        
        return testData;
        
    } catch (error) {
        console.error('❌ Complete workflow test failed:', error);
        throw error;
    }
}

// Export functions for use in browser console
if (typeof window !== 'undefined') {
    window.testCompleteWorkflow = testCompleteWorkflow;
    window.testManagerApproval = testManagerApproval;
    window.testHRConfirmation = testHRConfirmation;
    window.cleanupTestData = cleanupTestData;
    window.runCompleteWorkflowTest = runCompleteWorkflowTest;
}