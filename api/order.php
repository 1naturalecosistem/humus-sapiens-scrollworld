<?php
// api/order.php — POST /api/order.php
//
// Riceve un ordine di miele dal sito, crea o aggiorna il cliente, ricalcola
// gli importi dal listino, salva ordine e righe, scala le giacenze tracciate
// e invia conferma all'acquirente più notifica all'azienda.
//
// Corpo della richiesta (application/json):
// {
//   "first_name": "Mario", "last_name": "Rossi",
//   "email": "mario@example.com", "phone": "+39 333 1234567",
//   "delivery": "pickup" | "shipping",
//   "address": "Via Roma 1", "city": "Genova", "country": "Italia",
//   "items": [ { "sku": "castagno-500g", "quantity": 2 } ],
//   "message": "Ci vediamo sabato",
//   "privacy": true, "marketing": false, "locale": "it",
//   "website": ""            // honeypot
// }
//
// 201 → { success, reference, total, items: [...] }

require_once __DIR__ . '/db.php';   // gestisce CORS e pre-flight OPTIONS

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST, OPTIONS');
    hs_error('Metodo non consentito. Usa POST.', 405);
}

define('HS_ORDER_MAX_LINES', 20);      // righe distinte per ordine
define('HS_ORDER_MAX_QTY', 50);        // vasetti per riga
define('HS_ORDER_THROTTLE_MAX', 5);
define('HS_ORDER_THROTTLE_WINDOW', 3600);

// Spedizione in Italia. A zero l'ordine è a ritiro o a spese concordate.
// [Speculazione] Da confermare col corriere: cambia qui e basta.
define('HS_SHIPPING_COST', 7.00);
define('HS_FREE_SHIPPING_OVER', 60.00);


/** Ripulisce il testo inviato dall'utente. */
function hs_clean($value, int $maxLength = 255): string
{
    if (!is_scalar($value)) {
        return '';
    }
    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) $value);
    $text = trim(preg_replace('/[ \t]+/u', ' ', (string) $text));

    return mb_substr($text, 0, $maxLength);
}

/** Prepara un valore da mettere in un header email (blocca l'header injection). */
function hs_mime_header(string $text): string
{
    $text = str_replace(["\r", "\n", "\0"], ' ', $text);

    return preg_match('/^[\x20-\x7E]*$/', $text) === 1
        ? $text
        : '=?UTF-8?B?' . base64_encode($text) . '?=';
}

function hs_money(float $amount): string
{
    return number_format($amount, 2, ',', '.');
}


// ---------------------------------------------------------------------
// 1. Lettura e validazione
// ---------------------------------------------------------------------
$input  = hs_json_body();
$fields = [];

if (hs_clean($input['website'] ?? '') !== '') {
    hs_json(['success' => true, 'reference' => 'HS-ORD-000000'], 200);
}

$firstName = hs_clean($input['first_name'] ?? '', 100);
$lastName  = hs_clean($input['last_name'] ?? '', 100);
$email     = mb_strtolower(hs_clean($input['email'] ?? '', 150));
$phone     = hs_clean($input['phone'] ?? '', 50);
$address   = hs_clean($input['address'] ?? '', 500);
$city      = hs_clean($input['city'] ?? '', 100);
$country   = hs_clean($input['country'] ?? 'Italia', 100);
$message   = hs_clean($input['message'] ?? '', 2000);
$locale    = in_array(($input['locale'] ?? 'it'), ['it', 'en'], true) ? (string) $input['locale'] : 'it';
$delivery  = in_array(($input['delivery'] ?? 'pickup'), ['pickup', 'shipping'], true)
    ? (string) $input['delivery'] : 'pickup';
$privacy   = !empty($input['privacy']);
$marketing = !empty($input['marketing']);

if (mb_strlen($firstName) < 2) {
    $fields['first_name'] = 'Inserisci il nome.';
}
if (mb_strlen($lastName) < 2) {
    $fields['last_name'] = 'Inserisci il cognome.';
}
if ($email === '' || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $fields['email'] = 'Inserisci un indirizzo email valido.';
}
if ($phone !== '' && !preg_match('/^[0-9+().\s-]{6,50}$/', $phone)) {
    $fields['phone'] = 'Numero di telefono non valido.';
}
if (!$privacy) {
    $fields['privacy'] = 'Devi accettare l\'informativa privacy per proseguire.';
}
// Per spedire serve sapere dove: senza indirizzo il pacco non parte.
if ($delivery === 'shipping') {
    if (mb_strlen($address) < 5) {
        $fields['address'] = 'Inserisci l\'indirizzo di spedizione.';
    }
    if (mb_strlen($city) < 2) {
        $fields['city'] = 'Inserisci la città.';
    }
}

// --- Righe del carrello ---
$rawItems = $input['items'] ?? null;

if (!is_array($rawItems) || $rawItems === []) {
    $fields['items'] = 'Il carrello è vuoto.';
    $rawItems = [];
}
if (count($rawItems) > HS_ORDER_MAX_LINES) {
    $fields['items'] = 'Troppi prodotti diversi in un solo ordine.';
    $rawItems = [];
}

// Le quantità si sommano per SKU: se il carrello manda due volte la stessa
// riga, deve risultare un solo articolo con quantità totale, non un doppione.
$wanted = [];
foreach ($rawItems as $line) {
    if (!is_array($line)) {
        continue;
    }
    $sku = hs_clean($line['sku'] ?? '', 64);
    $qty = $line['quantity'] ?? 0;

    if ($sku === '' || is_bool($qty) || !is_numeric($qty)) {
        continue;
    }
    $qty = (int) $qty;
    if ($qty < 1 || $qty > HS_ORDER_MAX_QTY) {
        continue;
    }

    $wanted[$sku] = min(HS_ORDER_MAX_QTY, ($wanted[$sku] ?? 0) + $qty);
}

if ($wanted === [] && !isset($fields['items'])) {
    $fields['items'] = 'Nessun prodotto valido nel carrello.';
}

if ($fields !== []) {
    hs_error('Alcuni dati non sono validi.', 422, $fields);
}

$pdo = hs_db();
$ip  = hs_client_ip_binary();

// ---------------------------------------------------------------------
// 2. Freno anti-abuso
// ---------------------------------------------------------------------
if ($ip !== null) {
    $throttle = $pdo->prepare(sprintf(
        'SELECT COUNT(*) FROM `orders`
          WHERE `ip_address` = :ip AND `created_at` > (NOW() - INTERVAL %d SECOND)',
        (int) HS_ORDER_THROTTLE_WINDOW
    ));
    $throttle->bindValue(':ip', $ip, PDO::PARAM_STR);
    $throttle->execute();

    if ((int) $throttle->fetchColumn() >= HS_ORDER_THROTTLE_MAX) {
        header('Retry-After: ' . HS_ORDER_THROTTLE_WINDOW);
        hs_error('Troppi ordini dallo stesso indirizzo. Riprova più tardi o scrivici via email.', 429);
    }
}

// ---------------------------------------------------------------------
// 3. Transazione
// ---------------------------------------------------------------------
try {
    $pdo->beginTransaction();

    // Si bloccano le righe del listino: due ordini simultanei sull'ultimo
    // vasetto non possono passare entrambi.
    $placeholders = implode(',', array_fill(0, count($wanted), '?'));
    $lookup = $pdo->prepare(
        'SELECT v.`id`, v.`sku`, v.`size_label`, v.`price`, v.`stock`, v.`status`,
                p.`name` AS product_name, p.`name_en` AS product_name_en, p.`status` AS product_status
           FROM `product_variants` v
           JOIN `products` p ON p.`id` = v.`product_id`
          WHERE v.`sku` IN (' . $placeholders . ')
          FOR UPDATE'
    );
    $lookup->execute(array_keys($wanted));
    $found = $lookup->fetchAll();

    $bySku = [];
    foreach ($found as $row) {
        $bySku[$row['sku']] = $row;
    }

    $lines      = [];
    $itemsTotal = 0.0;

    foreach ($wanted as $sku => $qty) {
        if (!isset($bySku[$sku])) {
            $pdo->rollBack();
            hs_error('Prodotto non disponibile.', 422, ['items' => 'Un prodotto del carrello non esiste più.']);
        }

        $v = $bySku[$sku];

        if ($v['status'] !== 'available' || $v['product_status'] !== 'available') {
            $pdo->rollBack();
            hs_error('Prodotto esaurito.', 409, [
                'items' => sprintf('%s %s non è disponibile.', $v['product_name'], $v['size_label']),
            ]);
        }
        if ($v['stock'] !== null && (int) $v['stock'] < $qty) {
            $pdo->rollBack();
            hs_error('Disponibilità insufficiente.', 409, [
                'items' => sprintf(
                    'Di %s %s ne restano %d.',
                    $v['product_name'],
                    $v['size_label'],
                    (int) $v['stock']
                ),
            ]);
        }

        $unitPrice = (float) $v['price'];
        $lineTotal = round($unitPrice * $qty, 2);
        $itemsTotal += $lineTotal;

        $lines[] = [
            'variant_id'   => (int) $v['id'],
            'product_name' => ($locale === 'en' && $v['product_name_en'] !== '')
                ? $v['product_name_en'] : $v['product_name'],
            'size_label'   => $v['size_label'],
            'unit_price'   => $unitPrice,
            'quantity'     => $qty,
            'line_total'   => $lineTotal,
        ];
    }

    $itemsTotal = round($itemsTotal, 2);
    $shipping = ($delivery === 'shipping' && $itemsTotal < HS_FREE_SHIPPING_OVER)
        ? HS_SHIPPING_COST : 0.00;
    $total = round($itemsTotal + $shipping, 2);

    // --- Cliente: crea o aggiorna ---
    $find = $pdo->prepare('SELECT `id` FROM `customers` WHERE `email` = :email FOR UPDATE');
    $find->execute([':email' => $email]);
    $customerId = $find->fetchColumn();

    if ($customerId === false) {
        $insert = $pdo->prepare(
            'INSERT INTO `customers`
               (`first_name`, `last_name`, `email`, `phone`, `address`, `city`, `country`,
                `language`, `privacy_optin`, `marketing_optin`)
             VALUES (:first_name, :last_name, :email, :phone, :address, :city, :country,
                :language, 1, :marketing)'
        );
        $insert->execute([
            ':first_name' => $firstName,
            ':last_name'  => $lastName,
            ':email'      => $email,
            ':phone'      => $phone !== '' ? $phone : null,
            ':address'    => $address !== '' ? $address : null,
            ':city'       => $city !== '' ? $city : null,
            ':country'    => $country,
            ':language'   => $locale,
            ':marketing'  => $marketing ? 1 : 0,
        ]);
        $customerId = (int) $pdo->lastInsertId();
    } else {
        $customerId = (int) $customerId;
        $update = $pdo->prepare(
            'UPDATE `customers` SET
                `first_name`      = :first_name,
                `last_name`       = :last_name,
                `phone`           = COALESCE(NULLIF(:phone, \'\'), `phone`),
                `address`         = COALESCE(NULLIF(:address, \'\'), `address`),
                `city`            = COALESCE(NULLIF(:city, \'\'), `city`),
                `country`         = :country,
                `language`        = :language,
                `privacy_optin`   = 1,
                `marketing_optin` = GREATEST(`marketing_optin`, :marketing)
              WHERE `id` = :id'
        );
        $update->execute([
            ':first_name' => $firstName,
            ':last_name'  => $lastName,
            ':phone'      => $phone,
            ':address'    => $address,
            ':city'       => $city,
            ':country'    => $country,
            ':language'   => $locale,
            ':marketing'  => $marketing ? 1 : 0,
            ':id'         => $customerId,
        ]);
    }

    // --- Ordine ---
    $reference = 'HS-ORD-' . strtoupper(bin2hex(random_bytes(3)));

    $order = $pdo->prepare(
        'INSERT INTO `orders`
           (`reference`, `customer_id`, `items_total`, `shipping_cost`, `total_price`,
            `delivery`, `shipping_address`, `status`, `customer_message`, `locale`, `ip_address`)
         VALUES
           (:reference, :customer_id, :items_total, :shipping_cost, :total_price,
            :delivery, :shipping_address, \'pending\', :customer_message, :locale, :ip_address)'
    );
    $order->bindValue(':reference', $reference);
    $order->bindValue(':customer_id', $customerId, PDO::PARAM_INT);
    $order->bindValue(':items_total', number_format($itemsTotal, 2, '.', ''));
    $order->bindValue(':shipping_cost', number_format($shipping, 2, '.', ''));
    $order->bindValue(':total_price', number_format($total, 2, '.', ''));
    $order->bindValue(':delivery', $delivery);
    $order->bindValue(
        ':shipping_address',
        $delivery === 'shipping' ? trim($address . "\n" . $city . ' ' . $country) : null
    );
    $order->bindValue(':customer_message', $message !== '' ? $message : null);
    $order->bindValue(':locale', $locale);
    $order->bindValue(':ip_address', $ip, $ip === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $order->execute();

    $orderId = (int) $pdo->lastInsertId();

    // --- Righe + scarico giacenze ---
    $itemStmt = $pdo->prepare(
        'INSERT INTO `order_items`
           (`order_id`, `variant_id`, `product_name`, `size_label`, `unit_price`, `quantity`, `line_total`)
         VALUES (:order_id, :variant_id, :product_name, :size_label, :unit_price, :quantity, :line_total)'
    );
    // Lo scarico tocca solo le varianti con giacenza tracciata: `stock` a NULL
    // resta NULL e non diventa un numero negativo.
    $stockStmt = $pdo->prepare(
        'UPDATE `product_variants`
            SET `stock` = `stock` - :qty
          WHERE `id` = :id AND `stock` IS NOT NULL'
    );

    foreach ($lines as $line) {
        $itemStmt->execute([
            ':order_id'     => $orderId,
            ':variant_id'   => $line['variant_id'],
            ':product_name' => $line['product_name'],
            ':size_label'   => $line['size_label'],
            ':unit_price'   => number_format($line['unit_price'], 2, '.', ''),
            ':quantity'     => $line['quantity'],
            ':line_total'   => number_format($line['line_total'], 2, '.', ''),
        ]);
        $stockStmt->execute([':qty' => $line['quantity'], ':id' => $line['variant_id']]);
    }

    $pdo->commit();
} catch (\PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    hs_error(
        'Non siamo riusciti a registrare l\'ordine. Riprova o scrivici a ' . HS_MAIL_TO . '.',
        500,
        [],
        'Order insert failed: ' . $e->getMessage()
    );
}


// ---------------------------------------------------------------------
// 4. Email
// ---------------------------------------------------------------------
$rows = [];
foreach ($lines as $line) {
    $rows[] = sprintf(
        '%d × %s %s — EUR %s',
        $line['quantity'],
        $line['product_name'],
        $line['size_label'],
        hs_money($line['line_total'])
    );
}
$rows[] = '';
$rows[] = sprintf('Prodotti:    EUR %s', hs_money($itemsTotal));
if ($shipping > 0) {
    $rows[] = sprintf('Spedizione:  EUR %s', hs_money($shipping));
} elseif ($delivery === 'shipping') {
    $rows[] = 'Spedizione:  offerta';
} else {
    $rows[] = 'Ritiro in azienda';
}
$rows[] = sprintf('TOTALE:      EUR %s', hs_money($total));
$summary = implode("\n", $rows);

$guestName = $firstName . ' ' . $lastName;

$headersToGuest = implode("\r\n", [
    'From: ' . hs_mime_header(HS_MAIL_FROM_NAME) . ' <' . HS_MAIL_FROM . '>',
    'Reply-To: ' . HS_MAIL_TO,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: humus-sapiens-shop',
]);

if ($locale === 'en') {
    $guestSubject = 'Order received — Humus Sapiens (' . $reference . ')';
    $guestBody = <<<TXT
Hello {$firstName},

thank you for your order. We prepare each jar by hand and get in touch within
24 hours to arrange payment and delivery.

Reference: {$reference}

{$summary}

Payment is arranged directly with us: no platforms, no extra fees.

Humus Sapiens — Azienda Agricola
Loc. Baresi 15, 16030 Castiglione Chiavarese (GE)
+39 327 8160257
TXT;
} else {
    $guestSubject = 'Ordine ricevuto — Humus Sapiens (' . $reference . ')';
    $guestBody = <<<TXT
Ciao {$firstName},

grazie per il tuo ordine. Prepariamo ogni vasetto a mano e ti contattiamo entro
24 ore per concordare pagamento e consegna.

Riferimento: {$reference}

{$summary}

Il pagamento si concorda direttamente con noi: nessuna piattaforma, nessuna
commissione aggiuntiva.

Humus Sapiens — Azienda Agricola
Loc. Baresi 15, 16030 Castiglione Chiavarese (GE)
+39 327 8160257
TXT;
}

$receivedAt = (new DateTimeImmutable('now', new DateTimeZone('Europe/Rome')))->format('d/m/Y H:i');
$deliveryLabel = $delivery === 'shipping' ? "Spedizione\n$address\n$city $country" : 'Ritiro in azienda';

$staffBody = <<<TXT
Nuovo ordine dal sito.

Riferimento: {$reference}
Ricevuto:    {$receivedAt}

--- CLIENTE --------------------------------------
Nome:     {$guestName}
Email:    {$email}
Telefono: {$phone}

--- CONSEGNA -------------------------------------
{$deliveryLabel}

--- ORDINE ---------------------------------------
{$summary}

--- MESSAGGIO ------------------------------------
{$message}

Gestisci l'ordine:
https://onenaturalecosistem.com/crm/dashboard.php?view=orders
TXT;

$headersToStaff = implode("\r\n", [
    'From: ' . hs_mime_header(HS_MAIL_FROM_NAME) . ' <' . HS_MAIL_FROM . '>',
    'Reply-To: ' . hs_mime_header($guestName) . ' <' . $email . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: humus-sapiens-shop',
]);

$guestMailSent = @mail($email, hs_mime_header($guestSubject), $guestBody, $headersToGuest, '-f' . HS_MAIL_FROM);
$staffMailSent = @mail(
    HS_MAIL_TO,
    hs_mime_header('[Ordine] ' . $guestName . ' · EUR ' . hs_money($total)),
    $staffBody,
    $headersToStaff,
    '-f' . HS_MAIL_FROM
);

if (!$guestMailSent || !$staffMailSent) {
    error_log(sprintf(
        '[humus-api] mail() ordine fallita per %s (cliente=%s, azienda=%s)',
        $reference,
        $guestMailSent ? 'ok' : 'FAIL',
        $staffMailSent ? 'ok' : 'FAIL'
    ));
}

if ($guestMailSent) {
    $pdo->prepare('UPDATE `orders` SET `email_sent` = 1 WHERE `id` = :id')->execute([':id' => $orderId]);
}


// ---------------------------------------------------------------------
// 5. Risposta
// ---------------------------------------------------------------------
hs_json([
    'success'    => true,
    'reference'  => $reference,
    'status'     => 'pending',
    'message'    => $locale === 'en'
        ? 'Order received. We reply within 24 hours.'
        : 'Ordine ricevuto. Ti rispondiamo entro 24 ore.',
    'email_sent' => (bool) $guestMailSent,
    'delivery'   => $delivery,
    'items'      => array_map(static function (array $l): array {
        return [
            'product'  => $l['product_name'],
            'size'     => $l['size_label'],
            'quantity' => $l['quantity'],
            'total'    => $l['line_total'],
        ];
    }, $lines),
    'price' => [
        'items'    => $itemsTotal,
        'shipping' => $shipping,
        'total'    => $total,
        'currency' => 'EUR',
    ],
], 201);
