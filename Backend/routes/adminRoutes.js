// routes/adminRoutes.js
import express from 'express';
import {
    dapatkanSemuaAbsensi,
    dapatkanStatistikDashboard,
    dapatkanAbsensiBerdasarkanRentangTanggal,
    dapatkanSemuaPengguna,
    eksporDataAbsensi,
    dapatkanPengaturanPerusahaan,
    perbaruiPengaturanPerusahaan,
    dapatkanFotoAbsensi,
    getCompanyLocations,
    hapusSemuaAbsensi,
    eksporDataAbsensiExcel  // 📊 IMPORT INI
} from '../controllers/adminController.js';

const router = express.Router();

// 🗑️ ROUTE BARU UNTUK HAPUS SEMUA ABSENSI
router.delete('/attendance/delete-all', hapusSemuaAbsensi);

// 📊 ROUTE BARU UNTUK EXPORT EXCEL
router.get('/export/excel', eksporDataAbsensiExcel);

// Manajemen absensi
router.get('/attendance', dapatkanSemuaAbsensi);
router.get('/attendance/range', dapatkanAbsensiBerdasarkanRentangTanggal);
router.get('/stats', dapatkanStatistikDashboard);
router.get('/users', dapatkanSemuaPengguna);
router.get('/export', eksporDataAbsensi);

// 🎯 ROUTE BARU UNTUK FOTO
router.get('/attendance/:id/photo', dapatkanFotoAbsensi);

// Pengaturan perusahaan
router.get('/company', dapatkanPengaturanPerusahaan);
router.put('/company', perbaruiPengaturanPerusahaan);

// 🎯 ROUTE BARU UNTUK COMPANY LOCATIONS
router.get('/company-locations', getCompanyLocations);

export default router;