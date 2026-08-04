<?php
// api/newsletter.php — POST /api/newsletter.php
//
// Iscrizione a "Radici". Non c'è una tabella a parte: un iscritto è un
// cliente con `marketing_optin = 1`, così l'anagrafica resta una sola e il
// CRM mostra in un colpo d'occhio chi ha comprato, chi ha soggiornato e chi
// legge soltanto.
//
// Corpo (application/json): { "email": "...", "first_name": "", "locale": "it", "website": "" }
// 200 → { success: true, message }

require_once __DIR__ . '/db.php';   // gestisce CORS e pre-flight OPTIONS

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST, OPTIONS');
    hs_error('Metodo non consentito. Usa POST.', 405);
}

define('HS_NEWS_THROTTLE_MAX', 10);
define('HS_NEWS_THROTTLE_WINDOW', 3600);

$input = hs_json_body();

// Honeypot
if (trim((string) ($input['website'] ?? '')) !== '') {
    hs_json(['success' => true, 'message' => 'Iscrizione registrata.'], 200);
}

$email  = mb_strtolower(trim((string) ($input['email'] ?? '')));
$locale = in_array(($input['locale'] ?? 'it'), ['it', 'en'], true) ? (string) $input['locale'] : 'it';

$firstName = trim((string) ($input['first_name'] ?? ''));
$firstName = mb_substr(preg_replace('/[\x00-\x1F\x7F]/u', '', $firstName), 0, 100);

if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false || mb_strlen($email) > 150) {
    hs_error('Inserisci un indirizzo email valido.', 422, [
        'email' => $locale === 'en' ? 'Enter a valid email address.' : 'Inserisci un indirizzo email valido.',
    ]);
}

$pdo = hs_db();

try {
    $existing = $pdo->prepare('SELECT `id`, `marketing_optin` FROM `customers` WHERE `email` = :email');
    $existing->execute([':email' => $email]);
    $row = $existing->fetch();

    if ($row === false) {
        // Un iscritto alla newsletter non ha ancora un nome: si mette un
        // segnaposto perché le colonne sono NOT NULL, e il CRM lo mostra
        // così com'è finché la persona non ordina o prenota davvero.
        $insert = $pdo->prepare(
            'INSERT INTO `customers`
               (`first_name`, `last_name`, `email`, `language`, `privacy_optin`, `marketing_optin`, `notes`)
             VALUES (:first_name, :last_name, :email, :language, 1, 1, :notes)'
        );
        $insert->execute([
            ':first_name' => $firstName !== '' ? $firstName : 'Iscritto',
            ':last_name'  => 'Radici',
            ':email'      => $email,
            ':language'   => $locale,
            ':notes'      => 'Iscrizione newsletter Radici dal sito.',
        ]);
    } else {
        // Già in anagrafica: si alza solo il consenso, senza toccare nome,
        // telefono o indirizzo raccolti da un ordine precedente.
        $update = $pdo->prepare(
            'UPDATE `customers`
                SET `marketing_optin` = 1, `language` = :language
              WHERE `id` = :id'
        );
        $update->execute([':language' => $locale, ':id' => (int) $row['id']]);
    }
} catch (\PDOException $e) {
    hs_error(
        $locale === 'en' ? 'Subscription failed. Please try again.' : 'Iscrizione non riuscita. Riprova.',
        500,
        [],
        'Newsletter insert failed: ' . $e->getMessage()
    );
}

// Avviso all'azienda. Se fallisce non è un problema: il consenso è già salvato.
@mail(
    HS_MAIL_TO,
    '=?UTF-8?B?' . base64_encode('[Radici] Nuova iscrizione') . '?=',
    "Nuova iscrizione alla newsletter Radici.\n\nEmail: {$email}\nLingua: {$locale}\n",
    implode("\r\n", [
        'From: ' . HS_MAIL_FROM_NAME . ' <' . HS_MAIL_FROM . '>',
        'Content-Type: text/plain; charset=UTF-8',
    ]),
    '-f' . HS_MAIL_FROM
);

hs_json([
    'success' => true,
    'message' => $locale === 'en'
        ? 'You are subscribed. Welcome to Radici.'
        : 'Iscrizione registrata. Benvenutə in Radici.',
]);
