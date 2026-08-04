// attendanceController.js
import { promisePool } from '../config/db.js';
import moment from 'moment-timezone';

// 🔹 Fungsi untuk menghitung jarak antara dua koordinat (dalam meter)
function hitungJarak(lat1, lon1, lat2, lon2) {
  const R = 6371000; // radius bumi dalam meter
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// 🔹 Fungsi validasi lokasi berdasarkan radius Master Packaging
// 🔹 Fungsi validasi lokasi - RELAX UNTUK HADIR
async function validateLocationRadius(userLat, userLng, gpsAccuracy = 50) {
  try {
    const COMPANY_LOCATION = {
      name: "Master Packaging Mataram",
      latitude: -8.6051553,
      longitude: 116.0939254,
      radius: 500
    };

    // Hitung jarak pengguna ke kantor
    const distance = hitungJarak(
      userLat,
      userLng,
      COMPANY_LOCATION.latitude,
      COMPANY_LOCATION.longitude
    );

    console.log('📍 GPS Validation Debug:', {
      distance: Math.round(distance) + 'm',
      accuracy: gpsAccuracy + 'm',
      radius: COMPANY_LOCATION.radius + 'm'
    });

    // 🔸 FIX: RELAX ACCURACY CHECK UNTUK HADIR
    if (gpsAccuracy > 250) {  // 🎯 UBAH DARI 100 KE 250
      return {
        valid: false,
        distance: Math.round(distance),
        radius: COMPANY_LOCATION.radius,
        reason: `GPS tidak akurat (${gpsAccuracy}m). Pastikan sinyal kuat.`
      };
    }

    // Cek radius
    const valid = distance <= COMPANY_LOCATION.radius;

    return {
      valid,
      distance: Math.round(distance),
      radius: COMPANY_LOCATION.radius,
      reason: valid
        ? "📍 Dalam area Master Packaging"
        : `📍 Di luar area, jarak ${Math.round(distance)}m dari Master Packaging`
    };

  } catch (error) {
    console.error("❌ Error validasi lokasi:", error);
    return {
      valid: false,
      distance: 0,
      radius: 0,
      reason: "Terjadi kesalahan saat memvalidasi lokasi"
    };
  }
}




// generateAttendanceStatus()
function generateAttendanceStatus(jamAbsen) {
  try {
    const jam = moment(jamAbsen, 'HH:mm:ss');
    const jamToleransi = moment('09:15:00', 'HH:mm:ss');

    console.log('DEBUG TIME COMPARISON:', {
      jamAbsen: jamAbsen,
      jamFormat: jam.format('HH:mm:ss'),
      jamToleransi: jamToleransi.format('HH:mm:ss'),
      isBefore: jam.isBefore(jamToleransi),
      isSame: jam.isSame(jamToleransi)
    });

    // TEPAT WAKTU (09:00 - 09:15)
    if (jam.isSameOrBefore(jamToleransi)) {
      return {
        status: 'hadir',
        label: 'Tepat Waktu',
        telat_menit: 0
      };
    }

    // TERLAMBAT (setelah 09:15)  
    const selisihMenit = jam.diff(jamToleransi, 'minutes');

    console.log('TERLAMBAT CALCULATION:', {
      checkin: jam.format('HH:mm:ss'),
      batas: jamToleransi.format('HH:mm:ss'),
      selisihMenit: selisihMenit
    });

    return {
      status: 'hadir',
      label: `Terlambat ${selisihMenit} menit`,
      telat_menit: selisihMenit
    };

  } catch (error) {
    console.error('❌ Error generateAttendanceStatus:', error);
    return {
      status: 'hadir',
      label: 'Absen Dicatat',
      telat_menit: 0
    };
  }
}

// ===================== ABSEN MASUK =====================
function generateAttendanceStatus(jamAbsen)export const absenMasuk = async (req, res) => {
  try {
    const { user_id, status, latitude, longitude, photo, reason, gps_accuracy } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'ID Pengguna wajib diisi' });
    }

    // 🎯 FIX: MANUAL TIMEZONE CONVERSION UTC → WITA
    const nowUTC = moment().utc();
    const nowWITA = moment(nowUTC).add(8, 'hours'); // UTC + 8 jam = WITA

    const nowTime = nowWITA.format('HH:mm:ss');
    const batasTime = '11:00:00';
    const hariIni = nowWITA.format('YYYY-MM-DD');
    const waktuSekarang = nowUTC.format('YYYY-MM-DD HH:mm:ss'); // Simpan sebagai UTC

    console.log('🎯 TIME CONVERSION DEBUG:', {
      serverUTC: nowUTC.format('YYYY-MM-DD HH:mm:ss'),
      convertedWITA: nowWITA.format('YYYY-MM-DD HH:mm:ss'),
      nowTime: nowTime,
      batasTime: batasTime
    });

    // VALIDASI GPS UNTUK ABSENSI HADIR
    if (status === 'hadir') {
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Koordinat GPS wajib untuk absensi hadir'
        });
      }

      const radiusValidation = await validateLocationRadius(latitude, longitude, gps_accuracy);
      if (!radiusValidation.valid) {
        return res.status(400).json({
          success: false,
          message: radiusValidation.reason
        });
      }
    }

    console.log('📥 Menerima data absensi:', { user_id, status, hariIni, waktuSekarang });

    let finalStatus = status;
    let statusDetail = null;

    if (status === 'hadir') {
      const waktuCheckin = nowTime;

      // 🧪 EXTRA DEBUG
      console.log('🔍 EXTRA DEBUG - Before generateAttendanceStatus:');
      console.log('- waktuCheckin:', waktuCheckin);
      console.log('- Type of waktuCheckin:', typeof waktuCheckin);

      statusDetail = generateAttendanceStatus(waktuCheckin);

      // 🧪 EXTRA DEBUG  
      console.log('🔍 EXTRA DEBUG - After generateAttendanceStatus:');
      console.log('- statusDetail:', statusDetail);
      console.log('- telat_menit:', statusDetail?.telat_menit);
      console.log('- telat_menit > 0:', statusDetail?.telat_menit > 0);

      // 🎯 FIX: SELALU SIMPAN 'hadir' DI STATUS UTAMA
      finalStatus = 'hadir'; // SELALU 'hadir', tidak ada 'terlambat' di status utama

      console.log('🎯 FINAL ATTENDANCE STATUS:', {
        waktuCheckin: waktuCheckin,
        finalStatus: finalStatus,
        statusDetail: statusDetail?.label,
        telatMenit: statusDetail?.telat_menit
      });
    }

    // Cek existing record
    const [absensi] = await promisePool.execute(
      'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
      [user_id, hariIni]
    );

    if (absensi.length > 0) {
      console.log('✅ Updated existing record with GPS');
      const record = absensi[0];
      await promisePool.execute(
        'UPDATE attendance SET status = ?, checkin_time = ?, latitude = ?, longitude = ?, photo = ?, reason = ?, status_detail = ?, telat_menit = ? WHERE id = ?',
        [finalStatus, waktuSekarang, latitude, longitude, photo, reason, statusDetail?.label || null, statusDetail?.telat_menit || 0, record.id]
      );
      return res.json({ success: true, message: 'Absensi diperbarui', data: record });
    }

    // INSERT BARU DENGAN GPS DATA
    const [result] = await promisePool.execute(
      'INSERT INTO attendance (user_id, date, status, checkin_time, latitude, longitude, photo, reason, status_detail, telat_menit) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [user_id, hariIni, finalStatus, waktuSekarang, latitude, longitude, photo, reason, statusDetail?.label || null, statusDetail?.telat_menit || 0]
    );

    console.log('✅ Absensi dengan GPS dicatat', result.insertId);
    return res.json({
      success: true,
      message: 'Absensi berhasil dicatat',
      data: {
        id: result.insertId,
        user_id: user_id,
        date: hariIni,
        status: finalStatus,
        checkin_time: waktuSekarang,
        checkout_time: null,
        latitude: latitude,
        longitude: longitude,
        photo: photo,
        reason: reason,
        status_detail: statusDetail?.label || null,
        telat_menit: statusDetail?.telat_menit || 0
      }
    });

  } catch (error) {
    console.error('❌ ERROR absen masuk:', error);
    res.status(500).json({ success: false, message: 'Kesalahan server: Gagal melakukan absensi masuk' });
  }
};

// ===================== ABSEN PULANG =====================
export const absenPulang = async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) {
      return res.status(400).json({ success: false, message: 'ID Pengguna wajib diisi' });
    }

    console.log('🚨 DEBUG ABSEN PULANG - START 🚨');

    // Waktu WITA
    const nowWita = moment().tz('Asia/Makassar');
    const hariIni = nowWita.format('YYYY-MM-DD');
    const waktuSekarang = nowWita.utc().format('YYYY-MM-DD HH:mm:ss');

    console.log('🕐 WITA Time:', { user_id, hariIni, waktuSekarang });

    // Cari record untuk user
    const [absensi] = await promisePool.execute(
      'SELECT * FROM attendance WHERE user_id = ? ORDER BY id DESC LIMIT 10',
      [user_id]
    );

    console.log('📊 ALL RECORDS FOUND:', absensi.length);

    // 🎯 FIX: CARI RECORD HARI INI
    const record = absensi.find(r => {
      if (!r.checkin_time) return false;

      const checkinMoment = moment(r.checkin_time).tz('Asia/Makassar');
      const checkinDateWita = checkinMoment.format('YYYY-MM-DD');
      const isToday = checkinDateWita === hariIni;

      console.log(`🔍 Checking record ${r.id}:`, {
        checkin_time: r.checkin_time,
        checkin_wita: checkinMoment.format('YYYY-MM-DD HH:mm:ss'),
        checkin_date: checkinDateWita,
        hari_ini: hariIni,
        isToday: isToday
      });

      return isToday;
    });

    console.log('✅ TODAY RECORD FOUND:', record ? record.id : 'NOT FOUND');

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Anda belum melakukan absensi masuk hari ini'
      });
    }

    if (record.checkout_time) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah melakukan absensi pulang hari ini'
      });
    }

    // 🎯 FIX: RELAX TIME VALIDATION - TAMBAH 1 MENIT BUFFER
    const checkinMoment = moment(record.checkin_time).tz('Asia/Makassar');
    const checkoutMoment = moment().tz('Asia/Makassar'); // PAKAI WITA, BUKAN UTC

    // Tambah buffer 1 menit untuk handle perbedaan timestamp
    const checkoutWithBuffer = checkoutMoment.add(1, 'minute');

    console.log('⏰ Time Validation:', {
      checkin: checkinMoment.format('YYYY-MM-DD HH:mm:ss'),
      checkout: checkoutMoment.format('YYYY-MM-DD HH:mm:ss'),
      checkout_with_buffer: checkoutWithBuffer.format('YYYY-MM-DD HH:mm:ss'),
      isValid: checkoutWithBuffer.isAfter(checkinMoment)
    });

    if (checkoutWithBuffer.isSameOrBefore(checkinMoment)) {
      return res.status(400).json({
        success: false,
        message: 'Waktu pulang tidak valid (harus setelah waktu masuk)'
      });
    }

    // UPDATE checkout_time (simpan sebagai UTC)
    const checkoutUTC = checkoutMoment.utc().format('YYYY-MM-DD HH:mm:ss');

    await promisePool.execute(
      'UPDATE attendance SET checkout_time = ? WHERE id = ?',
      [checkoutUTC, record.id]
    );

    console.log(`✅ Absensi pulang user ${user_id} berhasil: ${checkoutUTC} UTC`);

    return res.json({
      success: true,
      message: 'Absensi pulang berhasil dicatat',
      data: {
        id: record.id,
        tanggal: hariIni,
        waktu_pulang: checkoutUTC
      }
    });

  } catch (error) {
    console.error('❌ ERROR absen pulang:', error);
    res.status(500).json({
      success: false,
      message: 'Kesalahan server: Gagal melakukan absensi pulang'
    });
  }
};

// ===================== IZIN =====================
export const permohonanIzin = async (req, res) => {
  try {
    const { user_id, latitude, longitude, photo, status, reason } = req.body;

    // FIX: Gunakan WITA untuk tanggal
    const hariIni = moment().tz('Asia/Makassar').format('YYYY-MM-DD');

    // Validasi input
    if (!user_id || !status) {
      return res.status(400).json({
        success: false,
        message: 'ID Pengguna dan status wajib diisi'
      });
    }

    if (!['izin', 'sakit'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status harus izin atau sakit'
      });
    }

    // ✅ Validasi GPS & Foto untuk permohonan izin
    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Koordinat GPS wajib untuk izin/sakit'
      });
    }

    if (!photo || !photo.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'Foto selfie wajib untuk izin/sakit'
      });
    }

    // FIX: Cek apakah sudah ada absensi hari ini berdasarkan DATE
    const [existing] = await promisePool.execute(
      'SELECT * FROM attendance WHERE user_id = ? AND date = ?',
      [user_id, hariIni]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Anda sudah memiliki absensi hari ini'
      });
    }

    // ✅ Untuk IZIN/SAKIT: GPS wajib tapi TANPA pengecekan radius
    console.log(`📍 GPS tercatat untuk ${status.toUpperCase()}: ${latitude}, ${longitude}`);

    // Simpan permohonan izin dengan GPS & Foto
    const [result] = await promisePool.execute(
      `INSERT INTO attendance 
            (user_id, date, status, reason, latitude, longitude, photo) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user_id, hariIni, status, reason, latitude, longitude, photo]
    );

    console.log(`✅ Permohonan ${status} tercatat: untuk pengguna ${user_id}`);

    res.json({
      success: true,
      message: `Permohonan ${status} berhasil diajukan`,
      data: {
        id: result.insertId,
        tanggal: hariIni,
        status: status,
        lokasi: {
          latitude: latitude,
          longitude: longitude
        }
      }
    });

  } catch (error) {
    console.error('❌ Kesalahan permohonan izin:', error);
    res.status(500).json({
      success: false,
      message: 'Kesalahan server: Gagal mengajukan permohonan'
    });
  }
};


// ===================== GET TODAY ATTENDANCE =====================
export const dapatkanAbsensiHariIni = async (req, res) => {
  try {
    const { user_id } = req.params;
    // FIX: Gunakan WITA untuk tanggal hari ini
    const hariIni = moment().tz('Asia/Makassar').format('YYYY-MM-DD');

    const [absensi] = await promisePool.execute(
      `SELECT 
    a.*, 
    u.name,
    u.email,
    DATE_FORMAT(a.date, '%d/%m/%Y') as tanggal,
    DATE_FORMAT(a.checkin_time, '%H:%i') as jam_masuk,
    DATE_FORMAT(a.checkout_time, '%H:%i') as jam_pulang,
    a.status_detail,
    a.telat_menit
   FROM attendance a 
   JOIN users u ON a.user_id = u.id 
   WHERE a.user_id = ? AND a.date = ?`,
      [user_id, hariIni]
    );

    // FIX: Fallback untuk data existing yang belum punya date
    let result = absensi.length > 0 ? absensi[0] : null;

    if (!result) {
      const [fallback] = await promisePool.execute(
        `SELECT a.*, u.name 
         FROM attendance a 
         JOIN users u ON a.user_id = u.id 
         WHERE a.user_id = ? 
         ORDER BY a.id DESC LIMIT 1`,
        [user_id]
      );

      if (fallback.length > 0) {
        const record = fallback[0];
        const checkinWita = moment(record.checkin_time).tz('Asia/Makassar').format('YYYY-MM-DD');
        if (checkinWita === hariIni) {
          result = record;
          // Update date untuk record ini
          await promisePool.execute(
            'UPDATE attendance SET date = ? WHERE id = ?',
            [hariIni, record.id]
          );
        }
      }
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Kesalahan mengambil absensi hari ini:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil data absensi hari ini'
    });
  }
};

// ===================== GET HISTORY =====================
export const dapatkanRiwayatPengguna = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { bulan } = req.query; // Format: 2024-01

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'ID Pengguna diperlukan'
      });
    }

    let query = `
  SELECT 
    a.*, 
    u.name,
    u.email,
    DATE_FORMAT(a.date, '%d/%m/%Y') as tanggal,
    DATE_FORMAT(a.checkin_time, '%H:%i') as jam_masuk,
    DATE_FORMAT(a.checkout_time, '%H:%i') as jam_pulang,
    a.status_detail,
    a.telat_menit
  FROM attendance a 
  JOIN users u ON a.user_id = u.id 
  WHERE a.user_id = ?
`;

    let params = [user_id];

    if (bulan) {
      query += ' AND DATE_FORMAT(a.date, "%Y-%m") = ?';
      params.push(bulan);
    }

    query += ' ORDER BY a.date DESC, a.id DESC LIMIT 30';

    const [absensi] = await promisePool.execute(query, params);

    res.json({
      success: true,
      data: absensi
    });

  } catch (error) {
    console.error('Kesalahan mengambil riwayat:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil riwayat absensi'
    });
  }
};

// ===================== GET STATS =====================
export const dapatkanStatistikAbsensi = async (req, res) => {
  try {
    const { user_id } = req.params;
    const bulanSekarang = moment().tz('Asia/Makassar').format('YYYY-MM');

    console.log('🎯 MENGAMBIL STATISTIK DENGAN FIX QUERY 2:', {
      user_id,
      bulanSekarang
    });

    // 🎯 QUERY FIX: Hitung terlambat berdasarkan telat_menit > 0
    const [statistik] = await promisePool.execute(`
  SELECT 
    COUNT(CASE WHEN status = 'hadir' THEN 1 END) as total_hadir,
    COUNT(CASE WHEN status = 'izin' THEN 1 END) as izin,
    COUNT(CASE WHEN status = 'sakit' THEN 1 END) as sakit
  FROM attendance 
  WHERE user_id = ? 
  AND DATE_FORMAT(date, "%Y-%m") = ?
`, [user_id, bulanSekarang]);

    const data = statistik[0] || { total_hadir: 0, izin: 0, sakit: 0 };

    // 🎯 RESULT FIX: 
    const result = {
      hadir: data.total_hadir || 0,
      izin: data.izin || 0,
      sakit: data.sakit || 0
    };

    console.log('✅ STATISTIK FIX FINAL 2:', result);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ ERROR statistik:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik absensi',
      data: { hadir: 0, terlambat: 0, izin: 0, sakit: 0 }
    });
  }
};