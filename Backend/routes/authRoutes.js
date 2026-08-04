// routes/authRoutes.js
import express from 'express';
import {
    googleLogin,
    adminLogin,
    login  // 🎯 TAMBAH INI
} from '../controllers/authController.js';

const router = express.Router();

// 🎯 TAMBAH ROUTE INI
router.post('/login', login);

// Routes yang sudah ada
router.post('/google-login', googleLogin);
router.post('/admin-login', adminLogin);

export default router;