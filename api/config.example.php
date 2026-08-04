<?php
// api/config.example.php — MODELLO. Questo file sta su GitHub; quello vero no.
//
// COSA FARE:
//   1. Copia questo file come  api/config.php
//   2. Metti dentro le credenziali vere
//   3. Carica SOLO api/config.php sul server via FTP
//
// api/config.php è elencato in .gitignore: non finirà mai in un commit.
// Il repository è pubblico, quindi qualunque password scritta in un file
// tracciato da git diventa leggibile da chiunque, per sempre — anche se la
// cancelli dopo, resta nella cronologia.

return [
    // --- Database (phpMyAdmin di Register.it) ---
    'db_host' => 'tb-be04-hclwebnx011.srv.teamblue-ops.net',
    'db_name' => 'onenat_xuwihu15',
    'db_user' => 'onenat_xuwihu15',
    'db_pass' => 'LA_TUA_PASSWORD_DB',

    // --- Email ---
    // Casella che riceve la notifica di ogni nuova richiesta.
    'mail_to' => 'hs.az.agri@gmail.com',
    // Mittente: DEVE essere una casella del dominio che spedisce, altrimenti
    // SPF fallisce e la conferma finisce nello spam.
    'mail_from' => 'noreply@onenaturalecosistem.com',

    // --- Accesso al CRM (crm/dashboard.php) ---
    'crm_user' => 'humus',
    // Hash generato con password_hash(). NON la password in chiaro.
    // Per generarlo: carica sul server un file temporaneo genera-hash.php con
    //   <?php echo password_hash('la-tua-password-scelta', PASSWORD_DEFAULT);
    // aprilo nel browser, copia la stringa qui sotto, poi CANCELLA quel file.
    'crm_hash' => 'CHANGE_ME',

    // Messaggi di errore dettagliati nelle risposte. Lascia false in produzione.
    'debug' => false,
];
