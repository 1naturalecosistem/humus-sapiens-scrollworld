<?php
// crm/dashboard.php — Pannello prenotazioni Humus Sapiens
//
// Mostra richieste in arrivo, anagrafica clienti e permette di cambiare lo
// stato di una prenotazione. Protetto da autenticazione HTTP Basic.
//
// PRIMA DI PUBBLICARLO: imposta 'crm_hash' in api/config.php. Finché vale
// 'CHANGE_ME' il pannello rifiuta qualsiasi accesso — è il comportamento
// giusto per una pagina che contiene dati personali degli ospiti.
//
// L'hash si genera con password_hash(): le istruzioni sono in
// api/config.example.php. Qui non c'è nessuna password perché questo file
// è pubblico su GitHub.

require_once __DIR__ . '/../api/db.php';

// ---------------------------------------------------------------------
// Accesso — utente e hash arrivano da api/config.php
// ---------------------------------------------------------------------
function crm_deny(string $reason = 'Autenticazione richiesta.')
{
    header('WWW-Authenticate: Basic realm="Humus Sapiens CRM", charset="UTF-8"');
    http_response_code(401);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><meta charset="utf-8"><title>Accesso negato</title>'
       . '<body style="font-family:system-ui;padding:3rem;background:#F5F3E9;color:#1A3626">'
       . '<h1 style="font-weight:400">Accesso negato</h1><p>'
       . htmlspecialchars($reason, ENT_QUOTES) . '</p>';
    exit;
}

if (HS_CRM_HASH === 'CHANGE_ME' || HS_CRM_HASH === '') {
    crm_deny('CRM non ancora configurato: imposta \'crm_hash\' in api/config.php.');
}

$authUser = $_SERVER['PHP_AUTH_USER'] ?? '';
$authPass = $_SERVER['PHP_AUTH_PW'] ?? '';

// Su alcune configurazioni CGI/FastCGI (Register.it compresa) PHP_AUTH_* non
// arriva: si recuperano le credenziali dall'header grezzo.
if ($authUser === '' && isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $decoded = base64_decode(substr($_SERVER['HTTP_AUTHORIZATION'], 6), true);
    if ($decoded !== false && strpos($decoded, ':') !== false) {
        list($authUser, $authPass) = explode(':', $decoded, 2);
    }
}

// hash_equals e password_verify lavorano a tempo costante: non lasciano
// capire dalla durata della risposta quanto della password era giusto.
if (!hash_equals(HS_CRM_USER, $authUser) || !password_verify($authPass, HS_CRM_HASH)) {
    crm_deny();
}

$pdo = hs_db();

// ---------------------------------------------------------------------
// Token CSRF — i pulsanti di stato scrivono, quindi serve
// ---------------------------------------------------------------------
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
$csrf = $_SESSION['csrf'];

$flash = null;

// ---------------------------------------------------------------------
// Scrittura: cambio stato di una prenotazione
// ---------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($csrf, $_POST['csrf'] ?? '')) {
        http_response_code(403);
        $flash = ['type' => 'error', 'text' => 'Token di sicurezza non valido. Ricarica la pagina.'];
    } else {
        $bookingId = filter_input(INPUT_POST, 'booking_id', FILTER_VALIDATE_INT);
        $orderId   = filter_input(INPUT_POST, 'order_id', FILTER_VALIDATE_INT);
        $variantId = filter_input(INPUT_POST, 'variant_id', FILTER_VALIDATE_INT);
        $newStatus = $_POST['status'] ?? '';

        if ($bookingId && in_array($newStatus, ['pending', 'confirmed', 'cancelled', 'completed'], true)) {
            $upd = $pdo->prepare('UPDATE `bookings` SET `status` = :status WHERE `id` = :id');
            $upd->execute([':status' => $newStatus, ':id' => $bookingId]);
            $flash = ['type' => 'ok', 'text' => 'Prenotazione #' . $bookingId . ' → ' . $newStatus . '.'];
        } elseif ($orderId && in_array($newStatus, ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'], true)) {
            $upd = $pdo->prepare('UPDATE `orders` SET `status` = :status WHERE `id` = :id');
            $upd->execute([':status' => $newStatus, ':id' => $orderId]);
            $flash = ['type' => 'ok', 'text' => 'Ordine #' . $orderId . ' → ' . $newStatus . '.'];
        } elseif ($orderId && in_array($newStatus, ['unpaid', 'paid', 'refunded'], true)) {
            $upd = $pdo->prepare('UPDATE `orders` SET `payment_status` = :status WHERE `id` = :id');
            $upd->execute([':status' => $newStatus, ':id' => $orderId]);
            $flash = ['type' => 'ok', 'text' => 'Pagamento ordine #' . $orderId . ' → ' . $newStatus . '.'];
        } elseif ($variantId && in_array($newStatus, ['available', 'sold_out'], true)) {
            // Esaurito/disponibile dal pannello: il sito lo recepisce subito,
            // senza dover entrare in phpMyAdmin.
            $upd = $pdo->prepare('UPDATE `product_variants` SET `status` = :status WHERE `id` = :id');
            $upd->execute([':status' => $newStatus, ':id' => $variantId]);
            $flash = ['type' => 'ok', 'text' => 'Formato #' . $variantId . ' → ' . $newStatus . '.'];
        } else {
            $flash = ['type' => 'error', 'text' => 'Richiesta non valida.'];
        }
    }
}

// ---------------------------------------------------------------------
// Lettura: filtri, statistiche, elenchi
// ---------------------------------------------------------------------
$view = in_array(($_GET['view'] ?? 'bookings'), ['bookings', 'orders', 'customers', 'catalog'], true)
    ? $_GET['view'] : 'bookings';
$statusFilter = in_array(
    ($_GET['status'] ?? ''),
    ['pending', 'confirmed', 'cancelled', 'completed', 'shipped', 'delivered'],
    true
) ? $_GET['status'] : '';
$search = trim($_GET['q'] ?? '');

$stats = $pdo->query(
    'SELECT
        COUNT(*) AS total,
        SUM(`status` = \'pending\')   AS pending,
        SUM(`status` = \'confirmed\') AS confirmed,
        COALESCE(SUM(CASE WHEN `status` IN (\'confirmed\',\'completed\')
                          THEN `total_price` ELSE 0 END), 0) AS revenue,
        COALESCE(SUM(CASE WHEN `status` IN (\'confirmed\',\'completed\')
                          THEN `nights` ELSE 0 END), 0)      AS nights_sold
     FROM `bookings`'
)->fetch();

if ($stats === false) {
    $stats = ['total' => 0, 'pending' => 0, 'confirmed' => 0, 'revenue' => 0, 'nights_sold' => 0];
}

$customersTotal = (int) $pdo->query('SELECT COUNT(*) FROM `customers`')->fetchColumn();

$orderStats = $pdo->query(
    'SELECT
        COUNT(*) AS total,
        SUM(`status` = \'pending\') AS pending,
        COALESCE(SUM(CASE WHEN `status` <> \'cancelled\' THEN `total_price` ELSE 0 END), 0) AS revenue
     FROM `orders`'
)->fetch();

if ($orderStats === false) {
    $orderStats = ['total' => 0, 'pending' => 0, 'revenue' => 0];
}

$newsletterTotal = (int) $pdo->query(
    'SELECT COUNT(*) FROM `customers` WHERE `marketing_optin` = 1'
)->fetchColumn();

$bookings  = [];
$customers = [];
$orders    = [];
$catalog   = [];

if ($view === 'bookings') {
    $sql = 'SELECT b.*, c.`first_name`, c.`last_name`, c.`email`, c.`phone`, c.`country`,
                   r.`name` AS room_name, r.`type` AS room_type
              FROM `bookings` b
              JOIN `customers` c ON c.`id` = b.`customer_id`
              JOIN `rooms` r     ON r.`id` = b.`room_id`
             WHERE 1 = 1';
    $params = [];

    if ($statusFilter !== '') {
        $sql .= ' AND b.`status` = :status';
        $params[':status'] = $statusFilter;
    }
    if ($search !== '') {
        $sql .= ' AND (c.`last_name` LIKE :q OR c.`first_name` LIKE :q
                       OR c.`email` LIKE :q OR b.`reference` LIKE :q)';
        $params[':q'] = '%' . $search . '%';
    }

    $sql .= ' ORDER BY b.`created_at` DESC LIMIT 200';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $bookings = $stmt->fetchAll();
} elseif ($view === 'orders') {
    $sql = 'SELECT o.*, c.`first_name`, c.`last_name`, c.`email`, c.`phone`
              FROM `orders` o
              JOIN `customers` c ON c.`id` = o.`customer_id`
             WHERE 1 = 1';
    $params = [];

    if ($statusFilter !== '') {
        $sql .= ' AND o.`status` = :status';
        $params[':status'] = $statusFilter;
    }
    if ($search !== '') {
        $sql .= ' AND (c.`last_name` LIKE :q OR c.`first_name` LIKE :q
                       OR c.`email` LIKE :q OR o.`reference` LIKE :q)';
        $params[':q'] = '%' . $search . '%';
    }

    $sql .= ' ORDER BY o.`created_at` DESC LIMIT 200';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $orders = $stmt->fetchAll();

    // Le righe si caricano in una query sola per tutti gli ordini mostrati:
    // una query per ordine significherebbe 200 interrogazioni per pagina.
    if ($orders !== []) {
        $ids = array_column($orders, 'id');
        $in  = implode(',', array_fill(0, count($ids), '?'));
        $itemsStmt = $pdo->prepare(
            'SELECT `order_id`, `product_name`, `size_label`, `quantity`, `line_total`
               FROM `order_items` WHERE `order_id` IN (' . $in . ') ORDER BY `id`'
        );
        $itemsStmt->execute($ids);

        $itemsByOrder = [];
        foreach ($itemsStmt->fetchAll() as $item) {
            $itemsByOrder[(int) $item['order_id']][] = $item;
        }
        foreach ($orders as $i => $o) {
            $orders[$i]['items'] = $itemsByOrder[(int) $o['id']] ?? [];
        }
    }
} elseif ($view === 'catalog') {
    $catalog = $pdo->query(
        'SELECT p.`slug`, p.`name`, p.`status` AS product_status, p.`accent`,
                v.`id` AS variant_id, v.`sku`, v.`size_label`, v.`price`, v.`stock`,
                v.`status` AS variant_status,
                COALESCE(s.`sold`, 0) AS sold
           FROM `products` p
           LEFT JOIN `product_variants` v ON v.`product_id` = p.`id`
           LEFT JOIN (
                SELECT i.`variant_id`, SUM(i.`quantity`) AS sold
                  FROM `order_items` i
                  JOIN `orders` o ON o.`id` = i.`order_id`
                 WHERE o.`status` <> \'cancelled\'
                 GROUP BY i.`variant_id`
           ) s ON s.`variant_id` = v.`id`
          ORDER BY p.`sort_order`, p.`id`, v.`sort_order`, v.`id`'
    )->fetchAll();
} else {
    $sql = 'SELECT c.*,
                   COUNT(b.`id`) AS total_bookings,
                   COALESCE(SUM(b.`total_price`), 0) AS lifetime_value,
                   MAX(b.`check_in`) AS last_stay
              FROM `customers` c
              LEFT JOIN `bookings` b ON b.`customer_id` = c.`id`
                                    AND b.`status` IN (\'confirmed\', \'completed\')
             WHERE 1 = 1';
    $params = [];

    if ($search !== '') {
        $sql .= ' AND (c.`last_name` LIKE :q OR c.`first_name` LIKE :q OR c.`email` LIKE :q)';
        $params[':q'] = '%' . $search . '%';
    }

    $sql .= ' GROUP BY c.`id` ORDER BY c.`created_at` DESC LIMIT 200';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $customers = $stmt->fetchAll();
}

/** Tutto ciò che finisce in pagina passa da qui. */
function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function money($amount): string
{
    return '€ ' . number_format((float) $amount, 2, ',', '.');
}

function day(?string $date): string
{
    if ($date === null || $date === '' || strpos($date, '0000') === 0) {
        return '—';
    }
    return date('d/m/Y', strtotime($date));
}

$statusLabels = [
    'pending'   => 'In attesa',
    'confirmed' => 'Confermata',
    'cancelled' => 'Annullata',
    'completed' => 'Conclusa',
];

$orderStatusLabels = [
    'pending'   => 'In attesa',
    'confirmed' => 'Confermato',
    'shipped'   => 'Spedito',
    'delivered' => 'Consegnato',
    'cancelled' => 'Annullato',
];

$paymentLabels = [
    'unpaid'   => 'Da pagare',
    'paid'     => 'Pagato',
    'refunded' => 'Rimborsato',
];

// Mantiene i filtri attivi quando un pulsante di stato fa il POST.
$returnQuery = http_build_query(array_filter([
    'view'   => $view,
    'status' => $statusFilter,
    'q'      => $search,
]));

header('Content-Type: text/html; charset=utf-8');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store, private');
?>
<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>CRM · Humus Sapiens</title>
<style>
  :root {
    --paper:  #F5F3E9;
    --forest: #1A3626;
    --honey:  #D48924;
    --sage:   #D3D9C9;
    --line:   rgba(26, 54, 38, 0.14);
    --shadow: 0 12px 40px rgba(26, 54, 38, 0.08);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--paper);
    color: var(--forest);
    font-family: "Figtree", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    font-weight: 300;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2 { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 300; margin: 0; }

  .label {
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 0.65rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
  }

  header.top { background: var(--forest); color: var(--paper); padding: 2rem 1.5rem; }
  header.top .inner { max-width: 1400px; margin: 0 auto; }
  header.top h1 { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.05; }
  header.top .label { color: var(--honey); display: block; margin-bottom: 0.75rem; }
  header.top .sub { opacity: 0.65; font-size: 0.9rem; margin-top: 0.5rem; }

  main { max-width: 1400px; margin: 0 auto; padding: 2rem 1.5rem 5rem; }

  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
           gap: 1rem; margin-bottom: 2.5rem; }
  .stat { background: #fff; border: 1px solid var(--line); border-radius: 1rem;
          padding: 1.25rem; box-shadow: var(--shadow); }
  .stat .label { color: rgba(26, 54, 38, 0.55); }
  .stat .value { font-family: "Cormorant Garamond", Georgia, serif; font-size: 2.1rem;
                 line-height: 1.1; margin-top: 0.4rem; }
  .stat.accent { background: var(--sage); }

  .toolbar { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; margin-bottom: 1.75rem; }
  .tab, .chip {
    display: inline-block; padding: 0.5rem 1rem; border: 1px solid var(--line);
    border-radius: 999px; background: #fff; color: var(--forest); text-decoration: none;
    font-size: 0.82rem;
    transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease;
  }
  .tab:hover, .chip:hover { border-color: var(--forest); }
  .tab[aria-current="page"], .chip[aria-current="true"] {
    background: var(--forest); color: var(--paper); border-color: var(--forest);
  }

  form.search { margin-left: auto; display: flex; gap: 0.5rem; }
  form.search input {
    padding: 0.5rem 0.9rem; border: 1px solid var(--line); border-radius: 999px;
    background: #fff; font: inherit; font-size: 0.85rem; color: inherit; min-width: 200px;
  }
  form.search input:focus { outline: 2px solid var(--honey); outline-offset: 1px; }
  form.search button {
    padding: 0.5rem 1.1rem; border: none; border-radius: 999px; background: var(--honey);
    color: #fff; font: inherit; font-size: 0.85rem; cursor: pointer;
    transition: background-color 0.18s ease;
  }
  form.search button:hover { background: #b8741c; }

  .flash { padding: 0.85rem 1.15rem; border-radius: 0.75rem; margin-bottom: 1.5rem;
           font-size: 0.9rem; border: 1px solid; }
  .flash.ok    { background: var(--sage); border-color: rgba(26, 54, 38, 0.25); }
  .flash.error { background: #f6dede; border-color: #c0392b; color: #7d241a; }

  .table-wrap { background: #fff; border: 1px solid var(--line); border-radius: 1rem;
                box-shadow: var(--shadow); overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 900px; }
  thead th {
    text-align: left; padding: 1rem; background: var(--sage);
    font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 0.62rem;
    letter-spacing: 0.14em; text-transform: uppercase; font-weight: 400; white-space: nowrap;
  }
  tbody td { padding: 1rem; border-top: 1px solid var(--line); vertical-align: top; }
  tbody tr:hover { background: rgba(211, 217, 201, 0.28); }
  .mono { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 0.78rem; }
  .muted { color: rgba(26, 54, 38, 0.55); font-size: 0.8rem; }
  .strong { font-weight: 400; }
  a.link { color: var(--forest); text-decoration: underline; text-underline-offset: 2px; }

  .badge { display: inline-block; padding: 0.22rem 0.6rem; border-radius: 999px;
           font-size: 0.7rem; white-space: nowrap; border: 1px solid transparent; }
  .badge.pending   { background: #fdf0da; color: #8a5a10; border-color: #e6c68a; }
  .badge.confirmed { background: var(--sage); color: #1A3626; border-color: #a9b79b; }
  .badge.cancelled { background: #f2e3e1; color: #8b3a2e; border-color: #d8b2ab; }
  .badge.completed { background: #e2e6ef; color: #35405a; border-color: #b3bccf; }

  .actions { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .actions button {
    border: 1px solid var(--line); background: #fff; border-radius: 999px;
    padding: 0.3rem 0.7rem; font: inherit; font-size: 0.72rem; color: var(--forest);
    cursor: pointer; transition: background-color 0.18s ease, color 0.18s ease;
  }
  .actions button:hover { background: var(--forest); color: var(--paper); }
  .actions button.danger:hover { background: #8b3a2e; border-color: #8b3a2e; }

  .empty { padding: 4rem 1.5rem; text-align: center; color: rgba(26, 54, 38, 0.55); }

  footer.foot { max-width: 1400px; margin: 0 auto; padding: 0 1.5rem 3rem;
                font-size: 0.75rem; color: rgba(26, 54, 38, 0.5); }

  /* Su telefono la tabella larga diventa una pila di schede. */
  @media (max-width: 720px) {
    table, thead, tbody, tr, td { display: block; width: 100%; min-width: 0; }
    thead { display: none; }
    tbody tr { border-top: 1px solid var(--line); padding: 0.75rem 0; }
    tbody td { border: none; padding: 0.3rem 1rem; }
    tbody td::before {
      content: attr(data-label); display: block;
      font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 0.6rem;
      letter-spacing: 0.14em; text-transform: uppercase;
      color: rgba(26, 54, 38, 0.5); margin-bottom: 0.15rem;
    }
    form.search { margin-left: 0; width: 100%; }
    form.search input { flex: 1; min-width: 0; }
  }

  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
</head>
<body>

<header class="top">
  <div class="inner">
    <span class="label">Humus Sapiens · Pannello prenotazioni</span>
    <h1>Chi arriva, quando, quanto</h1>
    <p class="sub">Azienda Agricola “Humus Sapiens” · Loc. Baresi 15, Castiglione Chiavarese (GE) · CIN IT010013B5EKQITTKX</p>
  </div>
</header>

<main>

  <?php if ($flash !== null): ?>
    <div class="flash <?= e($flash['type']) ?>"><?= e($flash['text']) ?></div>
  <?php endif; ?>

  <section class="stats">
    <div class="stat accent"><span class="label">Prenotazioni da evadere</span><div class="value"><?= (int) $stats['pending'] ?></div></div>
    <div class="stat accent"><span class="label">Ordini da evadere</span><div class="value"><?= (int) $orderStats['pending'] ?></div></div>
    <div class="stat"><span class="label">Notti vendute</span><div class="value"><?= (int) $stats['nights_sold'] ?></div></div>
    <div class="stat"><span class="label">Valore soggiorni</span><div class="value"><?= e(money($stats['revenue'])) ?></div></div>
    <div class="stat"><span class="label">Valore ordini</span><div class="value"><?= e(money($orderStats['revenue'])) ?></div></div>
    <div class="stat"><span class="label">Clienti</span><div class="value"><?= $customersTotal ?></div></div>
    <div class="stat"><span class="label">Iscritti Radici</span><div class="value"><?= $newsletterTotal ?></div></div>
  </section>

  <nav class="toolbar">
    <a class="tab" href="?view=bookings" <?= $view === 'bookings' ? 'aria-current="page"' : '' ?>>Prenotazioni</a>
    <a class="tab" href="?view=orders" <?= $view === 'orders' ? 'aria-current="page"' : '' ?>>Ordini</a>
    <a class="tab" href="?view=customers" <?= $view === 'customers' ? 'aria-current="page"' : '' ?>>Clienti</a>
    <a class="tab" href="?view=catalog" <?= $view === 'catalog' ? 'aria-current="page"' : '' ?>>Catalogo</a>

    <?php if ($view === 'bookings' || $view === 'orders'): ?>
      <?php $chips = $view === 'orders' ? $orderStatusLabels : $statusLabels; ?>
      <span style="width:1px;height:24px;background:var(--line);margin:0 0.4rem"></span>
      <a class="chip" href="?view=<?= e($view) ?>" <?= $statusFilter === '' ? 'aria-current="true"' : '' ?>>Tutti</a>
      <?php foreach ($chips as $key => $lbl): ?>
        <a class="chip" href="?view=<?= e($view) ?>&amp;status=<?= e($key) ?>"
           <?= $statusFilter === $key ? 'aria-current="true"' : '' ?>><?= e($lbl) ?></a>
      <?php endforeach; ?>
    <?php endif; ?>

    <?php if ($view !== 'catalog'): ?>
      <form class="search" method="get" action="">
        <input type="hidden" name="view" value="<?= e($view) ?>">
        <?php if ($statusFilter !== ''): ?>
          <input type="hidden" name="status" value="<?= e($statusFilter) ?>">
        <?php endif; ?>
        <input type="search" name="q" value="<?= e($search) ?>" placeholder="Nome, email, riferimento…" aria-label="Cerca">
        <button type="submit">Cerca</button>
      </form>
    <?php endif; ?>
  </nav>

  <?php if ($view === 'bookings'): ?>

    <div class="table-wrap">
      <?php if ($bookings === []): ?>
        <p class="empty">Nessuna prenotazione con questi filtri.</p>
      <?php else: ?>
      <table>
        <thead>
          <tr>
            <th>Riferimento</th><th>Ospite</th><th>Sistemazione</th><th>Soggiorno</th>
            <th>Ospiti</th><th>Totale</th><th>Stato</th><th>Azioni</th>
          </tr>
        </thead>
        <tbody>
        <?php foreach ($bookings as $b): ?>
          <tr>
            <td data-label="Riferimento">
              <span class="mono strong"><?= e($b['reference']) ?></span><br>
              <span class="muted"><?= e(day($b['created_at'])) ?></span>
              <?php if ((int) $b['email_sent'] === 0): ?>
                <br><span class="muted" title="Email di conferma non inviata">✉ non inviata</span>
              <?php endif; ?>
            </td>
            <td data-label="Ospite">
              <span class="strong"><?= e($b['first_name'] . ' ' . $b['last_name']) ?></span><br>
              <a class="link muted" href="mailto:<?= e($b['email']) ?>"><?= e($b['email']) ?></a>
              <?php if (!empty($b['phone'])): ?>
                <br><a class="link muted" href="tel:<?= e($b['phone']) ?>"><?= e($b['phone']) ?></a>
              <?php endif; ?>
            </td>
            <td data-label="Sistemazione">
              <?= e($b['room_name']) ?><br>
              <span class="muted"><?= e($b['room_type']) ?></span>
            </td>
            <td data-label="Soggiorno">
              <?= e(day($b['check_in'])) ?> → <?= e(day($b['check_out'])) ?><br>
              <span class="muted"><?= (int) $b['nights'] ?> notti · <?= e(money($b['unit_price'])) ?>/notte</span>
            </td>
            <td data-label="Ospiti">
              <?= (int) $b['adults'] ?> ad.<?php if ((int) $b['children'] > 0): ?> + <?= (int) $b['children'] ?> bamb.<?php endif; ?>
            </td>
            <td data-label="Totale"><span class="strong"><?= e(money($b['total_price'])) ?></span></td>
            <td data-label="Stato">
              <span class="badge <?= e($b['status']) ?>"><?= e($statusLabels[$b['status']] ?? $b['status']) ?></span>
            </td>
            <td data-label="Azioni">
              <form method="post" action="?<?= e($returnQuery) ?>" class="actions">
                <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
                <input type="hidden" name="booking_id" value="<?= (int) $b['id'] ?>">
                <?php if ($b['status'] !== 'confirmed'): ?>
                  <button type="submit" name="status" value="confirmed">Conferma</button>
                <?php endif; ?>
                <?php if ($b['status'] !== 'completed'): ?>
                  <button type="submit" name="status" value="completed">Conclusa</button>
                <?php endif; ?>
                <?php if ($b['status'] !== 'cancelled'): ?>
                  <button type="submit" name="status" value="cancelled" class="danger"
                          onclick="return confirm('Annullare la prenotazione <?= e($b['reference']) ?>?')">Annulla</button>
                <?php endif; ?>
              </form>
            </td>
          </tr>
          <?php if (!empty($b['guest_message'])): ?>
            <tr>
              <td colspan="8" data-label="Messaggio" class="muted" style="padding-top:0;border-top:none">
                “<?= e($b['guest_message']) ?>”
              </td>
            </tr>
          <?php endif; ?>
        <?php endforeach; ?>
        </tbody>
      </table>
      <?php endif; ?>
    </div>

  <?php elseif ($view === 'orders'): ?>

    <div class="table-wrap">
      <?php if ($orders === []): ?>
        <p class="empty">Nessun ordine con questi filtri.</p>
      <?php else: ?>
      <table>
        <thead>
          <tr>
            <th>Riferimento</th><th>Cliente</th><th>Prodotti</th><th>Consegna</th>
            <th>Totale</th><th>Stato</th><th>Pagamento</th><th>Azioni</th>
          </tr>
        </thead>
        <tbody>
        <?php foreach ($orders as $o): ?>
          <tr>
            <td data-label="Riferimento">
              <span class="mono strong"><?= e($o['reference']) ?></span><br>
              <span class="muted"><?= e(day($o['created_at'])) ?></span>
              <?php if ((int) $o['email_sent'] === 0): ?>
                <br><span class="muted" title="Email di conferma non inviata">✉ non inviata</span>
              <?php endif; ?>
            </td>
            <td data-label="Cliente">
              <span class="strong"><?= e($o['first_name'] . ' ' . $o['last_name']) ?></span><br>
              <a class="link muted" href="mailto:<?= e($o['email']) ?>"><?= e($o['email']) ?></a>
              <?php if (!empty($o['phone'])): ?>
                <br><a class="link muted" href="tel:<?= e($o['phone']) ?>"><?= e($o['phone']) ?></a>
              <?php endif; ?>
            </td>
            <td data-label="Prodotti">
              <?php foreach (($o['items'] ?? []) as $item): ?>
                <?= (int) $item['quantity'] ?> × <?= e($item['product_name']) ?>
                <span class="muted"><?= e($item['size_label']) ?></span><br>
              <?php endforeach; ?>
            </td>
            <td data-label="Consegna">
              <?= $o['delivery'] === 'shipping' ? 'Spedizione' : 'Ritiro' ?>
              <?php if (!empty($o['shipping_address'])): ?>
                <br><span class="muted"><?= nl2br(e($o['shipping_address'])) ?></span>
              <?php endif; ?>
            </td>
            <td data-label="Totale">
              <span class="strong"><?= e(money($o['total_price'])) ?></span>
              <?php if ((float) $o['shipping_cost'] > 0): ?>
                <br><span class="muted">di cui <?= e(money($o['shipping_cost'])) ?> spedizione</span>
              <?php endif; ?>
            </td>
            <td data-label="Stato">
              <span class="badge <?= e($o['status'] === 'delivered' ? 'completed' : $o['status']) ?>">
                <?= e($orderStatusLabels[$o['status']] ?? $o['status']) ?>
              </span>
            </td>
            <td data-label="Pagamento">
              <form method="post" action="?<?= e($returnQuery) ?>" class="actions">
                <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
                <input type="hidden" name="order_id" value="<?= (int) $o['id'] ?>">
                <span class="badge <?= $o['payment_status'] === 'paid' ? 'confirmed' : 'pending' ?>">
                  <?= e($paymentLabels[$o['payment_status']] ?? $o['payment_status']) ?>
                </span>
                <?php if ($o['payment_status'] !== 'paid'): ?>
                  <button type="submit" name="status" value="paid">Segna pagato</button>
                <?php endif; ?>
              </form>
            </td>
            <td data-label="Azioni">
              <form method="post" action="?<?= e($returnQuery) ?>" class="actions">
                <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
                <input type="hidden" name="order_id" value="<?= (int) $o['id'] ?>">
                <?php if ($o['status'] === 'pending'): ?>
                  <button type="submit" name="status" value="confirmed">Conferma</button>
                <?php endif; ?>
                <?php if (in_array($o['status'], ['pending', 'confirmed'], true)): ?>
                  <button type="submit" name="status" value="shipped">Spedito</button>
                <?php endif; ?>
                <?php if ($o['status'] === 'shipped'): ?>
                  <button type="submit" name="status" value="delivered">Consegnato</button>
                <?php endif; ?>
                <?php if ($o['status'] !== 'cancelled'): ?>
                  <button type="submit" name="status" value="cancelled" class="danger"
                          onclick="return confirm('Annullare l\'ordine <?= e($o['reference']) ?>?')">Annulla</button>
                <?php endif; ?>
              </form>
            </td>
          </tr>
          <?php if (!empty($o['customer_message'])): ?>
            <tr>
              <td colspan="8" data-label="Messaggio" class="muted" style="padding-top:0;border-top:none">
                “<?= e($o['customer_message']) ?>”
              </td>
            </tr>
          <?php endif; ?>
        <?php endforeach; ?>
        </tbody>
      </table>
      <?php endif; ?>
    </div>

  <?php elseif ($view === 'catalog'): ?>

    <div class="table-wrap">
      <?php if ($catalog === []): ?>
        <p class="empty">Catalogo vuoto: importa schema_database.sql.</p>
      <?php else: ?>
      <table>
        <thead>
          <tr>
            <th>Prodotto</th><th>Formato</th><th>SKU</th><th>Prezzo</th>
            <th>Giacenza</th><th>Venduti</th><th>Stato</th><th>Azioni</th>
          </tr>
        </thead>
        <tbody>
        <?php foreach ($catalog as $row): ?>
          <tr>
            <td data-label="Prodotto">
              <span class="strong" style="color:<?= e($row['accent']) ?>"><?= e($row['name']) ?></span><br>
              <span class="muted mono"><?= e($row['slug']) ?></span>
            </td>
            <td data-label="Formato"><?= e($row['size_label'] ?? '—') ?></td>
            <td data-label="SKU"><span class="mono"><?= e($row['sku'] ?? '—') ?></span></td>
            <td data-label="Prezzo"><span class="strong"><?= $row['price'] !== null ? e(money($row['price'])) : '—' ?></span></td>
            <td data-label="Giacenza">
              <?= $row['stock'] === null ? '<span class="muted">non tracciata</span>' : (int) $row['stock'] ?>
            </td>
            <td data-label="Venduti"><?= (int) $row['sold'] ?></td>
            <td data-label="Stato">
              <span class="badge <?= ($row['variant_status'] ?? '') === 'available' ? 'confirmed' : 'cancelled' ?>">
                <?= ($row['variant_status'] ?? '') === 'available' ? 'disponibile' : e($row['variant_status'] ?? '—') ?>
              </span>
            </td>
            <td data-label="Azioni">
              <?php if (!empty($row['variant_id'])): ?>
              <form method="post" action="?<?= e($returnQuery) ?>" class="actions">
                <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
                <input type="hidden" name="variant_id" value="<?= (int) $row['variant_id'] ?>">
                <?php if ($row['variant_status'] === 'available'): ?>
                  <button type="submit" name="status" value="sold_out">Segna esaurito</button>
                <?php else: ?>
                  <button type="submit" name="status" value="available">Rimetti in vendita</button>
                <?php endif; ?>
              </form>
              <?php endif; ?>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
      <?php endif; ?>
    </div>

    <p class="muted" style="margin-top:1.5rem">
      I prezzi si cambiano in <span class="mono">product_variants</span> da phpMyAdmin.
      Il sito li legge da <span class="mono">api/catalog.php</span>, quindi la modifica
      compare online entro mezz'ora senza ripubblicare nulla.
    </p>

  <?php else: ?>

    <div class="table-wrap">
      <?php if ($customers === []): ?>
        <p class="empty">Nessun cliente trovato.</p>
      <?php else: ?>
      <table>
        <thead>
          <tr>
            <th>Cliente</th><th>Contatti</th><th>Provenienza</th><th>Soggiorni</th>
            <th>Valore</th><th>Ultimo soggiorno</th><th>Newsletter</th><th>Registrato</th>
          </tr>
        </thead>
        <tbody>
        <?php foreach ($customers as $c): ?>
          <tr>
            <td data-label="Cliente">
              <span class="strong"><?= e($c['first_name'] . ' ' . $c['last_name']) ?></span><br>
              <span class="muted mono">#<?= (int) $c['id'] ?></span>
            </td>
            <td data-label="Contatti">
              <a class="link" href="mailto:<?= e($c['email']) ?>"><?= e($c['email']) ?></a>
              <?php if (!empty($c['phone'])): ?>
                <br><a class="link muted" href="tel:<?= e($c['phone']) ?>"><?= e($c['phone']) ?></a>
              <?php endif; ?>
            </td>
            <td data-label="Provenienza">
              <?= e($c['city'] ?? '—') ?><br>
              <span class="muted"><?= e($c['country']) ?> · <?= e($c['language']) ?></span>
            </td>
            <td data-label="Soggiorni"><?= (int) $c['total_bookings'] ?></td>
            <td data-label="Valore"><?= e(money($c['lifetime_value'])) ?></td>
            <td data-label="Ultimo soggiorno"><?= e(day($c['last_stay'])) ?></td>
            <td data-label="Newsletter">
              <span class="badge <?= ((int) $c['marketing_optin'] === 1) ? 'confirmed' : 'cancelled' ?>">
                <?= ((int) $c['marketing_optin'] === 1) ? 'sì' : 'no' ?>
              </span>
            </td>
            <td data-label="Registrato"><?= e(day($c['created_at'])) ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table>
      <?php endif; ?>
    </div>

  <?php endif; ?>

</main>

<footer class="foot">
  Massimo 200 righe per vista. I dati personali degli ospiti vanno trattati secondo l'informativa privacy pubblicata.
</footer>

</body>
</html>
