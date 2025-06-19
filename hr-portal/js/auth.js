// HR Portal Authentication Module
class AuthService {
    constructor() {
        this.currentUser = null;
        this.sessionKey = 'bpn_hr_session';
        this.init();
    }

    init() {
        // Check for existing session
        const sessionData = localStorage.getItem(this.sessionKey);
        if (sessionData) {
            try {
                const session = JSON.parse(sessionData);
                if (session.expires > Date.now()) {
                    this.currentUser = session.user;
                } else {
                    localStorage.removeItem(this.sessionKey);
                }
            } catch (error) {
                localStorage.removeItem(this.sessionKey);
            }
        }
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    async login(email, password) {
        try {
            const hashedPassword = CryptoJS.SHA256(password).toString();
            
            const userQuery = await db.collection('users')
                .where('email', '==', email.toLowerCase())
                .where('password', '==', hashedPassword)
                .limit(1)
                .get();

            if (userQuery.empty) {
                throw new Error('Invalid email or password');
            }

            const userDoc = userQuery.docs[0];
            const userData = { id: userDoc.id, ...userDoc.data() };

            // Check if user has HR privileges (you can customize this logic)
            if (!userData.isHR && userData.department !== 'Human Resources') {
                throw new Error('Access denied. HR privileges required.');
            }

            // Create session
            const sessionData = {
                user: userData,
                expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
            };

            localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
            this.currentUser = userData;

            // Update last login
            await db.collection('users').doc(userData.id).update({
                lastLogin: firebase.firestore.Timestamp.now()
            });

            return userData;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    logout() {
        localStorage.removeItem(this.sessionKey);
        this.currentUser = null;
    }
}