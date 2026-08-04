// controllers/adminController.js
import { promisePool } from '../config/db.js';

export const dapatkanSemuaAbsensi = async (req, res) => {
    try {
        const { date, status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        console.log('🔍 DEBUG FILTERS:', { date, status, page, limit });

        let query = `
    SELECT 
        a.*, 
        u.name,
        u.email,
        u.photo_url as user_photo,
        DATE_FORMAT(CONVERT_TZ(a.date, '+00:00', '+08:00'), '%d/%m/%Y') as tanggal_format,
        DATE_FORMAT(CONVERT_TZ(a.checkin_time, '+00:00', '+08:00'), '%H:%i') as jam_masuk_format,
        DATE_FORMAT(CONVERT_TZ(a.checkout_time, '+00:00', '+08:00'), '%H:%i') as jam_pulang_format,
        a.status_detail,
        a.telat_menit,
        CASE 
            WHEN a.latitude IS NOT NULL AND a.longitude IS NOT NULL THEN
                CONCAT(ROUND(a.latitude, 6), ', ', ROUND(a.longitude, 6))
            ELSE 'Tidak ada GPS'
        END as info_lokasi
    FROM attendance a 
    JOIN users u ON a.user_id = u.id 
    WHERE 1=1
`;
        let params = [];

        // 🎯 FIX: Filter date - CONVERT KE WITA
        if (date) {
            query += ' AND DATE(CONVERT_TZ(a.date, "+00:00", "+08:00")) = ?';
            params.push(date);
        }

        if (status) {
            query += ' AND a.status = ?';
            params.push(status);
        }

        query += ' ORDER BY a.date DESC, a.checkin_time DESC';
        query += ` LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;

        console.log('🔍 SQL Query:', query);
        console.log('📋 Query Params:', params);

        const [absensi] = await promisePool.execute(query, params);

        // Count total untuk pagination
        let countQuery = `
            SELECT COUNT(*) as total 
            FROM attendance a 
            JOIN users u ON a.user_id = u.id 
            WHERE 1=1
        `;
        let countParams = [];

        if (date) {
            countQuery += ' AND DATE(CONVERT_TZ(a.date, "+00:00", "+08:00")) = ?';
            countParams.push(date);
        }

        if (status) {
            countQuery += ' AND a.status = ?';
            countParams.push(status);
        }

        const [totalResult] = await promisePool.execute(countQuery, countParams);
        const total = totalResult[0].total;

        console.log('📊 Query result:', { found: absensi.length, total: total });

        // Format data
        const dataFormatted = absensi.map(item => ({
            ...item,
            tanggal: item.tanggal_format,
            jam_masuk: item.jam_masuk_format || '-',
            jam_pulang: item.jam_pulang_format || '-',
            lokasi: item.info_lokasi
        }));

        res.json({
            success: true,
            data: dataFormatted,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Kesalahan mengambil semua absensi:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data absensi'
        });
    }
};


// 🎯 UPDATE: Di function dapatkanStatistikDashboard()
export const dapatkanStatistikDashboard = async (req, res) => {
    try {
        const now = new Date();
        const nowWITA = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        const hariIni = nowWITA.toISOString().split('T')[0];

        // Total karyawan
        const [jumlahPengguna] = await promisePool.execute(
            'SELECT COUNT(*) as total FROM users WHERE role = "karyawan"'
        );

        // 🎯 FIX: Query tanpa comment dalam SQL
        const [statistikHariIni] = await promisePool.execute(
            `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('hadir', 'terlambat') THEN 1 ELSE 0 END) as hadir,
        SUM(CASE WHEN status = 'izin' THEN 1 ELSE 0 END) as izin,
        SUM(CASE WHEN status = 'sakit' THEN 1 ELSE 0 END) as sakit,
        SUM(CASE WHEN status = 'terlambat' THEN 1 ELSE 0 END) as terlambat
      FROM attendance WHERE DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) = ?`,
            [hariIni]
        );

        console.log('📈 Today stats result:', statistikHariIni[0]);

        // Statistik bulan ini
        const bulanSekarangWITA = nowWITA.toISOString().slice(0, 7);
        const [statistikBulan] = await promisePool.execute(
            `SELECT 
        COUNT(*) as total_absensi,
        COUNT(DISTINCT user_id) as total_karyawan_absen
      FROM attendance 
      WHERE DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '+08:00'), "%Y-%m") = ?`,
            [bulanSekarangWITA]
        );

        res.json({
            success: true,
            data: {
                total_karyawan: jumlahPengguna[0].total,
                hari_ini: statistikHariIni[0],
                bulan_ini: statistikBulan[0]
            }
        });

    } catch (error) {
        console.error('Kesalahan mengambil statistik dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil statistik dashboard'
        });
    }
};

export const dapatkanAbsensiBerdasarkanRentangTanggal = async (req, res) => {
    try {
        const { start_date, end_date, user_id } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Tanggal mulai dan tanggal akhir diperlukan'
            });
        }

        let query = `
    SELECT 
        a.*,
        u.name,
        u.email,
        DATE_FORMAT(a.date, '%d/%m/%Y') as tanggal_format,
        DATE_FORMAT(a.checkin_time, '%H:%i:%s') as jam_masuk_format,
        DATE_FORMAT(a.checkout_time, '%H:%i:%s') as jam_pulang_format,
        a.status_detail,
        a.telat_menit,
        CASE 
            WHEN a.latitude IS NOT NULL AND a.longitude IS NOT NULL THEN
                CONCAT(
                    ROUND(a.latitude, 6), ', ', 
                    ROUND(a.longitude, 6)
                )
            ELSE 'Tidak ada GPS'
        END as info_lokasi
    FROM attendance a
    JOIN users u ON a.user_id = u.id
    WHERE a.date BETWEEN ? AND ?
`;
        let params = [start_date, end_date];

        if (user_id) {
            query += ' AND a.user_id = ?';
            params.push(user_id);
        }

        query += ' ORDER BY a.date DESC, u.name';

        const [absensi] = await promisePool.execute(query, params);

        // Format data
        const dataFormatted = absensi.map(item => ({
            ...item,
            tanggal: item.tanggal_format,
            jam_masuk: item.jam_masuk_format || '-',
            jam_pulang: item.jam_pulang_format || '-',
            lokasi: item.info_lokasi
        }));

        res.json({
            success: true,
            data: dataFormatted
        });

    } catch (error) {
        console.error('Kesalahan mengambil absensi berdasarkan rentang tanggal:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data absensi'
        });
    }
};

export const dapatkanSemuaPengguna = async (req, res) => {
    try {
        const [pengguna] = await promisePool.execute(
            `SELECT 
                id, name, email, photo_url, role, created_at
            FROM users 
            WHERE role = 'karyawan'
            ORDER BY name`
        );

        res.json({
            success: true,
            data: pengguna
        });

    } catch (error) {
        console.error('Kesalahan mengambil semua pengguna:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data pengguna'
        });
    }
};

export const eksporDataAbsensi = async (req, res) => {
    try {
        const { start_date, end_date, format = 'json' } = req.query;

        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Tanggal mulai dan tanggal akhir diperlukan untuk ekspor'
            });
        }

        // Validasi rentang tanggal (maksimal 3 bulan)
        const mulai = new Date(start_date);
        const akhir = new Date(end_date);
        const selisihWaktu = Math.abs(akhir - mulai);
        const selisihHari = Math.ceil(selisihWaktu / (1000 * 60 * 60 * 24));

        if (selisihHari > 90) {
            return res.status(400).json({
                success: false,
                message: 'Ekspor maksimal 3 bulan (90 hari)'
            });
        }

        const [absensi] = await promisePool.execute(
            `SELECT 
                u.name,
                u.email,
                a.date,
                a.checkin_time,
                a.checkout_time,
                a.status,
                a.reason,
                a.latitude,
                a.longitude,
                a.created_at
            FROM attendance a
            JOIN users u ON a.user_id = u.id
            WHERE a.date BETWEEN ? AND ?
            ORDER BY a.date DESC, u.name`,
            [start_date, end_date]
        );

        if (format === 'csv') {
            const dataCSV = konversiKeCSV(absensi);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=absensi-${start_date}-hingga-${end_date}.csv`);
            return res.send(dataCSV);
        }

        // Default ekspor JSON
        res.json({
            success: true,
            data: absensi,
            info_ekspor: {
                format: 'json',
                tanggal_mulai: start_date,
                tanggal_akhir: end_date,
                total_data: absensi.length,
                rentang_hari: selisihHari
            }
        });

    } catch (error) {
        console.error('Kesalahan ekspor data absensi:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengekspor data'
        });
    }
};

export const dapatkanPengaturanPerusahaan = async (req, res) => {
    try {
        const [perusahaan] = await promisePool.execute('SELECT * FROM company LIMIT 1');

        res.json({
            success: true,
            data: perusahaan.length > 0 ? perusahaan[0] : null
        });

    } catch (error) {
        console.error('Kesalahan mengambil pengaturan perusahaan:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil pengaturan perusahaan'
        });
    }
};

export const perbaruiPengaturanPerusahaan = async (req, res) => {
    try {
        const { name, latitude, longitude, radius } = req.body;

        // Validasi input
        if (!name || !latitude || !longitude || !radius) {
            return res.status(400).json({
                success: false,
                message: 'Semua field (nama, latitude, longitude, radius) wajib diisi'
            });
        }

        // Validasi nilai numerik
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const rad = parseInt(radius);

        if (isNaN(lat) || isNaN(lng) || isNaN(rad)) {
            return res.status(400).json({
                success: false,
                message: 'Latitude, longitude, dan radius harus berupa angka'
            });
        }

        // Validasi range
        if (lat < -90 || lat > 90) {
            return res.status(400).json({
                success: false,
                message: 'Latitude harus antara -90 dan 90'
            });
        }

        if (lng < -180 || lng > 180) {
            return res.status(400).json({
                success: false,
                message: 'Longitude harus antara -180 dan 180'
            });
        }

        if (rad < 100 || rad > 10000) {
            return res.status(400).json({
                success: false,
                message: 'Radius harus antara 100 dan 10000 meter'
            });
        }

        const [existing] = await promisePool.execute('SELECT * FROM company LIMIT 1');

        let result;
        if (existing.length > 0) {
            // Perbarui yang sudah ada
            [result] = await promisePool.execute(
                'UPDATE company SET name = ?, latitude = ?, longitude = ?, radius = ?, updated_at = NOW() WHERE id = ?',
                [name, lat, lng, rad, existing[0].id]
            );
        } else {
            // Insert baru
            [result] = await promisePool.execute(
                'INSERT INTO company (name, latitude, longitude, radius) VALUES (?, ?, ?, ?)',
                [name, lat, lng, rad]
            );
        }

        console.log('✅ Pengaturan perusahaan diperbarui:', { name, latitude: lat, longitude: lng, radius: rad });

        res.json({
            success: true,
            message: 'Pengaturan perusahaan berhasil diperbarui',
            data: {
                name,
                latitude: lat,
                longitude: lng,
                radius: rad
            }
        });

    } catch (error) {
        console.error('Kesalahan memperbarui pengaturan perusahaan:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal memperbarui pengaturan perusahaan'
        });
    }
};

// Fungsi pembantu untuk konversi CSV
function konversiKeCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const barisCSV = [
        headers.join(','), // Baris header
        ...data.map(baris =>
            headers.map(header => {
                const value = baris[header];
                // Handle values yang mungkin mengandung koma
                return typeof value === 'string' && value.includes(',')
                    ? `"${value}"`
                    : value;
            }).join(',')
        )
    ];

    return barisCSV.join('\n');
}

export const dapatkanFotoAbsensi = async (req, res) => {
    try {
        const { id } = req.params;

        if (!id) {
            return res.status(400).json({
                success: false,
                message: 'ID absensi diperlukan'
            });
        }

        const [absensi] = await promisePool.execute(
            'SELECT photo, user_id, date, status FROM attendance WHERE id = ?',
            [id]
        );

        if (absensi.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Data absensi tidak ditemukan'
            });
        }

        const data = absensi[0];

        if (!data.photo) {
            return res.status(404).json({
                success: false,
                message: 'Foto tidak tersedia untuk absensi ini'
            });
        }

        res.json({
            success: true,
            data: {
                photo: data.photo,
                user_id: data.user_id,
                date: data.date,
                status: data.status
            }
        });

    } catch (error) {
        console.error('Kesalahan mengambil foto absensi:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil foto absensi'
        });
    }
};

// GET company locations - PAKAI TABLE COMPANY YANG SUDAH ADA
export const getCompanyLocations = async (req, res) => {
    try {
        const [locations] = await promisePool.execute(
            'SELECT id, name, latitude, longitude, radius FROM company ORDER BY name'
        );

        console.log('📍 Company locations loaded:', locations.length);
        res.json({ success: true, data: locations });

    } catch (error) {
        console.error('❌ Error get locations:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengambil data lokasi'
        });
    }
};

// 🗑️ HAPUS SEMUA DATA ABSENSI
export const hapusSemuaAbsensi = async (req, res) => {
    try {
        console.log('🗑️  Memproses hapus semua data absensi...');

        // 1. HITUNG TOTAL DATA SEBELUM HAPUS
        const [totalResult] = await promisePool.execute(
            'SELECT COUNT(*) as total FROM attendance'
        );
        const totalData = totalResult[0].total;

        console.log(`📊 Total data sebelum hapus: ${totalData}`);

        if (totalData === 0) {
            return res.json({
                success: true,
                message: 'Tidak ada data absensi untuk dihapus',
                deletedCount: 0
            });
        }

        // 2. KONFIRMASI DARI CLIENT (optional safety)
        const { confirm } = req.body;
        if (!confirm || confirm !== 'DELETE_ALL') {
            return res.status(400).json({
                success: false,
                message: 'Konfirmasi diperlukan. Kirim {confirm: "DELETE_ALL"} dalam body request'
            });
        }

        // 3. PROSES HAPUS SEMUA DATA
        console.log('⏳ Menghapus semua data absensi...');
        const [result] = await promisePool.execute('DELETE FROM attendance');

        const deletedCount = result.affectedRows;
        console.log(`✅ Berhasil menghapus ${deletedCount} data absensi`);

        // 4. LOG ACTIVITY
        console.log(`👤 Admin ${req.user?.name || 'Unknown'} menghapus semua data absensi`);

        res.json({
            success: true,
            message: `Berhasil menghapus ${deletedCount} data absensi`,
            deletedCount: deletedCount
        });

    } catch (error) {
        console.error('❌ Error menghapus data absensi:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal menghapus data absensi: ' + error.message
        });
    }
};

// 📊 EKSPOR DATA ABSENSI KE EXCEL
export const eksporDataAbsensiExcel = async (req, res) => {
    try {
        console.log('🎯 ========== EXPORT EXCEL CALLED ==========');
        console.log('🎯 Query params:', req.query);

        const { start_date, end_date, status } = req.query;

        // Validasi input
        if (!start_date || !end_date) {
            return res.status(400).json({
                success: false,
                message: 'Tanggal mulai dan tanggal akhir diperlukan untuk ekspor'
            });
        }

        // 🎯 DEBUG 1: CEK TOTAL DATA DI DATABASE
        const [totalAllData] = await promisePool.execute(
            'SELECT COUNT(*) as total FROM attendance'
        );
        console.log('📊 TOTAL ALL DATA in database:', totalAllData[0].total);

        // 🎯 DEBUG 2: CEK RANGE TANGGAL DI DATABASE
        const [dateRange] = await promisePool.execute(
            'SELECT MIN(date) as min_date, MAX(date) as max_date FROM attendance'
        );
        console.log('📅 Date range in database:', dateRange[0]);

        // 🎯 DEBUG 3: CEK DATA DALAM PERIODE TANPA JOIN
        const [totalInPeriod] = await promisePool.execute(
            'SELECT COUNT(*) as total FROM attendance WHERE date BETWEEN ? AND ?',
            [start_date, end_date]
        );
        console.log('📊 Data in period (no join):', totalInPeriod[0].total);

        // Validasi rentang tanggal
        const mulai = new Date(start_date);
        const akhir = new Date(end_date);
        const selisihWaktu = Math.abs(akhir - mulai);
        const selisihHari = Math.ceil(selisihWaktu / (1000 * 60 * 60 * 24));

        if (selisihHari > 90) {
            return res.status(400).json({
                success: false,
                message: 'Ekspor maksimal 3 bulan (90 hari)'
            });
        }

        console.log('📅 Export period:', { start_date, end_date, days: selisihHari });

        // 🎯 QUERY YANG LEBIH BAIK - TAMPILKAN SEMUA DATA MESKI USER TIDAK ADA
        let query = `
    SELECT 
        COALESCE(u.name, 'User Tidak Ditemukan') as "Nama Karyawan",
        COALESCE(u.email, 'No Email') as "Email",
        DATE_FORMAT(CONVERT_TZ(a.date, '+00:00', '+08:00'), '%d/%m/%Y') as "Tanggal",
        DATE_FORMAT(CONVERT_TZ(a.checkin_time, '+00:00', '+08:00'), '%H:%i') as "Jam Masuk",
        DATE_FORMAT(CONVERT_TZ(a.checkout_time, '+00:00', '+08:00'), '%H:%i') as "Jam Pulang",
        CASE 
            WHEN a.status = 'hadir' THEN 'Hadir'
            WHEN a.status = 'izin' THEN 'Izin' 
            WHEN a.status = 'sakit' THEN 'Sakit'
            ELSE COALESCE(a.status, 'Unknown')
        END as "Status",
        COALESCE(a.reason, '-') as "Keterangan",
        CASE 
            WHEN a.latitude IS NOT NULL AND a.longitude IS NOT NULL THEN
                CONCAT(ROUND(a.latitude, 6), ', ', ROUND(a.longitude, 6))
            ELSE 'Tidak ada GPS'
        END as "Lokasi",
        COALESCE(a.status_detail, '-') as "Detail Status",
        COALESCE(a.telat_menit, 0) as "Menit Terlambat",
        a.user_id as "UserID"
    FROM attendance a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.date BETWEEN ? AND ?
`;

        let params = [start_date, end_date];

        if (status && status !== '') {
            query += ' AND a.status = ?';
            params.push(status);
        }

        query += ' ORDER BY a.date DESC, u.name';

        console.log('🔍 Executing query:', query);
        console.log('📋 Query params:', params);

        const [absensi] = await promisePool.execute(query, params);

        console.log(`📊 Found ${absensi.length} records for export`);

        // 🎯 DEBUG 4: CEK DATA TANPA USER
        const dataWithoutUser = absensi.filter(item => item['Nama Karyawan'] === 'User Tidak Ditemukan');
        console.log('⚠️ Data tanpa user ditemukan:', dataWithoutUser.length);
        if (dataWithoutUser.length > 0) {
            console.log('🔍 Data tanpa user sample:', dataWithoutUser.slice(0, 2));
        }

        if (absensi.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tidak ada data absensi untuk periode yang dipilih'
            });
        }

        // Generate Excel file
        console.log('📈 Generating Excel file...');
        const excelBuffer = await generateExcelFile(absensi, start_date, end_date);

        if (!excelBuffer) {
            throw new Error('Excel buffer is undefined');
        }

        console.log(`✅ Excel file generated: ${absensi.length} rows, ${excelBuffer.length} bytes`);

        // Set headers untuk download
        const fileName = `absensi_${start_date}_hingga_${end_date}.xlsx`;

        console.log('✅ Sending Excel file:', fileName);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        res.setHeader('Content-Length', excelBuffer.length);

        res.send(excelBuffer);

    } catch (error) {
        console.error('❌ Kesalahan ekspor data absensi Excel:', error);
        res.status(500).json({
            success: false,
            message: 'Gagal mengekspor data ke Excel: ' + error.message
        });
    }
};

// 🛠️ FUNGSI PEMBANTU UNTUK GENERATE EXCEL
async function generateExcelFile(data, startDate, endDate) {
    try {
        // 🎯 GUNAKAN DYNAMIC IMPORT untuk ES6 modules
        const XLSX = await import('xlsx');

        // Create workbook dan worksheet
        const workbook = XLSX.utils.book_new();

        // Data untuk worksheet (format array of arrays)
        const worksheetData = [
            // Header utama
            ['LAPORAN DATA ABSENSI KARYAWAN - MASTER PACKAGING'],
            [`Periode: ${startDate} hingga ${endDate}`],
            [`Tanggal Ekspor: ${new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })}`],
            [`Total Data: ${data.length} record`],
            [], // Baris kosong
            // Header tabel
            ['No', 'Nama Karyawan', 'Email', 'Tanggal', 'Jam Masuk', 'Jam Pulang', 'Status', 'Keterangan', 'Lokasi', 'Detail Status', 'Menit Terlambat']
        ];

        // Tambahkan data baris per baris
        data.forEach((item, index) => {
            worksheetData.push([
                index + 1,
                item['Nama Karyawan'] || '-',
                item['Email'] || '-',
                item['Tanggal'] || '-',
                item['Jam Masuk'] || '-',
                item['Jam Pulang'] || '-',
                item['Status'] || '-',
                item['Keterangan'] || '-',
                item['Lokasi'] || '-',
                item['Detail Status'] || '-',
                item['Menit Terlambat'] || '0'
            ]);
        });

        // Footer dengan summary
        worksheetData.push([]);
        worksheetData.push(['REKAPITULASI DATA:']);
        worksheetData.push(['Total Data', data.length]);

        const hadir = data.filter(item => item['Status'] === 'Hadir').length;
        const izin = data.filter(item => item['Status'] === 'Izin').length;
        const sakit = data.filter(item => item['Status'] === 'Sakit').length;
        const terlambat = data.filter(item => item['Menit Terlambat'] > 0).length;

        worksheetData.push(['Total Hadir', hadir]);
        worksheetData.push(['Total Izin', izin]);
        worksheetData.push(['Total Sakit', sakit]);
        worksheetData.push(['Total Terlambat', terlambat]);
        worksheetData.push(['Presentase Hadir', `${((hadir / data.length) * 100).toFixed(1)}%`]);

        // Create worksheet dari array data
        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // Set column widths
        worksheet['!cols'] = [
            { wch: 5 },   // No
            { wch: 25 },  // Nama Karyawan
            { wch: 30 },  // Email
            { wch: 12 },  // Tanggal
            { wch: 10 },  // Jam Masuk
            { wch: 10 },  // Jam Pulang
            { wch: 10 },  // Status
            { wch: 25 },  // Keterangan
            { wch: 25 },  // Lokasi
            { wch: 20 },  // Detail Status
            { wch: 15 }   // Menit Terlambat
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Absensi');

        // Generate buffer
        const excelBuffer = XLSX.write(workbook, {
            type: 'buffer',
            bookType: 'xlsx',
            bookSST: false
        });

        console.log(`✅ Excel file generated: ${data.length} rows, ${excelBuffer.length} bytes`);
        return excelBuffer;

    } catch (error) {
        console.error('❌ Error generating Excel:', error);
        throw error;
    }
}