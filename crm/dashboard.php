<?php
declare(strict_types=1);

/**
 * Humus Sapiens — CRM dashboard
 *
 * Read/write panel over the booking database: incoming requests, customer
 * list and one-click status changes.
 *
 * Protected by HTTP Basic auth. Set the credentials below (or via env) before
 * deploying: with the placeholder hash in place the page refuses every login,
 * which is the correct failure mode for a panel holding guest personal data.
 *
 * Generate the hash:
 *   php -r "echo password_hash('la-tua-password', PASSWORD_DEFAULT), PHP_EOL;"
 */

require_once __DIR__ . '/../api/db.php';

// ---------------------------------------------------------------------
// Access control
// ---------------------------------------------------------------------
const CRM_USER = 'humus';

/** password_hash() output. 'CHANGE_ME' disables login entirely. */
const CRM_PASSWORD_HASH = 'CHANGE_ME';

$configuredHash = getenv('HS_CRM_HASH') ?: CRM_PASSWORD_HASH;
$configuredUser = getenv('HS_CRM_USER') ?: CRM_USER;

function crm_deny(string $reason = 'Autenticazione richiesta.'): never
{
    header('WWW-Authenticate: Basic realm="Humus Sapiens CRM", charset="UTF-8"');
    http_response_code(401);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><meta charset="utf-8"><title>Accesso negato</title>'
       . '<body style="font-family:system-ui;padding:3rem;background:#F5F3E9;color:#1A3626">'
       . '<h1 style="font-weight:400">Accesso negato</h1><p>' . htmlspecialchars($reason, ENT_QUOTES) . '</p>';
    exit;
}

if ($configuredHash === 'CHANGE_ME' || $configuredHash === '') {
    crm_deny('CRM non configurato: imposta CRM_PASSWORD_HASH in crm/dashboard.php prima di usare il pannello.');
}

$authUser = (string) ($_SERVER['PHP_AUTH_USER'] ?? '');
$authPass = (string) ($_SERVER['PHP_AUTH_PW'] ?? '');

// Some CGI/FastCGI setups (Register.it included) drop PHP_AUTH_*; recover the
// credentials from the raw header. Requires the .htaccess rule shipped below.
if ($authUser === '' && isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $decoded = base64_decode(substr((string) $_SERVER['HTTP_AUTHORIZATION'], 6), true);
    if ($decoded !== false && str_contains($decoded, ':')) {
        [$authUser, $authPass] = explode(':', $decoded, 2);
    }
}

// hash_equals on the username, password_verify on the secret: both are
// constant-time, so neither leaks its length or prefix through timing.
if (!hash_equals($configuredUser, $authUser) || !password_verify($authPass, $configuredHash)) {
    crm_deny();
}

$pdo = hs_db();

// ---------------------------------------------------------------------
// CSRF token — the status buttons write, so they need one
// ---------------------------------------------------------------------
if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Strict',
        'use_strict_mode' => true,
    ]);
}
if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
}
$csrf = (string) $_SESSION['csrf'];

$flash = null;

// ---------------------------------------------------------------------
// Write action: change booking status
// ---------------------------------------------------------------------
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if (!hash_equals($csrf, (string) ($_POST['csrf'] ?? ''))) {
        http_response_code(403);
        $flash = ['type' => 'error', 'text' => 'Token di sicurezza non valido. Ricarica la pagina.'];
    } else {
        $bookingId = filter_input(INPUT_POST, 'booking_id', FILTER_VALIDATE_INT);
        $newStatus = (string) ($_POST['status'] ?? '');
        $allowed   = ['pending', 'confirmed', 'cancelled', 'completed'];

        if ($bookingId !== false && $bookingId !== null && in_array($newStatus, $allowed, true)) {
            $upd = $pdo->prepare('UPDATE bookings SET status = :status WHERE id = :id');
            $upd->execute([':status' => $newStatus, ':id' => $bookingId]);
            $flash = ['type' => 'ok', 'text' => 'Prenotazione #' . $bookingId . ' → ' . $newStatus . '.'];
        } else {
            $flash = ['type' => 'error', 'text' => 'Richiesta non valida.'];
        }
    }
}

// ---------------------------------------------------------------------
// Read: filters, stats, lists
// ---------------------------------------------------------------------
$view         = in_array(($_GET['view'] ?? 'bookings'), ['bookings', 'customers'], true)
    ? (string) $_GET['view'] : 'bookings';
$statusFilter = in_array(($_GET['status'] ?? ''), ['pending', 'confirmed', 'cancelled', 'completed'], true)
    ? (string) $_GET['status'] : '';
$search       = trim((string) ($_GET['q'] ?? ''));

$stats = $pdo->query(
    'SELECT
        COUNT(*)                                                      AS total,
        SUM(status = \'pending\')                                     AS pending,
        SUM(status = \'confirmed\')                                   AS confirmed,
        COALESCE(SUM(CASE WHEN status IN (\'confirmed\',\'completed\')
                          THEN total_price ELSE 0 END), 0)            AS revenue,
        COALESCE(SUM(CASE WHEN status IN (\'confirmed\',\'completed\')
                          THEN nights ELSE 0 END), 0)                 AS nights_sold
     FROM bookings'
)->fetch() ?: ['total' => 0, 'pending' => 0, 'confirmed' => 0, 'revenue' => 0, 'nights_sold' => 0];

$customersTotal = (int) $pdo->query('SELECT COUNT(*) FROM customers')->fetchColumn();

$bookings  = [];
$customers = [];

if ($view === 'bookings') {
    $sql = 'SELECT b.*, c.first_name, c.last_name, c.email, c.phone, c.country,
                   r.name_it AS room_name, r.category
              FROM bookings b
              JOIN customers c ON c.id = b.customer_id
              JOIN rooms r     ON r.id = b.room_id
             WHERE 1 = 1';
    $params = [];

    if ($statusFilter !== '') {
        $sql .= ' AND b.status = :status';
        $params[':status'] = $statusFilter;
    }
    if ($search !== '') {
        $sql .= ' AND (c.last_name LIKE :q OR c.first_name LIKE :q
                       OR c.email LIKE :q OR b.reference LIKE :q)';
        $params[':q'] = '%' . $search . '%';
    }

    $sql .= ' ORDER BY b.created_at DESC LIMIT 200';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $bookings = $stmt->fetchAll();
} else {
    $sql = 'SELECT c.*,
                   COUNT(b.id)                        AS total_bookings,
                   COALESCE(SUM(b.total_price), 0)    AS lifetime_value,
                   MAX(b.check_in)                    AS last_stay
              FROM customers c
              LEFT JOIN bookings b ON b.customer_id = c.id
                                  AND b.status IN (\'confirmed\', \'completed\')
             WHERE 1 = 1';
    $params = [];

    if ($search !== '') {
        $sql .= ' AND (c.last_name LIKE :q OR c.first_name LIKE :q OR c.email LIKE :q)';
        $params[':q'] = '%' . $search . '%';
    }

    $sql .= ' GROUP BY c.id ORDER BY c.created_at DESC LIMIT 200';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $customers = $stmt->fetchAll();
}

/** Escape for HTML output. Everything below the doctype goes through this. */
function e(mixed $value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function money(mixed $amount): string
{
    return '€ ' . number_format((float) $amount, 2, ',', '.');
}

function day(?string $date): string
{
    if ($date === null || $date === '' || str_starts_with($date, '0000')) {
        return '—';
    }

    return date('d/m/Y', (int) strtotime($date));
}

$statusLabels = [
    'pending'   => 'In attesa',
    'confirmed' => 'Confermata',
    'cancelled' => 'Annullata',
    'completed' => 'Conclusa',
];

// Keep the current filters when a status button posts back.
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
    --paper:   #F5F3E9;
    --forest:  #1A3626;
    --soil:    #2B231D;
    --honey:   #D48924;
    --sage:    #D3D9C9;
    --line:    rgba(26, 54, 38, 0.14);
    --shadow:  0 12px 40px rgba(26, 54, 38, 0.08);
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

  header.top {
    background: var(--forest);
    color: var(--paper);
    padding: 2rem 1.5rem;
  }
  header.top .inner { max-width: 1400px; margin: 0 auto; }
  header.top h1 { font-size: clamp(2rem, 5vw, 3rem); line-height: 1.05; }
  header.top .label { color: var(--honey); display: block; margin-bottom: 0.75rem; }
  header.top .sub { opacity: 0.65; font-size: 0.9rem; margin-top: 0.5rem; }

  main { max-width: 1400px; margin: 0 auto; padding: 2rem 1.5rem 5rem; }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 1rem;
    margin-bottom: 2.5rem;
  }
  .stat {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 1rem;
    padding: 1.25rem;
    box-shadow: var(--shadow);
  }
  .stat .label { color: rgba(26, 54, 38, 0.55); }
  .stat .value {
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: 2.1rem;
    line-height: 1.1;
    margin-top: 0.4rem;
  }
  .stat.accent { background: var(--sage); }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    margin-bottom: 1.75rem;
  }
  .tab, .chip {
    display: inline-block;
    padding: 0.5rem 1rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: #fff;
    color: var(--forest);
    text-decoration: none;
    font-size: 0.82rem;
    transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease;
  }
  .tab:hover, .chip:hover { border-color: var(--forest); }
  .tab[aria-current="page"], .chip[aria-current="true"] {
    background: var(--forest);
    color: var(--paper);
    border-color: var(--forest);
  }

  form.search { margin-left: auto; display: flex; gap: 0.5rem; }
  form.search input {
    padding: 0.5rem 0.9rem;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: #fff;
    font: inherit;
    font-size: 0.85rem;
    color: inherit;
    min-width: 200px;
  }
  form.search input:focus { outline: 2px solid var(--honey); outline-offset: 1px; }
  form.search button {
    padding: 0.5rem 1.1rem;
    border: none;
    border-radius: 999px;
    background: var(--honey);
    color: #fff;
    font: inherit;
    font-size: 0.85rem;
    cursor: pointer;
    transition: background-color 0.18s ease;
  }
  form.search button:hover { background: #b8741c; }

  .flash {
    padding: 0.85rem 1.15rem;
    border-radius: 0.75rem;
    margin-bottom: 1.5rem;
    font-size: 0.9rem;
    border: 1px solid;
  }
  .flash.ok    { background: var(--sage); border-color: rgba(26, 54, 38, 0.25); }
  .flash.error { background: #f6dede; border-color: #c0392b; color: #7d241a; }

  .table-wrap {
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 1rem;
    box-shadow: var(--shadow);
    overflow-x: auto;
  }
  table { width: 100%; border-collapse: collapse; font-size: 0.88rem; min-width: 900px; }
  thead th {
    text-align: left;
    padding: 1rem;
    background: var(--sage);
    font-family: "IBM Plex Mono", ui-monospace, monospace;
    font-size: 0.62rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 400;
    white-space: nowrap;
  }
  tbody td { padding: 1rem; border-top: 1px solid var(--line); vertical-align: top; }
  tbody tr:hover { background: rgba(211, 217, 201, 0.28); }
  .mono { font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 0.78rem; }
  .muted { color: rgba(26, 54, 38, 0.55); font-size: 0.8rem; }
  .strong { font-weight: 400; }
  a.link { color: var(--forest); text-decoration: underline; text-underline-offset: 2px; }

  .badge {
    display: inline-block;
    padding: 0.22rem 0.6rem;
    border-radius: 999px;
    font-size: 0.7rem;
    white-space: nowrap;
    border: 1px solid transparent;
  }
  .badge.pending   { background: #fdf0da; color: #8a5a10; border-color: #e6c68a; }
  .badge.confirmed { background: var(--sage); color: #1A3626; border-color: #a9b79b; }
  .badge.cancelled { background: #f2e3e1; color: #8b3a2e; border-color: #d8b2ab; }
  .badge.completed { background: #e2e6ef; color: #35405a; border-color: #b3bccf; }

  .actions { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .actions button {
    border: 1px solid var(--line);
    background: #fff;
    border-radius: 999px;
    padding: 0.3rem 0.7rem;
    font: inherit;
    font-size: 0.72rem;
    color: var(--forest);
    cursor: pointer;
    transition: background-color 0.18s ease, color 0.18s ease;
  }
  .actions button:hover  { background: var(--forest); color: var(--paper); }
  .actions button.danger:hover { background: #8b3a2e; border-color: #8b3a2e; }

  .empty { padding: 4rem 1.5rem; text-align: center; color: rgba(26, 54, 38, 0.55); }

  footer.foot {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1.5rem 3rem;
    font-size: 0.75rem;
    color: rgba(26, 54, 38, 0.5);
  }

  /* Cards instead of a wide table on phones. */
  @media (max-width: 720px) {
    table, thead, tbody, tr, td { display: block; width: 100%; min-width: 0; }
    thead { display: none; }
    tbody tr {
      border-top: 1px solid var(--line);
      padding: 0.75rem 0;
    }
    tbody td { border: none; padding: 0.3rem 1rem; }
    tbody td::before {
      content: attr(data-label);
      display: block;
      font-family: "IBM Plex Mono", ui-monospace, monospace;
      font-size: 0.6rem;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(26, 54, 38, 0.5);
      margin-bottom: 0.15rem;
    }
    form.search { margin-left: 0; width: 100%; }
    form.search input { flex: 1; min-width: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    * { transition: none !important; }
  }
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
    <div class="stat">
      <span class="label">Richieste totali</span>
      <div class="value"><?= (int) $stats['total'] ?></div>
    </div>
    <div class="stat accent">
      <span class="label">In attesa</span>
      <div class="value"><?= (int) $stats['pending'] ?></div>
    </div>
    <div class="stat">
      <span class="label">Confermate</span>
      <div class="value"><?= (int) $stats['confirmed'] ?></div>
    </div>
    <div class="stat">
      <span class="label">Notti vendute</span>
      <div class="value"><?= (int) $stats['nights_sold'] ?></div>
    </div>
    <div class="stat">
      <span class="label">Valore confermato</span>
      <div class="value"><?= e(money($stats['revenue'])) ?></div>
    </div>
    <div class="stat">
      <span class="label">Clienti</span>
      <div class="value"><?= $customersTotal ?></div>
    </div>
  </section>

  <nav class="toolbar">
    <a class="tab" href="?view=bookings" <?= $view === 'bookings' ? 'aria-current="page"' : '' ?>>Prenotazioni</a>
    <a class="tab" href="?view=customers" <?= $view === 'customers' ? 'aria-current="page"' : '' ?>>Clienti</a>

    <?php if ($view === 'bookings'): ?>
      <span style="width:1px;height:24px;background:var(--line);margin:0 0.4rem"></span>
      <a class="chip" href="?view=bookings" <?= $statusFilter === '' ? 'aria-current="true"' : '' ?>>Tutte</a>
      <?php foreach ($statusLabels as $key => $lbl): ?>
        <a class="chip" href="?view=bookings&amp;status=<?= e($key) ?>"
           <?= $statusFilter === $key ? 'aria-current="true"' : '' ?>><?= e($lbl) ?></a>
      <?php endforeach; ?>
    <?php endif; ?>

    <form class="search" method="get" action="">
      <input type="hidden" name="view" value="<?= e($view) ?>">
      <?php if ($statusFilter !== ''): ?>
        <input type="hidden" name="status" value="<?= e($statusFilter) ?>">
      <?php endif; ?>
      <input type="search" name="q" value="<?= e($search) ?>"
             placeholder="Nome, email, riferimento…" aria-label="Cerca">
      <button type="submit">Cerca</button>
    </form>
  </nav>

  <?php if ($view === 'bookings'): ?>

    <div class="table-wrap">
      <?php if ($bookings === []): ?>
        <p class="empty">Nessuna prenotazione con questi filtri.</p>
      <?php else: ?>
      <table>
        <thead>
          <tr>
            <th>Riferimento</th>
            <th>Ospite</th>
            <th>Sistemazione</th>
            <th>Soggiorno</th>
            <th>Ospiti</th>
            <th>Totale</th>
            <th>Stato</th>
            <th>Azioni</th>
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
              <span class="muted"><?= e($b['category']) ?></span>
            </td>
            <td data-label="Soggiorno">
              <?= e(day($b['check_in'])) ?> → <?= e(day($b['check_out'])) ?><br>
              <span class="muted"><?= (int) $b['nights'] ?> notti</span>
            </td>
            <td data-label="Ospiti">
              <?= (int) $b['adults'] ?> ad.
              <?php if ((int) $b['children'] > 0): ?>
                + <?= (int) $b['children'] ?> bamb.
              <?php endif; ?>
            </td>
            <td data-label="Totale">
              <span class="strong"><?= e(money($b['total_price'])) ?></span><br>
              <span class="muted"><?= e($b['payment_status']) ?></span>
            </td>
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
              <td colspan="8" data-label="Messaggio" class="muted"
                  style="padding-top:0;border-top:none">
                “<?= e($b['guest_message']) ?>”
              </td>
            </tr>
          <?php endif; ?>
        <?php endforeach; ?>
        </tbody>
      </table>
      <?php endif; ?>
    </div>

  <?php else: ?>

    <div class="table-wrap">
      <?php if ($customers === []): ?>
        <p class="empty">Nessun cliente trovato.</p>
      <?php else: ?>
      <table>
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Contatti</th>
            <th>Provenienza</th>
            <th>Soggiorni</th>
            <th>Valore</th>
            <th>Ultimo soggiorno</th>
            <th>Consensi</th>
            <th>Registrato</th>
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
            <td data-label="Consensi">
              <span class="badge <?= ((int) $c['marketing_optin'] === 1) ? 'confirmed' : 'cancelled' ?>">
                <?= ((int) $c['marketing_optin'] === 1) ? 'newsletter sì' : 'newsletter no' ?>
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
  Massimo 200 righe per vista. Dati personali degli ospiti: trattali secondo l'informativa privacy pubblicata.
</footer>

</body>
</html>
