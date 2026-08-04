<?php
// crm/setup-hash.php — genera l'hash della password del CRM.
//
// A COSA SERVE
//   In api/config.php non va scritta la password del pannello, ma il suo hash.
//   Questa pagina lo calcola: scrivi la password che vuoi usare, copia la
//   stringa che esce, incollala in 'crm_hash' dentro api/config.php.
//
// SICUREZZA
//   La pagina si spegne da sola non appena 'crm_hash' è diverso da CHANGE_ME:
//   una volta configurato il CRM, questo file non fa più nulla anche se resta
//   sul server. Puoi comunque cancellarlo, ed è la cosa più pulita da fare.
//
//   La password digitata non viene salvata da nessuna parte: viene usata per
//   calcolare l'hash e poi scartata.

require_once __DIR__ . '/../api/db.php';

$alreadyConfigured = (HS_CRM_HASH !== 'CHANGE_ME' && HS_CRM_HASH !== '');

$hash = null;
$error = null;

if (!$alreadyConfigured && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = (string) ($_POST['password'] ?? '');

    // Sotto i 12 caratteri non ha senso proteggere una pagina che contiene
    // nomi, email e telefoni degli ospiti.
    if (mb_strlen($password) < 12) {
        $error = 'La password deve essere di almeno 12 caratteri.';
    } else {
        $hash = password_hash($password, PASSWORD_DEFAULT);
    }
    unset($password);
}

function h($v): string
{
    return htmlspecialchars((string) $v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

header('Content-Type: text/html; charset=utf-8');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store, private');
header('X-Robots-Tag: noindex, nofollow');
?>
<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Configurazione accesso CRM · Humus Sapiens</title>
<style>
  :root { --paper:#F5F3E9; --forest:#1A3626; --honey:#D48924; --sage:#D3D9C9; --line:rgba(26,54,38,.15); }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--forest); line-height:1.6;
         font-family:"Figtree",-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif; font-weight:300; }
  .wrap { max-width:680px; margin:0 auto; padding:3rem 1.5rem 5rem; }
  h1 { font-family:"Cormorant Garamond",Georgia,serif; font-weight:300; font-size:2.5rem; line-height:1.1; margin:0 0 .5rem; }
  .label { font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:.65rem;
           letter-spacing:.2em; text-transform:uppercase; color:var(--honey); display:block; margin-bottom:1rem; }
  .card { background:#fff; border:1px solid var(--line); border-radius:1rem; padding:2rem; margin-top:2rem; }
  label.field { display:block; font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:.62rem;
                letter-spacing:.16em; text-transform:uppercase; opacity:.6; margin-bottom:.5rem; }
  input[type=password] { width:100%; font:inherit; padding:.75rem .25rem; color:inherit;
                         background:transparent; border:0; border-bottom:1px solid var(--line); }
  input[type=password]:focus { outline:none; border-color:var(--honey); }
  button { margin-top:1.5rem; border:0; border-radius:999px; background:var(--forest); color:var(--paper);
           padding:.9rem 2rem; font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:.7rem;
           letter-spacing:.18em; text-transform:uppercase; cursor:pointer; transition:background-color .2s ease; }
  button:hover { background:var(--honey); }
  .out { margin-top:1.5rem; padding:1rem; background:var(--sage); border:1px solid var(--line);
         border-radius:.5rem; font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:.8rem;
         word-break:break-all; user-select:all; }
  .err { margin-top:1rem; padding:.85rem 1rem; background:#f6dede; border:1px solid #c0392b;
         border-radius:.5rem; color:#7d241a; font-size:.9rem; }
  .done { background:var(--sage); border:1px solid var(--line); border-radius:1rem; padding:2rem; margin-top:2rem; }
  ol { padding-left:1.2rem; } li { margin-bottom:.6rem; }
  code { font-family:"IBM Plex Mono",ui-monospace,monospace; font-size:.85em;
         background:rgba(26,54,38,.08); padding:.1rem .35rem; border-radius:.25rem; }
  .muted { opacity:.65; font-size:.9rem; }
</style>
</head>
<body>
<div class="wrap">

  <span class="label">Humus Sapiens · Configurazione</span>
  <h1>Password del pannello</h1>

  <?php if ($alreadyConfigured): ?>

    <div class="done">
      <p><strong>Il CRM è già configurato.</strong></p>
      <p class="muted">
        Questa pagina è disattivata: <code>crm_hash</code> in <code>api/config.php</code> è
        già impostato, quindi non genera più nulla. Puoi cancellare questo file dal server.
      </p>
      <p style="margin-top:1.5rem">
        → <a href="dashboard.php">Vai alla dashboard</a>
      </p>
    </div>

  <?php else: ?>

    <p class="muted">
      Scegli la password con cui entrerai nel pannello prenotazioni. Qui non viene
      salvata: serve solo a calcolare l'hash da incollare nella configurazione.
    </p>

    <div class="card">
      <form method="post" action="">
        <label class="field" for="password">Password (almeno 12 caratteri)</label>
        <input type="password" id="password" name="password" autocomplete="new-password" required minlength="12">
        <button type="submit">Genera l'hash</button>
      </form>

      <?php if ($error !== null): ?>
        <p class="err"><?= h($error) ?></p>
      <?php endif; ?>

      <?php if ($hash !== null): ?>
        <p style="margin-top:2rem"><strong>Ecco l'hash. Copialo tutto:</strong></p>
        <div class="out"><?= h($hash) ?></div>

        <p style="margin-top:2rem"><strong>Adesso:</strong></p>
        <ol>
          <li>Apri <code>api/config.php</code> sul server.</li>
          <li>Sostituisci <code>'crm_hash' =&gt; 'CHANGE_ME'</code> con l'hash qui sopra.</li>
          <li>Salva. L'utente per entrare è <code><?= h(HS_CRM_USER) ?></code>.</li>
          <li><strong>Cancella questo file</strong> (<code>crm/setup-hash.php</code>) dal server.</li>
        </ol>
        <p class="muted">
          Da quel momento la dashboard chiederà utente e password, e questa pagina
          si disattiverà da sola.
        </p>
      <?php endif; ?>
    </div>

  <?php endif; ?>

</div>
</body>
</html>
