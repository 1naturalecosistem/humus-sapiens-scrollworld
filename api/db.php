<?php
// api/db.php — connessione DB, CORS e helper condivisi.
//
// Incluso da api/booking.php e da crm/dashboard.php. Non è un endpoint:
// richiamarlo direttamente dal browser risponde 404.
//
// Runtime: PHP 8.0+ con estensione pdo_mysql (Register.it).

// ---------------------------------------------------------------------
// CORS — deve stare prima di qualsiasi altra cosa.
//
// Il sito sta su GitHub Pages (humussapiens.onenaturalecosistem.com) e l'API
// su Register.it (onenaturalecosistem.com): sono due origini diverse, quindi
// ogni chiamata è cross-origin e senza questi header il browser la blocca.
// L'endpoint è pubblico e non usa cookie né token, perciò '*' non concede
// nulla che non si possa già ottenere con curl.
// ---------------------------------------------------------------------
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Max-Age: 86400");
header("X-Content-Type-Options: nosniff");

// Pre-flight: il browser chiede il permesso prima del POST vero.
// Si risponde con i soli header e si chiude qui.
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Blocca l'accesso diretto a /api/db.php
if (basename($_SERVER['SCRIPT_FILENAME'] ?? '') === basename(__FILE__)) {
    http_response_code(404);
    exit();
}

// ---------------------------------------------------------------------
// Credenziali
//
// Stanno in api/config.php, che NON è tracciato da git: il repository è
// pubblico, e una password dentro un file committato resta leggibile per
// sempre nella cronologia anche dopo averla cancellata.
// Il modello da copiare è api/config.example.php.
// ---------------------------------------------------------------------
$configPath = __DIR__ . '/config.php';

if (!is_file($configPath)) {
    error_log('[humus-api] api/config.php mancante: copia api/config.example.php e compilalo.');
    http_response_code(503);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "status"  => "error",
        "message" => "Servizio non configurato."
    ]);
    exit;
}

$config = require $configPath;

$host = $config['db_host'];
$db   = $config['db_name'];
$user = $config['db_user'];
$pass = $config['db_pass'];

// Casella che riceve la notifica interna di ogni nuova richiesta.
define('HS_MAIL_TO', $config['mail_to'] ?? 'hs.az.agri@gmail.com');

// Mittente delle email. DEVE essere una casella del dominio che spedisce,
// altrimenti SPF fallisce e la conferma finisce nello spam.
define('HS_MAIL_FROM', $config['mail_from'] ?? 'noreply@onenaturalecosistem.com');
define('HS_MAIL_FROM_NAME', 'Humus Sapiens');

// Credenziali del pannello CRM, lette dallo stesso file.
define('HS_CRM_USER', $config['crm_user'] ?? 'humus');
define('HS_CRM_HASH', $config['crm_hash'] ?? 'CHANGE_ME');

// Messaggi di errore dettagliati nella risposta HTTP. Lascia false in produzione.
define('HS_DEBUG', !empty($config['debug']));

date_default_timezone_set('Europe/Rome');

// Gli errori si scrivono nel log, mai a video: un warning PHP in mezzo alla
// risposta romperebbe il JSON e mostrerebbe i percorsi del server.
ini_set('display_errors', '0');
ini_set('log_errors', '1');

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        // Prepared statement veri: i dati viaggiano separati dal testo SQL.
        // È questo che ferma davvero la SQL injection, non l'escaping.
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (\PDOException $e) {
    error_log('[humus-api] Errore connessione DB: ' . $e->getMessage());
    http_response_code(503);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        "status"  => "error",
        "message" => HS_DEBUG
            ? "Errore Connessione DB: " . $e->getMessage()
            : "Servizio temporaneamente non disponibile. Riprova tra qualche minuto."
    ]);
    exit;
}

/** Restituisce la connessione PDO condivisa. */
function hs_db(): PDO
{
    global $pdo;
    return $pdo;
}

// ---------------------------------------------------------------------
// Helper JSON
//
// Il Content-Type si imposta QUI e non in cima al file: crm/dashboard.php
// include questo stesso db.php ma restituisce HTML, e dichiararlo JSON a
// monte manderebbe il browser a scaricare la pagina invece di mostrarla.
// ---------------------------------------------------------------------

/** Invia una risposta JSON e chiude la richiesta. */
function hs_json(array $payload, int $status = 200)
{
    http_response_code($status);
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Invia un errore. $detail finisce nel log; compare nella risposta solo con HS_DEBUG.
 * $fields contiene i messaggi campo per campo, che il form rimette accanto agli input.
 */
function hs_error(string $message, int $status = 400, array $fields = [], ?string $detail = null)
{
    if ($detail !== null) {
        error_log('[humus-api] ' . $detail);
    }

    $payload = ['success' => false, 'error' => $message];
    if ($fields !== []) {
        $payload['fields'] = $fields;
    }
    if ($detail !== null && HS_DEBUG) {
        $payload['detail'] = $detail;
    }

    hs_json($payload, $status);
}

/** Legge e decodifica il corpo JSON della richiesta. */
function hs_json_body(int $maxBytes = 65536): array
{
    $raw = file_get_contents('php://input');

    if ($raw === false || $raw === '') {
        hs_error('Corpo della richiesta vuoto.', 400);
    }
    if (strlen($raw) > $maxBytes) {
        hs_error('Richiesta troppo grande.', 413);
    }

    $data = json_decode($raw, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        hs_error('JSON non valido.', 400, [], json_last_error_msg());
    }
    if (!is_array($data)) {
        hs_error('Il payload deve essere un oggetto JSON.', 400);
    }

    return $data;
}

/** IP del client in forma binaria, per la colonna bookings.ip_address. */
function hs_client_ip_binary(): ?string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    if ($ip === '' || filter_var($ip, FILTER_VALIDATE_IP) === false) {
        return null;
    }

    $packed = @inet_pton($ip);
    return $packed === false ? null : $packed;
}
