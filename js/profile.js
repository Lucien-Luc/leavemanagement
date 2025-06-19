// Profile Controller
class ProfileController {
    constructor() {
        this.isEditing = false;
        this.originalData = {};
    }

    async init() {
        try {
            this.loadProfileData();
            this.setupEventListeners();
        } catch (error) {
            console.error('Profile initialization failed:', error);
            Utils.showToast('Failed to load profile', 'error');
        }
    }

    loadProfileData() {
        const user = authService.getCurrentUser();
        if (!user) return;

        // Populate profile form with current user data
        document.getElementById('first-name').value = user.firstName || '';
        document.getElementById('last-name').value = user.lastName || '';
        document.getElementById('email').value = user.email || '';
        document.getElementById('employee-id').value = user.employeeId || '';
        document.getElementById('department').value = user.department || '';
        document.getElementById('position').value = user.position || '';
        document.getElementById('manager').value = user.manager || '';
        document.getElementById('start-date').value = user.startDate || '';

        // Store original data for comparison
        this.originalData = { ...user };

        // Render leave balances
        this.renderLeaveBalances();
        this.renderProfileStats();
    }

    setupEventListeners() {
        // Edit profile button
        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.toggleEditMode());
        }

        // Save profile button
        const saveBtn = document.getElementById('save-profile-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProfile());
        }

        // Cancel edit button
        const cancelBtn = document.getElementById('cancel-edit-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.cancelEdit());
        }

        // Change password form
        const changePasswordForm = document.getElementById('change-password-form');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => this.handlePasswordChange(e));
        }

        // Profile picture upload
        const profilePictureInput = document.getElementById('profile-picture-input');
        if (profilePictureInput) {
            profilePictureInput.addEventListener('change', (e) => this.handleProfilePictureUpload(e));
        }

        // Upload profile picture button
        const uploadPictureBtn = document.getElementById('upload-picture-btn');
        if (uploadPictureBtn) {
            uploadPictureBtn.addEventListener('click', () => {
                profilePictureInput.click();
            });
        }
    }

    toggleEditMode() {
        this.isEditing = !this.isEditing;
        
        const formInputs = document.querySelectorAll('#profile-form input:not([type="email"])');
        const editBtn = document.getElementById('edit-profile-btn');
        const saveBtn = document.getElementById('save-profile-btn');
        const cancelBtn = document.getElementById('cancel-edit-btn');

        if (this.isEditing) {
            // Enable editing
            formInputs.forEach(input => {
                if (input.id !== 'email') { // Email should not be editable
                    input.removeAttribute('readonly');
                    input.classList.add('editable');
                }
            });

            editBtn.style.display = 'none';
            saveBtn.style.display = 'inline-flex';
            cancelBtn.style.display = 'inline-flex';

            Utils.showToast('Edit mode enabled', 'info');
        } else {
            // Disable editing
            formInputs.forEach(input => {
                input.setAttribute('readonly', 'readonly');
                input.classList.remove('editable');
            });

            editBtn.style.display = 'inline-flex';
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
        }
    }

    async saveProfile() {
        const formData = new FormData(document.getElementById('profile-form'));
        const saveBtn = document.getElementById('save-profile-btn');

        try {
            const originalText = Utils.showLoading(saveBtn);

            const updates = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                employeeId: formData.get('employeeId'),
                department: formData.get('department'),
                position: formData.get('position'),
                manager: formData.get('manager'),
                startDate: formData.get('startDate')
            };

            // Validate required fields
            if (!updates.firstName || !updates.lastName) {
                throw new Error('First name and last name are required');
            }

            await authService.updateProfile(updates);

            // Update UI
            this.toggleEditMode();
            Utils.showToast('Profile updated successfully!', 'success');
            
            // Update original data
            this.originalData = { ...authService.getCurrentUser() };

        } catch (error) {
            console.error('Error updating profile:', error);
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading(saveBtn, 'Save Changes');
        }
    }

    cancelEdit() {
        // Restore original values
        document.getElementById('first-name').value = this.originalData.firstName || '';
        document.getElementById('last-name').value = this.originalData.lastName || '';
        document.getElementById('employee-id').value = this.originalData.employeeId || '';
        document.getElementById('department').value = this.originalData.department || '';
        document.getElementById('position').value = this.originalData.position || '';
        document.getElementById('manager').value = this.originalData.manager || '';
        document.getElementById('start-date').value = this.originalData.startDate || '';

        this.toggleEditMode();
        Utils.showToast('Changes cancelled', 'info');
    }

    async handlePasswordChange(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const currentPassword = formData.get('currentPassword');
        const newPassword = formData.get('newPassword');
        const confirmPassword = formData.get('confirmPassword');
        const submitBtn = event.target.querySelector('button[type="submit"]');

        try {
            const originalText = Utils.showLoading(submitBtn);

            // Validate passwords
            if (!currentPassword || !newPassword || !confirmPassword) {
                throw new Error('All password fields are required');
            }

            if (newPassword !== confirmPassword) {
                throw new Error('New passwords do not match');
            }

            if (newPassword.length < 6) {
                throw new Error('New password must be at least 6 characters long');
            }

            await authService.changePassword(currentPassword, newPassword);

            // Clear form
            event.target.reset();
            Utils.showToast('Password changed successfully!', 'success');

        } catch (error) {
            console.error('Error changing password:', error);
            Utils.showToast(error.message, 'error');
        } finally {
            Utils.hideLoading(submitBtn, 'Change Password');
        }
    }

    async handleProfilePictureUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!file.type.startsWith('image/')) {
            Utils.showToast('Please select an image file', 'error');
            return;
        }

        if (file.size > 2 * 1024 * 1024) { // 2MB
            Utils.showToast('Image size must be less than 2MB', 'error');
            return;
        }

        try {
            const user = authService.getCurrentUser();
            const fileName = `profile_pictures/${user.id}_${Date.now()}.${file.name.split('.').pop()}`;
            
            // Show upload progress
            Utils.showToast('Uploading profile picture...', 'info');
            
            // Upload to Firebase Storage
            const storageRef = storage.ref(fileName);
            const uploadTask = await storageRef.put(file);
            const downloadURL = await uploadTask.ref.getDownloadURL();
            
            // Update user profile with new picture URL
            const user = authService.getCurrentUser();
            await db.collection('users').doc(user.id).update({
                profilePicture: downloadURL,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Update local user data
            user.profilePicture = downloadURL;
            authService.updateUserSession(user);
            
            // Update profile picture in UI
            const profilePicture = document.getElementById('profile-picture');
            if (profilePicture) {
                profilePicture.src = downloadURL;
            }

            Utils.showToast('Profile picture updated successfully!', 'success');

        } catch (error) {
            console.error('Error uploading profile picture:', error);
            Utils.showToast('Failed to upload profile picture', 'error');
        }
    }

    renderLeaveBalances() {
        const balancesContainer = document.getElementById('profile-leave-balances');
        if (!balancesContainer) return;

        const user = authService.getCurrentUser();
        const balances = user.leaveBalances || {};

        if (Object.keys(balances).length === 0) {
            balancesContainer.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Leave Balances</h4>
                    </div>
                    <div style="padding: 2rem; text-align: center;">
                        <p>No leave balances configured</p>
                    </div>
                </div>
            `;
            return;
        }

        const balanceItems = Object.entries(balances).map(([type, balance]) => `
            <div class="row mb-2">
                <div class="col-md-8">
                    <strong>${Utils.capitalize(type)} Leave</strong>
                </div>
                <div class="col-md-4 text-right">
                    <span class="badge" style="background: ${Utils.getLeaveTypeColor(type)}; color: white;">
                        ${balance} days
                    </span>
                </div>
            </div>
        `).join('');

        balancesContainer.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h4 class="card-title">Leave Balances</h4>
                </div>
                <div style="padding: 1rem;">
                    ${balanceItems}
                </div>
            </div>
        `;
    }

    async renderProfileStats() {
        const statsContainer = document.getElementById('profile-stats');
        if (!statsContainer) return;

        try {
            const user = authService.getCurrentUser();
            const currentYear = new Date().getFullYear();

            // Get leave statistics
            const leaveRequestsSnapshot = await db.collection('leave_requests')
                .where('userId', '==', user.id)
                .get();

            const leaveRequests = leaveRequestsSnapshot.docs.map(doc => ({
                ...doc.data(),
                startDate: doc.data().startDate?.toDate(),
                createdAt: doc.data().createdAt?.toDate()
            }));

            const thisYearRequests = leaveRequests.filter(request => 
                request.startDate && request.startDate.getFullYear() === currentYear
            );

            const stats = {
                totalRequests: leaveRequests.length,
                thisYearRequests: thisYearRequests.length,
                approvedRequests: leaveRequests.filter(r => r.status === 'approved').length,
                pendingRequests: leaveRequests.filter(r => r.status === 'pending').length,
                totalDaysUsed: thisYearRequests
                    .filter(r => r.status === 'approved')
                    .reduce((total, request) => total + (request.days || 0), 0)
            };

            statsContainer.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Leave Statistics</h4>
                    </div>
                    <div class="row" style="padding: 1rem;">
                        <div class="col-md-6">
                            <div style="text-align: center; padding: 1rem;">
                                <div style="font-size: 2rem; font-weight: bold; color: var(--primary-blue);">${stats.totalRequests}</div>
                                <div style="color: var(--medium-grey); font-size: 0.875rem;">Total Requests</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div style="text-align: center; padding: 1rem;">
                                <div style="font-size: 2rem; font-weight: bold; color: var(--success);">${stats.approvedRequests}</div>
                                <div style="color: var(--medium-grey); font-size: 0.875rem;">Approved Requests</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div style="text-align: center; padding: 1rem;">
                                <div style="font-size: 2rem; font-weight: bold; color: var(--warning);">${stats.pendingRequests}</div>
                                <div style="color: var(--medium-grey); font-size: 0.875rem;">Pending Requests</div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div style="text-align: center; padding: 1rem;">
                                <div style="font-size: 2rem; font-weight: bold; color: var(--info);">${stats.totalDaysUsed}</div>
                                <div style="color: var(--medium-grey); font-size: 0.875rem;">Days Used (${currentYear})</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('Error loading profile stats:', error);
            statsContainer.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title">Leave Statistics</h4>
                    </div>
                    <div style="padding: 2rem; text-align: center;">
                        <p>Failed to load statistics</p>
                    </div>
                </div>
            `;
        }
    }

    async downloadPersonalData() {
        try {
            const user = authService.getCurrentUser();
            
            // Get all user data
            const leaveRequestsSnapshot = await db.collection('leave_requests')
                .where('userId', '==', user.id)
                .get();

            const leaveRequests = leaveRequestsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startDate: doc.data().startDate?.toDate()?.toISOString(),
                endDate: doc.data().endDate?.toDate()?.toISOString(),
                createdAt: doc.data().createdAt?.toDate()?.toISOString(),
                updatedAt: doc.data().updatedAt?.toDate()?.toISOString()
            }));

            const personalData = {
                profile: {
                    ...user,
                    password: '[HIDDEN]' // Don't include password in export
                },
                leaveRequests: leaveRequests,
                exportDate: new Date().toISOString()
            };

            // Create and download JSON file
            const dataStr = JSON.stringify(personalData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `bpn_leave_data_${user.firstName}_${user.lastName}_${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(url);
            Utils.showToast('Personal data downloaded successfully', 'success');

        } catch (error) {
            console.error('Error downloading personal data:', error);
            Utils.showToast('Failed to download personal data', 'error');
        }
    }

    async refresh() {
        this.loadProfileData();
        await this.renderProfileStats();
    }
}

// Initialize profile controller
const profileController = new ProfileController();
window.profileController = profileController;
