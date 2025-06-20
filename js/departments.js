// Departments Management Module
class DepartmentsController {
    constructor() {
        this.departments = [];
        this.managers = [];
    }

    async init() {
        await this.loadDepartments();
        await this.loadManagers();
    }

    async loadDepartments() {
        try {
            const departmentsSnapshot = await db.collection('departments').get();
            this.departments = departmentsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error loading departments:', error);
            this.departments = [];
        }
    }

    async loadManagers() {
        try {
            const managersSnapshot = await db.collection('users')
                .where('role', '==', 'manager')
                .where('isActive', '==', true)
                .get();
            
            this.managers = managersSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error loading managers:', error);
            this.managers = [];
        }
    }

    async createDepartment(departmentData) {
        try {
            const departmentId = departmentData.code.toUpperCase();
            
            // Check if department already exists
            const existingDept = await db.collection('departments').doc(departmentId).get();
            if (existingDept.exists) {
                throw new Error('Department with this code already exists');
            }

            const newDepartment = {
                code: departmentId,
                name: departmentData.name,
                description: departmentData.description || '',
                managerId: departmentData.managerId || null,
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('departments').doc(departmentId).set(newDepartment);

            // If manager is assigned, update manager's department
            if (departmentData.managerId) {
                await this.assignManager(departmentId, departmentData.managerId);
            }

            return { id: departmentId, ...newDepartment };
        } catch (error) {
            console.error('Error creating department:', error);
            throw error;
        }
    }

    async assignManager(departmentId, managerId) {
        try {
            // Update department with manager
            await db.collection('departments').doc(departmentId).update({
                managerId: managerId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update manager's department and role
            await db.collection('users').doc(managerId).update({
                department: departmentId,
                role: 'manager',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return true;
        } catch (error) {
            console.error('Error assigning manager:', error);
            throw error;
        }
    }

    async getDepartmentEmployees(departmentId) {
        try {
            const employeesSnapshot = await db.collection('users')
                .where('department', '==', departmentId)
                .where('isActive', '==', true)
                .get();

            return employeesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error loading department employees:', error);
            return [];
        }
    }

    async validateManager(managerId) {
        try {
            const managerDoc = await db.collection('users').doc(managerId).get();
            if (!managerDoc.exists) {
                return { valid: false, message: 'Manager not found' };
            }

            const managerData = managerDoc.data();
            if (!managerData.isActive) {
                return { valid: false, message: 'Manager is not active' };
            }

            return { valid: true, manager: { id: managerId, ...managerData } };
        } catch (error) {
            console.error('Error validating manager:', error);
            return { valid: false, message: 'Error validating manager' };
        }
    }

    getDepartmentById(departmentId) {
        return this.departments.find(dept => dept.id === departmentId);
    }

    getManagerById(managerId) {
        return this.managers.find(manager => manager.id === managerId);
    }
}

// Global instance
window.departmentsController = new DepartmentsController();