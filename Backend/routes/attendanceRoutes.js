// routes/attendanceRoutes.js
import express from 'express';
import {
    absenMasuk,
    absenPulang,
    permohonanIzin,
    dapatkanRiwayatPengguna,
    dapatkanAbsensiHariIni,
    dapatkanStatistikAbsensi
} from '../controllers/attendanceController.js';

const router = express.Router();

router.post('/checkin', absenMasuk);
router.post('/checkout', absenPulang);
router.post('/leave', permohonanIzin);
router.get('/history/:user_id', dapatkanRiwayatPengguna);
router.get('/today/:user_id', dapatkanAbsensiHariIni);
router.get('/stats/:user_id', dapatkanStatistikAbsensi);

export default router;