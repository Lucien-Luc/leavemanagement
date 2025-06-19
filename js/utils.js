// Utility Functions
class Utils {
    // Show toast notification
    static showToast(message, type = 'info', duration = 5000) {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; font-size: 1.2rem; cursor: pointer;">&times;</button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Auto remove after duration
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, duration);
    }

    // Format date
    static formatDate(date, includeTime = false) {
        if (!date) return '';
        
        const d = date instanceof Date ? date : new Date(date);
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        if (includeTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        
        return d.toLocaleDateString('en-US', options);
    }

    // Calculate days between dates
    static daysBetween(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    // Validate email
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Show loading state
    static showLoading(element) {
        const originalText = element.innerHTML;
        element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        element.disabled = true;
        return originalText;
    }

    // Hide loading state
    static hideLoading(element, originalText) {
        element.innerHTML = originalText;
        element.disabled = false;
    }

    // Format file size
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Generate unique ID
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Get leave type color
    static getLeaveTypeColor(leaveType) {
        const colors = {
            vacation: '#17A2B8',
            sick: '#DC3545',
            personal: '#28A745',
            maternity: '#6F42C1',
            paternity: '#FD7E14',
            other: '#6C757D'
        };
        return colors[leaveType] || colors.other;
    }

    // Get status badge class
    static getStatusBadgeClass(status) {
        const classes = {
            pending: 'badge-pending',
            approved: 'badge-approved',
            rejected: 'badge-rejected'
        };
        return classes[status] || 'badge-pending';
    }

    // Sanitize HTML
    static sanitizeHtml(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Load page content
    static async loadPage(pageName) {
        try {
            const response = await fetch(`pages/${pageName}.html`);
            if (!response.ok) {
                throw new Error(`Failed to load page: ${pageName}`);
            }
            return await response.text();
        } catch (error) {
            console.error('Error loading page:', error);
            return '<div class="container"><div class="card"><h2>Page not found</h2><p>The requested page could not be loaded.</p></div></div>';
        }
    }

    // Upload file to Firebase Storage
    static async uploadFile(file, path) {
        try {
            const storageRef = storage.ref().child(path);
            const uploadTask = await storageRef.put(file);
            const downloadURL = await uploadTask.ref.getDownloadURL();
            return downloadURL;
        } catch (error) {
            throw new Error('File upload failed: ' + error.message);
        }
    }

    // Validate leave request dates
    static validateLeaveDates(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
            return 'Start date cannot be in the past';
        }

        if (end < start) {
            return 'End date cannot be before start date';
        }

        return null;
    }

    // Format currency
    static formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    // Get business days between dates (excluding weekends)
    static getBusinessDays(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        let count = 0;
        const current = new Date(start);

        while (current <= end) {
            const dayOfWeek = current.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
                count++;
            }
            current.setDate(current.getDate() + 1);
        }

        return count;
    }

    // Calculate leave days excluding weekends
    static calculateLeaveDays(startDate, endDate) {
        const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
        const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
        return this.getBusinessDays(start, end);
    }

    // Capitalize first letter
    static capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Deep clone object
    static deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }
}

// Export Utils globally
window.Utils = Utils;
