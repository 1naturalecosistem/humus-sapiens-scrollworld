-- ============================================================
-- DATABASE SCHEMA: CRM & BOOKING SYSTEM (Humus Sapiens)
-- Database Target: onenat_xuwihu15
-- ============================================================

USE `onenat_xuwihu15`;

-- ------------------------------------------------------------
-- 1. TABELLA CLIENTE / CRM
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `phone` VARCHAR(50),
  `address` TEXT,
  `city` VARCHAR(100),
  `country` VARCHAR(100) DEFAULT 'Italia',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. TABELLA CAMERE / STRUTTURE / SERVIZI
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `type` VARCHAR(50) DEFAULT 'Standard',
  `capacity` INT NOT NULL DEFAULT 2,
  `price_per_night` DECIMAL(10,2) NOT NULL,
  `description` TEXT,
  `status` ENUM('available', 'maintenance', 'occupied') DEFAULT 'available',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. TABELLA PRENOTAZIONI (Booking)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `check_in` DATE NOT NULL,
  `check_out` DATE NOT NULL,
  `total_price` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. INSERIMENTO STRUTTURA/CAMERA DI PROVA (DEFAULT)
-- ------------------------------------------------------------
INSERT INTO `rooms` (`id`, `name`, `type`, `capacity`, `price_per_night`, `description`) 
VALUES (1, 'Camera Principal Humus', 'Standard', 2, 80.00, 'Camera standard di prova')
ON DUPLICATE KEY UPDATE `id`=`id`;