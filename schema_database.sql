-- ============================================================
-- DATABASE SCHEMA: CRM & BOOKING SYSTEM (Humus Sapiens)
-- Database Target: onenat_xuwihu15
--
-- Import: phpMyAdmin di Register.it > tab SQL > incolla tutto > Esegui.
-- Lo script è rieseguibile: crea le tabelle solo se mancano e aggiorna
-- il catalogo senza toccare le prenotazioni già registrate.
-- ============================================================

USE `onenat_xuwihu15`;

-- ------------------------------------------------------------
-- 0. RESET (opzionale)
--
-- `CREATE TABLE IF NOT EXISTS` non modifica una tabella che esiste già:
-- se hai importato una versione precedente dello schema, le colonne nuove
-- NON verranno aggiunte e l'API andrà in errore.
--
-- Togli il commento alle tre righe qui sotto SOLO se non hai ancora
-- prenotazioni vere da conservare: cancellano tutto e ricreano da zero.
-- ------------------------------------------------------------
-- DROP TABLE IF EXISTS `bookings`;
-- DROP TABLE IF EXISTS `rooms`;
-- DROP TABLE IF EXISTS `customers`;

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
  `language` CHAR(2) NOT NULL DEFAULT 'it',      -- lingua delle email di conferma
  `privacy_optin` TINYINT(1) NOT NULL DEFAULT 0, -- accettazione informativa (obbligatoria)
  `marketing_optin` TINYINT(1) NOT NULL DEFAULT 0, -- consenso esplicito, GDPR art. 7
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_customers_last_name` (`last_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 2. TABELLA CAMERE / STRUTTURE / SERVIZI
--
-- I prezzi qui sono l'unica fonte di verità: api/booking.php ricalcola
-- ogni totale da questa tabella e non si fida mai di quanto arriva dal
-- browser. Cambiare una tariffa si fa QUI, non nel codice.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(64) NOT NULL UNIQUE,            -- identificatore stabile inviato dal form
  `name` VARCHAR(100) NOT NULL,
  `name_en` VARCHAR(100) NOT NULL DEFAULT '',
  `type` VARCHAR(50) DEFAULT 'Standard',
  `capacity` INT NOT NULL DEFAULT 2,             -- numero massimo di ospiti
  `price_per_night` DECIMAL(10,2) NOT NULL,
  `min_nights` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `max_nights` SMALLINT UNSIGNED NOT NULL DEFAULT 60,
  `quantity` SMALLINT UNSIGNED NOT NULL DEFAULT 1, -- quante unità identiche esistono
  `description` TEXT,
  `description_en` TEXT,
  `sort_order` SMALLINT NOT NULL DEFAULT 0,
  -- 'available'   → prenotabile dal form
  -- 'coming_soon' → mostrata sul sito ma non selezionabile (agricampeggio)
  -- 'maintenance' / 'occupied' → nascosta al pubblico
  `status` ENUM('available', 'coming_soon', 'maintenance', 'occupied') DEFAULT 'available',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_rooms_status` (`status`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 3. TABELLA PRENOTAZIONI (Booking)
--
-- `unit_price` e `total_price` sono uno scatto fotografico del prezzo al
-- momento della richiesta: se domani alzi la tariffa, il preventivo che
-- hai dato oggi resta quello.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `bookings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `reference` VARCHAR(20) NOT NULL UNIQUE,       -- codice leggibile, es. HS-2026-4F7A2C
  `customer_id` INT NOT NULL,
  `room_id` INT NOT NULL,
  `check_in` DATE NOT NULL,
  `check_out` DATE NOT NULL,
  `nights` SMALLINT UNSIGNED AS (DATEDIFF(`check_out`, `check_in`)) STORED,
  `adults` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `children` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- tariffa/notte al momento della richiesta
  `total_price` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
  `guest_message` TEXT,                          -- testo libero scritto dall'ospite
  `internal_notes` TEXT,                         -- solo staff, non visibile all'ospite
  `locale` CHAR(2) NOT NULL DEFAULT 'it',
  `email_sent` TINYINT(1) NOT NULL DEFAULT 0,    -- 1 quando mail() ha accettato la conferma
  `ip_address` VARBINARY(16),                    -- INET6_ATON(), per il freno anti-abuso
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`room_id`) REFERENCES `rooms`(`id`) ON DELETE CASCADE,
  KEY `idx_bookings_room_dates` (`room_id`, `check_in`, `check_out`),
  KEY `idx_bookings_status` (`status`, `check_in`),
  KEY `idx_bookings_throttle` (`ip_address`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- 4. CATALOGO
--
-- [Fatto verificato] Ville: 300 €/notte, max 9 persone, minimo 2 notti.
-- [Fatto verificato] Agricampeggio: coming soon, non prenotabile.
--
-- Per cambiare una tariffa domani:
--   UPDATE `rooms` SET `price_per_night` = 330.00 WHERE `slug` = 'villa-levante';
-- Per aprire l'agricampeggio quando è pronto:
--   UPDATE `rooms` SET `status` = 'available' WHERE `slug` = 'piazzola-food-forest';
-- ------------------------------------------------------------
INSERT INTO `rooms`
  (`slug`, `name`, `name_en`, `type`, `capacity`, `price_per_night`,
   `min_nights`, `max_nights`, `quantity`, `description`, `description_en`,
   `sort_order`, `status`)
VALUES
  ('villa-levante', 'Villa Levante', 'Villa Levante', 'Villa', 9, 300.00,
   2, 30, 1,
   'Villa indipendente in agriturismo, a 672 m s.l.m. dentro la Rete Natura 2000.',
   'Independent farmhouse villa at 672 m, inside the Natura 2000 network.',
   10, 'available'),

  ('villa-ponente', 'Villa Ponente', 'Villa Ponente', 'Villa', 9, 300.00,
   2, 30, 1,
   'Villa indipendente in agriturismo, affacciata sulla food forest in sviluppo.',
   'Independent farmhouse villa overlooking the growing food forest.',
   20, 'available'),

  ('piazzola-food-forest', 'Piazzola nella Food Forest', 'Food Forest Pitch',
   'Agricampeggio', 4, 0.00,
   1, 21, 8,
   'Otto piazzole da 20 m² immerse nella food forest. In apertura.',
   'Eight 20 m² pitches inside the food forest. Opening soon.',
   30, 'coming_soon')
ON DUPLICATE KEY UPDATE
  `name`            = VALUES(`name`),
  `name_en`         = VALUES(`name_en`),
  `type`            = VALUES(`type`),
  `capacity`        = VALUES(`capacity`),
  `price_per_night` = VALUES(`price_per_night`),
  `min_nights`      = VALUES(`min_nights`),
  `max_nights`      = VALUES(`max_nights`),
  `quantity`        = VALUES(`quantity`),
  `sort_order`      = VALUES(`sort_order`),
  `status`          = VALUES(`status`);

-- Rimuove la camera di prova se un import precedente l'aveva creata.
DELETE FROM `rooms`
 WHERE `name` = 'Camera Principal Humus'
   AND `id` NOT IN (SELECT DISTINCT `room_id` FROM (SELECT `room_id` FROM `bookings`) AS b);
