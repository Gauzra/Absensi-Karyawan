// controllers/authController.js
import { verifyGoogleToken } from '../config/googleauth.js';
import { promisePool } from '../config/db.js';

export const googleLogin = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google token required'
      });
    }

    // ✅ PRODUCTION: Uncomment Google verification
    const googleUser = await verifyGoogleToken(token);

    // Check if user exists in database
    const [users] = await promisePool.execute(
      'SELECT * FROM users WHERE google_id = ? OR email = ?',
      [googleUser.google_id, googleUser.email]
    );

    let user;
    if (users.length > 0) {
      // Update existing user
      user = users[0];
      await promisePool.execute(
        'UPDATE users SET name = ?, photo_url = ? WHERE id = ?',
        [googleUser.name, googleUser.photo_url, user.id]
      );
    } else {
      // Create new user
      const [result] = await promisePool.execute(
        'INSERT INTO users (google_id, name, email, photo_url, role) VALUES (?, ?, ?, ?, ?)',
        [googleUser.google_id, googleUser.name, googleUser.email, googleUser.photo_url, 'karyawan']
      );
      user = {
        id: result.insertId,
        google_id: googleUser.google_id,
        name: googleUser.name,
        email: googleUser.email,
        photo_url: googleUser.photo_url,
        role: 'karyawan'
      };
    }

    console.log('✅ Login success for user:', user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        photo_url: user.photo_url,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({
      success: false,
      message: 'Google authentication failed: ' + error.message
    });
  }
};

// ✅ DEVELOPMENT MODE - Comment this for production
export const googleLoginDev = async (req, res) => {
  try {
    const { token } = req.body;

    console.log('🔧 DEV MODE: Bypass Google verification');

    // Auto-create user untuk development
    const mockUser = {
      name: "Budi Karyawan",
      email: "budi@masterpackaging.com",
      role: "karyawan",
      photo_url: null
    };

    // Cek apakah user sudah ada
    const [users] = await promisePool.execute(
      'SELECT * FROM users WHERE email = ?',
      [mockUser.email]
    );

    let user;
    if (users.length === 0) {
      const [result] = await promisePool.execute(
        'INSERT INTO users (name, email, role, google_id) VALUES (?, ?, ?, ?)',
        [mockUser.name, mockUser.email, mockUser.role, 'dev_' + Date.now()]
      );
      user = {
        id: result.insertId,
        name: mockUser.name,
        email: mockUser.email,
        role: mockUser.role
      };
    } else {
      user = users[0];
    }

    console.log('✅ DEV: Login success for user:', user.id);

    res.json({
      success: true,
      user: user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed: ' + error.message
    });
  }
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ✅ PERBAIKAN: Gunakan environment variables untuk credentials
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@masterpackaging.com';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      // Check or create admin user
      const [users] = await promisePool.execute(
        'SELECT * FROM users WHERE email = ? AND role = "admin"',
        [email]
      );

      let user;
      if (users.length === 0) {
        const [result] = await promisePool.execute(
          'INSERT INTO users (name, email, role) VALUES (?, ?, ?)',
          ['Admin Masterpackaging', email, 'admin']
        );
        user = {
          id: result.insertId,
          name: 'Admin Masterpackaging',
          email: email,
          role: 'admin'
        };
      } else {
        user = users[0];
      }

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};


// fungsi login manual karyawan
// fungsi login manual karyawan
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;  

    console.log('🔐 Login attempt:', username);

    // Validasi input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username dan password harus diisi' 
      });
    }

    // Cari user di database
    const [users] = await promisePool.execute(
      'SELECT id, name, email, role, password FROM users WHERE username = ?',  
      [username]  // ✅ UBAH: email → username
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Username tidak ditemukan'  
      });
    }

    const user = users[0];

    // Validasi password
    if (password !== user.password) {
      return res.status(401).json({
        success: false,
        message: 'Password salah'
      });
    }

    console.log('✅ Login success for:', user.name);

    // Login berhasil
    res.json({
      success: true,
      message: 'Login berhasil',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        token: 'token-' + user.id + '-' + Date.now()
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
};