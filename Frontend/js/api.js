const API_BASE_URL = (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('file://'))
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? `${window.location.origin}/api`
        : (window.location.origin.includes('masterspackaging') ? `${window.location.origin}/api` : `${window.location.origin}/api`))
    : 'http://localhost:5000/api';

const apiService = {
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;

        // 🎯 PERBAIKI: const token = localStorage.getItem('authToken');
        const token = localStorage.getItem('authToken'); // ✅ FIX TYPO!

        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                // 🎯 PASTIKAN INI BENAR
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers,
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    },

    // ==================== AUTHENTICATION ====================
    async googleLogin(token) {
        return this.request('/auth/google-login', {
            method: 'POST',
            body: { googleToken: token } 
        });
    },

    async adminLogin(email, password) {
        return this.request('/auth/admin-login', {
            method: 'POST',
            body: { email, password }
        });
    },

    // ==================== ATTENDANCE ====================
    async checkIn(data) {
        return this.request('/attendance/checkin', {
            method: 'POST',
            body: data
        });
    },

    async checkOut(userId) {
        return this.request('/attendance/checkout', {
            method: 'POST',
            body: { user_id: userId }
        });
    },

    async requestLeave(data) {
        return this.request('/attendance/leave', {
            method: 'POST',
            body: data
        });
    },

    async getAttendanceHistory(userId) {
        return this.request(`/attendance/history/${userId}`);
    },

    async getTodayAttendance(userId) {
        return this.request(`/attendance/today/${userId}`);
    },

    // 🎯 TAMBAH INI - Untuk chart statistics
    async getAttendanceStats(userId) {
        return this.request(`/attendance/stats/${userId}`);
    },

    // ==================== ADMIN ====================
    async getAllAttendance(filters = {}) {
        const params = new URLSearchParams(filters);

        // 🎯 ADD TIMESTAMP UNTUK FORCE NO-CACHE
        params.append('_t', Date.now());

        return this.request(`/admin/attendance?${params}`);
    },

    async getDashboardStats() {
        return this.request('/admin/stats');
    },

    async exportAttendance(filters = {}) {
        const params = new URLSearchParams(filters);
        return this.request(`/admin/export?${params}`);
    },

    async exportAttendanceExcel(filters = {}) {
        try {
            const params = new URLSearchParams(filters);

            console.log('📤 Export Excel Request:', params.toString());

            const response = await fetch(`${API_BASE_URL}/admin/export/excel?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                },
            });

            console.log('📥 Export Response Status:', response.status);
            console.log('📥 Export Response Headers:', response.headers);

            // 🎯 CEK JIKA RESPONSE BUKAN EXCEL FILE
            const contentType = response.headers.get('content-type');
            console.log('📄 Content-Type:', contentType);

            if (!contentType || !contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
                // Jika bukan Excel file, baca sebagai text untuk debug
                const errorText = await response.text();
                console.error('❌ Server returned non-Excel response:', errorText.substring(0, 500));
                throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 100)}`);
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Get blob untuk download file
            const blob = await response.blob();
            console.log('✅ Excel blob size:', blob.size);
            return blob;

        } catch (error) {
            console.error('❌ Export Excel Error:', error);
            throw error;
        }
    },

    async getCompanySettings() {
        return this.request('/admin/company');
    },

    async updateCompanySettings(data) {
        return this.request('/admin/company', {
            method: 'PUT',
            body: data
        });
    },

    // 🎯 TAMBAH INI - Di section ADMIN
    async getCompanyLocations() {
        return this.request('/admin/company-locations');
    },

    async getAttendancePhoto(attendanceId) {
        return this.request(`/admin/attendance/${attendanceId}/photo`);
    },

    async deleteAllAttendance() {
        return this.request('/admin/attendance/delete-all', {
            method: 'DELETE',
            body: {
                confirm: 'DELETE_ALL' // ✅ TAMBAHKAN INI
            }
        });
    }


};



window.apiService = apiService;

// ==================== TAMBAH SESSION MANAGER DI SINI ====================
class SessionManager {
    static init() {
        console.log('🔐 Session Manager Initialized');

        // 🎯 LESS AGGRESSIVE - hanya clean jika benar-benar corrupt
        if (this.isSessionCorrupt()) {
            this.clearSession();
        }
    }

    static isSessionCorrupt() {
        const userData = localStorage.getItem('userData');
        if (!userData) return false;

        try {
            const user = JSON.parse(userData);

            // 🎯 HANYA clear jika BENAR-BENAR corrupt
            const isCorrupt = (
                // Case 1: Admin name dengan karyawan role
                (user.name === 'Admin Masterpackaging' && user.role === 'karyawan') ||
                // Case 2: Karyawan dengan admin email  
                (user.role === 'karyawan' && user.email === 'admin@masterpackaging.com') ||
                // Case 3: Invalid role
                !['admin', 'karyawan'].includes(user.role)
            );

            if (isCorrupt) {
                console.log('🚨 Detected corrupt session:', user);
            }

            return isCorrupt;

        } catch (error) {
            console.error('❌ Invalid user data format');
            return true;
        }
    }

    static validateSession() {
        const userData = localStorage.getItem('userData');
        const authToken = localStorage.getItem('authToken');

        if (!userData || !authToken) {
            console.log('❌ No session data found');
            return false;
        }

        try {
            const user = JSON.parse(userData);

            // 🎯 CRITICAL: Fix Admin with karyawan role
            if (user.name === 'Admin Masterpackaging' && user.role !== 'admin') {
                console.error('🚨 CRITICAL: Admin data corrupted - clearing session');
                this.clearSession();
                return false;
            }

            // 🎯 CRITICAL: Fix karyawan with admin email
            if (user.role === 'karyawan' && user.email === 'admin@masterpackaging.com') {
                console.error('🚨 CRITICAL: Karyawan with admin email - clearing session');
                this.clearSession();
                return false;
            }

            if (!['admin', 'karyawan'].includes(user.role)) {
                console.error('🚨 Invalid role detected');
                this.clearSession();
                return false;
            }

            console.log('✅ Session valid for:', user.role);
            return true;

        } catch (error) {
            console.error('❌ Invalid user data format');
            this.clearSession();
            return false;
        }
    }

    static cleanCorruptData() {
        const userData = localStorage.getItem('userData');
        if (!userData) return;

        try {
            const user = JSON.parse(userData);

            if (user.name === 'Admin Masterpackaging' && user.role === 'karyawan') {
                console.log('🚨 Cleaning: Admin with karyawan role');
                this.clearSession();
                return;
            }

            if (user.role === 'karyawan' && user.email === 'admin@masterpackaging.com') {
                console.log('🚨 Cleaning: Karyawan with admin email');
                this.clearSession();
                return;
            }

            if (!['admin', 'karyawan'].includes(user.role)) {
                console.log('🚨 Cleaning: Invalid role');
                this.clearSession();
                return;
            }

        } catch (error) {
            console.error('❌ Error cleaning data');
            this.clearSession();
        }
    }

    static clearSession() {
        console.log('🧹 Clearing session data');
        localStorage.removeItem('userData');
        localStorage.removeItem('authToken');
        localStorage.removeItem('loginTime');
    }

    static createSession(userData, authToken) {
        // 🎯 CLEAR ALL SESSION DATA FIRST
        localStorage.clear();

        // 🎯 ADD SESSION LOCK
        localStorage.setItem('sessionSource', userData.google_id ? 'google' : 'manual');
        localStorage.setItem('sessionCreated', Date.now());

        // Simpan user data
        localStorage.setItem('userData', JSON.stringify(userData));
        localStorage.setItem('authToken', authToken);

        console.log('✅ New session created:', userData.role, userData.name);
    }

    static getUser() {
        const userData = localStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }

    static getRole() {
        const user = this.getUser();
        return user ? user.role : null;
    }

    static isAdmin() {
        return this.getRole() === 'admin';
    }

    static isKaryawan() {
        return this.getRole() === 'karyawan';
    }
}

// Auto-initialize
SessionManager.init();
window.SessionManager = SessionManager;