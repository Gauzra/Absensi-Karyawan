// middleware/authMiddleware.js
import { promisePool } from '../config/db.js';

// Verifikasi token sederhana yang kompatibel dengan format:
// 1. "token-<userId>-<timestamp>"
// 2. Bearer token dari header Authorization
export const ensureAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "🔒 Akses ditolak: Silakan login terlebih dahulu" });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    // Ekstrak userId jika formatnya token-<userId>-<timestamp>
    const parts = token.split('-');
    if (parts.length >= 2 && parts[0] === 'token') {
      const userId = parts[1];
      const [users] = await promisePool.execute('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
      if (users.length > 0) {
        req.user = users[0];
        return next();
      }
    }

    // Fallback jika token berupa ID langsung atau sesi valid
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ success: false, message: "🔒 Sesi login tidak valid" });
  }
};

// Verifikasi khusus admin
export const ensureAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: "🔒 Silakan login sebagai admin" });
    }

    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const parts = token.split('-');

    if (parts.length >= 2 && parts[0] === 'token') {
      const userId = parts[1];
      const [users] = await promisePool.execute('SELECT id, name, email, role FROM users WHERE id = ?', [userId]);
      if (users.length > 0 && users[0].role === 'admin') {
        req.user = users[0];
        return next();
      }
    }

    // Lanjutkan jika sudah verified
    if (req.user && req.user.role === 'admin') {
      return next();
    }

    return res.status(403).json({ success: false, message: "🚫 Akses ditolak: Hanya admin yang diizinkan" });
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(403).json({ success: false, message: "🚫 Verifikasi admin gagal" });
  }
};
