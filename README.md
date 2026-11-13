# 📦 Master Packaging — Attendance System

Aplikasi Sistem Presensi dan Rekapitulasi Absensi Karyawan berbasis **Geolocation (GPS)** dan **Verifikasi Kamera Wajah** terintegrasi dengan Dashboard Administrator.

---

## 🌟 Fitur Utama

### 👤 Karyawan (Dine-in / Mobile Dashboard)
- **Otentikasi Akun**: Login melalui akun internal (username/password) atau Google OAuth.
- **Validasi Geolocation GPS**: Presensi kehadiran hanya bisa dilakukan bila karyawan berada dalam radius kantor yang ditentukan.
- **Foto Kamera Real-time**: Pengambilan foto wajah langsung melalui webcam/kamera smartphone saat check-in.
- **Deteksi Keterlambatan Otomatis**: Sistem otomatis menandai status *Tepat Waktu*, *Terlambat* (beserta durasi menitnya), atau *Izin*.
- **Pengajuan Izin / Sakit**: Form pengajuan izin kerja lengkap dengan catatan alasan.
- **Riwayat & Statistik**: Grafik dan histori kehadiran bulanan karyawan.

### 🛡️ Administrator (Admin Dashboard)
- **Live Monitoring Kehadiran**: Rekapitulasi siapa saja yang hadir, terlambat, izin, atau alfa hari ini.
- **Inspeksi Foto & Titik GPS**: Tombol preview foto kehadiran dan koordinat latitude/longitude presensi.
- **Filter Fleksibel**: Pencarian berdasarkan rentang tanggal dan status kehadiran.
- **Export Laporan**: Cetak / export data presensi ke format Excel & CSV.
- **Pengaturan Perusahaan**: Atur titik koordinat kantor, radius jangkauan presensi (meter), dan batas jam toleransi.

---

## 📁 Struktur Direktori

```text
masterpackaging/
├── Backend/
│   ├── config/             # Konfigurasi koneksi MySQL & Google OAuth
│   ├── controllers/        # Logika Auth, Absensi GPS/Foto, & Admin
│   ├── middleware/         # Middleware otentikasi & proteksi role
│   ├── routes/             # Endpoint rute Express.js
│   ├── .env                # File konfigurasi environment
│   ├── cleanup-photos.js   # Script maintenance foto
│   ├── package.json        # Manifest dependensi backend
│   └── server.js           # Server utama Express.js
├── Frontend/
│   ├── images/             # Logo & asset icon
│   ├── js/
│   │   └── api.js          # API Client & auto-detect URL localhost/production
│   ├── login.html          # Halaman login modern
│   ├── dashboard.html      # Dashboard absensi kamera & GPS karyawan
│   └── admin.html          # Dashboard administrator & export rekap
├── schema.sql              # Skema tabel database MySQL lengkap + dummy data
├── ANALISIS_KEKURANGAN.md  # Laporan evaluasi teknis proyek
└── README.md               # Dokumentasi proyek
```

---

## 🚀 Panduan Instalasi & Menjalankan Proyek

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (versi 16 ke atas)
- [MySQL Database Server](https://www.mysql.com/) (atau via XAMPP / Laragon)

### 2. Setup Database
1. Buka phpMyAdmin atau MySQL CLI.
2. Impor file **`schema.sql`** yang ada di root direktori:
   ```sql
   source D:/Project/masterpackaging/schema.sql;
   ```
   *(Skema ini otomatis membuat database `masterpackaging`, tabel `users`, `attendance`, `company_settings`, serta akun demo)*.

### 3. Konfigurasi Backend
1. Masuk ke folder `Backend`:
   ```bash
   cd Backend
   ```
2. Buat atau sesuaikan file **`.env`** (sesuaikan port & kredensial database):
   ```env
   PORT=5000
   NODE_ENV=development
   
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=masterpackaging
   
   # Admin Credentials
   ADMIN_EMAIL=admin@masterpackaging.com
   ADMIN_PASSWORD=admin123
   ```
3. Install dependensi:
   ```bash
   npm install
   ```
4. Jalankan backend:
   ```bash
   npm start
   # atau untuk mode dev:
   npm run dev
   ```

### 4. Akses Aplikasi di Browser
Buka browser dan buka:
- 🌐 **Halaman Login**: [http://localhost:5000/login.html](http://localhost:5000/login.html)
- 📊 **Dashboard Karyawan**: [http://localhost:5000/dashboard.html](http://localhost:5000/dashboard.html)
- 🛡️ **Panel Admin**: [http://localhost:5000/admin.html](http://localhost:5000/admin.html)

---

## 🔐 Akun Demo Siap Pakai

| Role | Username / Email | Password |
|---|---|---|
| **Admin** | `admin` *(atau admin@masterpackaging.com)* | `admin123` |
| **Karyawan** | `budi` *(atau budi@masterpackaging.com)* | `karyawan123` |

---

## 📄 Lisensi & Kontribusi
Proyek ini dikembangkan untuk kebutuhan internal Master Packaging Mataram.

