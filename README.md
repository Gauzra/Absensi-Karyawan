# Absesnsi Karyawan Sederhana

Aplikasi web sistem absensi untuk karyawan, dibangun menggunakan arsitektur *monorepo* sederhana dengan pemisahan folder Backend dan Frontend.

## 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Backend:** Node.js, Express.js
* **Database & Lainnya:** MySQL, REST API, JSON Web Token (JWT) / Authentication Middleware

---

## 📁 Struktur Project

```text
masterpackaging/
├── Backend/
│   ├── config/          # Konfigurasi database & koneksi
│   ├── controllers/     # Logika bisnis (admin, attendance, auth)
│   ├── middleware/      # Middleware autentikasi & keamanan
│   ├── routes/          # Definisi endpoint API
│   ├── .env             # Variabel lingkungan (Environment variables)
│   ├── package.json     # Dependensi backend
│   └── server.js        # Entry point server backend
└── Frontend/
    ├── images/          # Aset gambar, ikon, dan logo
    ├── js/              # Skrip JavaScript klien (API handler, dll)
    ├── admin.html       # Halaman panel admin
    ├── dashboard.html   # Halaman dashboard utama
    └── login.html       # Halaman autentikasi masuk

```
🚀 Cara Menjalankan Project (Installation & Setup)
Ikuti langkah-langkah di bawah ini untuk menjalankan project secara lokal di komputer kamu:

1. Clone Repository
git clone [https://github.com/USERNAME/Absensi-Karyawan.git](https://github.com/USERNAME/Absensi-Karyawan.git)
cd masterpackaging

2. Konfigurasi Backend
Masuk ke direktori Backend dan instal dependensi yang dibutuhkan:
cd Backend
npm install

3. Konfigurasi Environment (.env)
Buat file .env di dalam folder Backend jika belum ada, lalu sesuaikan konfigurasi berikut:
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=nama_database_kamu
JWT_SECRET=rahasia_kode_kamu

4. Jalankan Server Backend
Bash
npm run dev
# atau
node server.js
(Server backend biasanya akan berjalan di http://localhost:5000)

5. Jalankan Frontend
Kamu bisa membuka folder Frontend menggunakan ekstensi Live Server di VS Code.
Atau buka langsung file login.html di browser pilihanmu.

📌 Fitur Utama
Autentikasi Pengguna: Sistem Login yang aman menggunakan Middleware.
Manajemen Admin: Pengaturan data dan kontrol administratif (admin.html).
Sistem Absensi: Pencatatan kehadiran terintegrasi dengan backend (attendance).
Dashboard Interaktif: Antarmuka pengguna berbasis HTML/JS murni yang responsif.

📄 License
Project ini dibuat untuk kebutuhan internal / pengembangan bisnis Master Packaging.

### Cara Memasukkannya ke Project:
1. Di VS Code, buat file baru di dalam folder `masterpackaging` dengan nama **`README.md`**.
2. Salin teks di atas dan *paste* ke dalam file tersebut, lalu simpan (`Ctrl + S`).
3. Setelah itu, kamu bisa melanjutkan proses *commit* dan *push* ke GitHub dengan perintah:
   git add README.md
   git commit -m "docs: add comprehensive README.md"
   git push origin main
