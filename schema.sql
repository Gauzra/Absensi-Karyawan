-- ============================================================
-- schema.sql — Skema Database MySQL untuk Master Packaging
-- ============================================================

CREATE DATABASE IF NOT EXISTS `masterpackaging`
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `masterpackaging`;

-- ------------------------------------------------------------
-- 1. Tabel: users (Akun Karyawan & Admin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) UNIQUE NULL,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) UNIQUE NOT NULL,
    `password` VARCHAR(255) NULL,
    `role` ENUM('admin', 'karyawan') DEFAULT 'karyawan',
    `photo_url` TEXT NULL,
    `google_id` VARCHAR(100) NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Default User & Admin Seeder
INSERT INTO `users` (`username`, `name`, `email`, `password`, `role`) VALUES 
('admin', 'Administrator Master Packaging', 'admin@masterpackaging.com', 'admin123', 'admin'),
('budi', 'Budi Santoso', 'budi@masterpackaging.com', 'karyawan123', 'karyawan')
ON DUPLICATE KEY UPDATE `email`=`email`;

-- ------------------------------------------------------------
-- 2. Tabel: company_settings (Pengaturan Lokasi Kantor & Toleransi)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `company_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `company_name` VARCHAR(150) DEFAULT 'Master Packaging Mataram',
    `latitude` DECIMAL(10, 8) DEFAULT -8.6051553,
    `longitude` DECIMAL(11, 8) DEFAULT 116.0939254,
    `radius_meters` INT DEFAULT 500,
    `tolerance_time` TIME DEFAULT '09:15:00',
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

INSERT INTO `company_settings` (`id`, `company_name`, `latitude`, `longitude`, `radius_meters`, `tolerance_time`)
VALUES (1, 'Master Packaging Mataram', -8.6051553, 116.0939254, 500, '09:15:00')
ON DUPLICATE KEY UPDATE `id`=1;

-- ------------------------------------------------------------
-- 3. Tabel: attendance (Riwayat Presensi Masuk, Pulang, & Izin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `attendance` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `date` DATE NOT NULL,
    `checkin_time` TIME NULL,
    `checkout_time` TIME NULL,
    `status` ENUM('hadir', 'terlambat', 'izin', 'alfa') DEFAULT 'hadir',
    `status_detail` VARCHAR(100) NULL,
    `telat_menit` INT DEFAULT 0,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `photo` LONGTEXT NULL, -- Simpan base64 foto kehadiran
    `notes` TEXT NULL,
    `leave_reason` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `fk_attendance_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Indeks untuk mempercepat pencarian data rekapitulasi absensi
CREATE INDEX `idx_attendance_date` ON `attendance` (`date`);
CREATE INDEX `idx_attendance_user_date` ON `attendance` (`user_id`, `date`);

