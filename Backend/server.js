// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import moment from 'moment-timezone';

// Import routes
import authRoutes from './routes/authRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

moment.tz.setDefault("Asia/Makassar");

const app = express();
const PORT = process.env.PORT || 5000;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware - SIMPLE VERSION
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 🎯 TAMBAHKAN INI: Serve static files dari Frontend folder
app.use(express.static(path.join(__dirname, '../Frontend')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Masterpackaging API is running!',
        timestamp: new Date().toISOString()
    });
});

// Root route - Redirect ke login page
app.get('/', (req, res) => {
    res.redirect('/login.html');
});

// Simple 404 handler - PASTI WORK
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found: ' + req.originalUrl
    });
});

// Basic error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        message: 'Something went wrong!'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Local: http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/api/health`);
    console.log(`🌐 Frontend: http://localhost:${PORT}/login.html`);
});


export { moment };