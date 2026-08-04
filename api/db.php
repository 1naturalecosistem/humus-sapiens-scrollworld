<?php
// api/db.php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Credenziali ricavate dal tuo phpMyAdmin di Register.it
$host = 'tb-be04-hclwebnx011.srv.teamblue-ops.net'; 
$db   = 'onenat_xuwihu15';
$user = 'onenat_xuwihu15';
$pass = 'INSERISCI_LA_TUA_PASSWORD_DB'; // <-- Metti la tua password qui

try {
     $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
         PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
         PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
     ]);
} catch (\PDOException $e) {
     echo json_encode(["status" => "error", "message" => "Errore Connessione DB: " . $e->getMessage()]);
     exit;
}
?>