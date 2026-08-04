<?php
// api/booking.php — POST /api/booking.php
//
// Riceve la richiesta di prenotazione dal form del sito, crea o aggiorna il
// cliente, verifica la disponibilità, calcola il prezzo lato server, salva la
// prenotazione e invia due email: conferma all'ospite, notifica all'azienda.
//
// Corpo della richiesta (application/json):
// {
//   "first_name": "Mario", "last_name": "Rossi",
//   "email": "mario@example.com", "phone": "+39 333 1234567",
//   "city": "Genova", "country": "Italia", "locale": "it",
//   "room": "villa-levante",
//   "check_in": "2026-08-14", "check_out": "2026-08-17",
//   "adults": 2, "children": 1,
//   "message": "Arriviamo in tarda serata",
//   "privacy": true, "marketing": false,
//   "website": ""            // honeypot: deve restare vuoto
// }
//
// 201 → { success, reference, status, price: {...} }
// 4xx → { success: false, error, fields? }

require_once __DIR__ . '/db.php';   // gestisce CORS e pre-flight OPTIONS

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST, OPTIONS');
    hs_error('Metodo non consentito. Usa POST.', 405);
}

define('HS_MAX_ADVANCE_DAYS', 730);  // niente richieste oltre 2 anni
define('HS_THROTTLE_MAX', 5);        // massimo N richieste per IP…
define('HS_THROTTLE_WINDOW', 3600);  // …in questa finestra di secondi


// ---------------------------------------------------------------------
// Helper di validazione
// ---------------------------------------------------------------------

/** Ripulisce il testo inviato dall'utente: spazi, caratteri di controllo, lunghezza. */
function hs_clean($value, int $maxLength = 255): string
{
    if (!is_scalar($value)) {
        return '';
    }

    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) $value);
    $text = trim(preg_replace('/[ \t]+/u', ' ', (string) $text));

    return mb_substr($text, 0, $maxLength);
}

/** Legge una data in formato Y-m-d. Restituisce null se non è una data reale. */
function hs_parse_date($value): ?DateTimeImmutable
{
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return null;
    }

    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('Europe/Rome'));
    $errors = DateTimeImmutable::getLastErrors();

    // createFromFormat accetta 2026-02-31 e lo trasforma in marzo: va rifiutato.
    if ($date === false || ($errors && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))) {
        return null;
    }

    return $date;
}

/** Converte in intero dentro l'intervallo [min, max]; null se fuori range. */
function hs_int($value, int $min, int $max): ?int
{
    if (is_bool($value) || !is_numeric($value)) {
        return null;
    }

    $n = (int) $value;
    return ($n < $min || $n > $max) ? null : $n;
}

/**
 * Prepara un valore da mettere in un header email.
 * Il str_replace su CR/LF è la parte importante: senza, un nome costruito ad
 * arte potrebbe aggiungere header arbitrari (Bcc, Content-Type) al messaggio.
 */
function hs_mime_header(string $text): string
{
    $text = str_replace(["\r", "\n", "\0"], ' ', $text);

    return preg_match('/^[\x20-\x7E]*$/', $text) === 1
        ? $text
        : '=?UTF-8?B?' . base64_encode($text) . '?=';
}

/** Formatta un importo all'italiana: 1.234,50 */
function hs_money(float $amount): string
{
    return number_format($amount, 2, ',', '.');
}


// ---------------------------------------------------------------------
// 1. Lettura e validazione dei dati
// ---------------------------------------------------------------------
$input  = hs_json_body();
$fields = [];

// Honeypot: campo nascosto che nessun umano compila. Si risponde 200 così il
// bot crede di aver funzionato e non riprova con un'altra forma.
if (hs_clean($input['website'] ?? '') !== '') {
    hs_json(['success' => true, 'reference' => 'HS-0000-000000', 'status' => 'pending'], 200);
}

$firstName = hs_clean($input['first_name'] ?? '', 100);
$lastName  = hs_clean($input['last_name'] ?? '', 100);
$email     = mb_strtolower(hs_clean($input['email'] ?? '', 150));
$phone     = hs_clean($input['phone'] ?? '', 50);
$city      = hs_clean($input['city'] ?? '', 100);
$country   = hs_clean($input['country'] ?? 'Italia', 100);
$locale    = in_array(($input['locale'] ?? 'it'), ['it', 'en'], true) ? (string) $input['locale'] : 'it';
$roomSlug  = hs_clean($input['room'] ?? '', 64);
$message   = hs_clean($input['message'] ?? '', 2000);
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
if ($country === '') {
    $country = 'Italia';
}
if ($roomSlug === '') {
    $fields['room'] = 'Scegli una sistemazione.';
}
if (!$privacy) {
    $fields['privacy'] = 'Devi accettare l\'informativa privacy per proseguire.';
}

$adults   = hs_int($input['adults'] ?? 1, 1, 20);
$children = hs_int($input['children'] ?? 0, 0, 20);

if ($adults === null) {
    $fields['adults'] = 'Numero di adulti non valido.';
}
if ($children === null) {
    $fields['children'] = 'Numero di bambini non valido.';
}

$checkIn  = hs_parse_date($input['check_in'] ?? null);
$checkOut = hs_parse_date($input['check_out'] ?? null);
$today    = new DateTimeImmutable('today', new DateTimeZone('Europe/Rome'));

if ($checkIn === null) {
    $fields['check_in'] = 'Data di arrivo non valida.';
} elseif ($checkIn < $today) {
    $fields['check_in'] = 'La data di arrivo non può essere nel passato.';
} elseif ($checkIn > $today->modify('+' . HS_MAX_ADVANCE_DAYS . ' days')) {
    $fields['check_in'] = 'Data di arrivo troppo lontana nel tempo.';
}

if ($checkOut === null) {
    $fields['check_out'] = 'Data di partenza non valida.';
} elseif ($checkIn !== null && $checkOut <= $checkIn) {
    $fields['check_out'] = 'La partenza deve essere successiva all\'arrivo.';
}

if ($fields !== []) {
    hs_error('Alcuni dati non sono validi.', 422, $fields);
}

$nights = (int) $checkIn->diff($checkOut)->days;
$guests = $adults + $children;

$pdo = hs_db();
$ip  = hs_client_ip_binary();


// ---------------------------------------------------------------------
// 2. Freno anti-abuso per IP
// ---------------------------------------------------------------------
if ($ip !== null) {
    // La finestra è una costante del codice, non un dato dell'utente: si può
    // interpolare come intero, e così si evitano i driver che rifiutano un
    // segnaposto dentro un'espressione INTERVAL.
    $throttle = $pdo->prepare(sprintf(
        'SELECT COUNT(*) FROM `bookings`
          WHERE `ip_address` = :ip AND `created_at` > (NOW() - INTERVAL %d SECOND)',
        (int) HS_THROTTLE_WINDOW
    ));
    $throttle->bindValue(':ip', $ip, PDO::PARAM_STR);
    $throttle->execute();

    if ((int) $throttle->fetchColumn() >= HS_THROTTLE_MAX) {
        header('Retry-After: ' . HS_THROTTLE_WINDOW);
        hs_error('Troppe richieste dallo stesso indirizzo. Riprova più tardi o scrivici via email.', 429);
    }
}


// ---------------------------------------------------------------------
// 3. Transazione: prezzo, disponibilità, cliente, prenotazione
// ---------------------------------------------------------------------
try {
    $pdo->beginTransaction();

    // FOR UPDATE blocca la riga della struttura: due richieste simultanee non
    // possono leggere entrambe "libero" e prenotare entrambe la stessa unità.
    $stmt = $pdo->prepare(
        'SELECT * FROM `rooms` WHERE `slug` = :slug AND `status` = \'available\' FOR UPDATE'
    );
    $stmt->execute([':slug' => $roomSlug]);
    $room = $stmt->fetch();

    if ($room === false) {
        $pdo->rollBack();
        hs_error('Sistemazione non disponibile.', 422, [
            'room' => 'Questa sistemazione non è prenotabile online al momento.',
        ]);
    }

    // --- Regole della struttura ---------------------------------------
    if ($guests > (int) $room['capacity']) {
        $pdo->rollBack();
        hs_error('Numero di ospiti superiore alla capienza.', 422, [
            'adults' => sprintf('Massimo %d ospiti per %s.', (int) $room['capacity'], $room['name']),
        ]);
    }
    if ($nights < (int) $room['min_nights']) {
        $pdo->rollBack();
        hs_error('Soggiorno troppo breve.', 422, [
            'check_out' => sprintf('Minimo %d notti per %s.', (int) $room['min_nights'], $room['name']),
        ]);
    }
    if ($nights > (int) $room['max_nights']) {
        $pdo->rollBack();
        hs_error('Soggiorno troppo lungo.', 422, [
            'check_out' => sprintf('Massimo %d notti per %s.', (int) $room['max_nights'], $room['name']),
        ]);
    }

    // --- Disponibilità -------------------------------------------------
    // Due soggiorni si sovrappongono quando ciascuno inizia prima che l'altro
    // finisca. Il cambio nello stesso giorno (partenza = arrivo) non è una
    // sovrapposizione: per questo i confronti sono stretti.
    $overlap = $pdo->prepare(
        'SELECT COUNT(*) FROM `bookings`
          WHERE `room_id` = :room_id
            AND `status` IN (\'pending\', \'confirmed\')
            AND `check_in` < :check_out
            AND `check_out` > :check_in'
    );
    $overlap->execute([
        ':room_id'   => (int) $room['id'],
        ':check_in'  => $checkIn->format('Y-m-d'),
        ':check_out' => $checkOut->format('Y-m-d'),
    ]);

    if ((int) $overlap->fetchColumn() >= (int) $room['quantity']) {
        $pdo->rollBack();
        hs_error('Nessuna disponibilità per le date scelte.', 409, [
            'check_in' => 'Le date richieste risultano occupate. Prova date diverse o scrivici.',
        ]);
    }

    // --- Prezzo (calcolato qui: quello del browser non fa testo) --------
    $unitPrice = (float) $room['price_per_night'];
    $total     = round($unitPrice * $nights, 2);

    // --- Cliente: crea o aggiorna --------------------------------------
    $find = $pdo->prepare('SELECT `id` FROM `customers` WHERE `email` = :email FOR UPDATE');
    $find->execute([':email' => $email]);
    $customerId = $find->fetchColumn();

    if ($customerId === false) {
        $insert = $pdo->prepare(
            'INSERT INTO `customers`
               (`first_name`, `last_name`, `email`, `phone`, `city`, `country`,
                `language`, `privacy_optin`, `marketing_optin`)
             VALUES (:first_name, :last_name, :email, :phone, :city, :country,
                :language, 1, :marketing)'
        );
        $insert->execute([
            ':first_name' => $firstName,
            ':last_name'  => $lastName,
            ':email'      => $email,
            ':phone'      => $phone !== '' ? $phone : null,
            ':city'       => $city !== '' ? $city : null,
            ':country'    => $country,
            ':language'   => $locale,
            ':marketing'  => $marketing ? 1 : 0,
        ]);
        $customerId = (int) $pdo->lastInsertId();
    } else {
        $customerId = (int) $customerId;
        // Cliente di ritorno: si aggiornano i dati, ma un consenso marketing
        // già dato non si toglie da solo (GREATEST) e i campi lasciati vuoti
        // non cancellano quello che c'era (COALESCE/NULLIF).
        $update = $pdo->prepare(
            'UPDATE `customers` SET
                `first_name`      = :first_name,
                `last_name`       = :last_name,
                `phone`           = COALESCE(NULLIF(:phone, \'\'), `phone`),
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
            ':city'       => $city,
            ':country'    => $country,
            ':language'   => $locale,
            ':marketing'  => $marketing ? 1 : 0,
            ':id'         => $customerId,
        ]);
    }

    // --- Prenotazione ---------------------------------------------------
    $reference = sprintf('HS-%s-%s', $checkIn->format('Y'), strtoupper(bin2hex(random_bytes(3))));

    $book = $pdo->prepare(
        'INSERT INTO `bookings`
           (`reference`, `customer_id`, `room_id`, `check_in`, `check_out`,
            `adults`, `children`, `unit_price`, `total_price`, `status`,
            `guest_message`, `locale`, `ip_address`)
         VALUES
           (:reference, :customer_id, :room_id, :check_in, :check_out,
            :adults, :children, :unit_price, :total_price, \'pending\',
            :guest_message, :locale, :ip_address)'
    );

    $book->bindValue(':reference', $reference);
    $book->bindValue(':customer_id', $customerId, PDO::PARAM_INT);
    $book->bindValue(':room_id', (int) $room['id'], PDO::PARAM_INT);
    $book->bindValue(':check_in', $checkIn->format('Y-m-d'));
    $book->bindValue(':check_out', $checkOut->format('Y-m-d'));
    $book->bindValue(':adults', $adults, PDO::PARAM_INT);
    $book->bindValue(':children', $children, PDO::PARAM_INT);
    $book->bindValue(':unit_price', number_format($unitPrice, 2, '.', ''));
    $book->bindValue(':total_price', number_format($total, 2, '.', ''));
    $book->bindValue(':guest_message', $message !== '' ? $message : null);
    $book->bindValue(':locale', $locale);
    $book->bindValue(':ip_address', $ip, $ip === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $book->execute();

    $bookingId = (int) $pdo->lastInsertId();

    $pdo->commit();
} catch (\PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    hs_error(
        'Non siamo riusciti a registrare la richiesta. Riprova o scrivici a ' . HS_MAIL_TO . '.',
        500,
        [],
        'Booking insert failed: ' . $e->getMessage()
    );
}


// ---------------------------------------------------------------------
// 4. Email — dopo il commit.
// Se mail() fallisce la prenotazione è comunque salva: l'errore si scrive nel
// log e si segnala nella risposta, non si annulla il lavoro fatto.
// ---------------------------------------------------------------------
$roomName = ($locale === 'en' && !empty($room['name_en'])) ? $room['name_en'] : $room['name'];

$breakdown = implode("\n", [
    sprintf('Sistemazione:  %s', $roomName),
    sprintf('Arrivo:        %s', $checkIn->format('d/m/Y')),
    sprintf('Partenza:      %s', $checkOut->format('d/m/Y')),
    sprintf('Notti:         %d', $nights),
    sprintf('Ospiti:        %d adulti, %d bambini', $adults, $children),
    '',
    sprintf('Tariffa:       EUR %s a notte', hs_money($unitPrice)),
    sprintf('TOTALE:        EUR %s', hs_money($total)),
]);

$guestName = $firstName . ' ' . $lastName;

// Mittente sul nostro dominio (SPF/DKIM validi); Reply-To porta la risposta
// dell'azienda direttamente all'ospite.
$headersToGuest = implode("\r\n", [
    'From: ' . hs_mime_header(HS_MAIL_FROM_NAME) . ' <' . HS_MAIL_FROM . '>',
    'Reply-To: ' . HS_MAIL_TO,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: humus-sapiens-booking',
]);

if ($locale === 'en') {
    $guestSubject = 'Booking request received — Humus Sapiens (' . $reference . ')';
    $guestBody = <<<TXT
Hello {$firstName},

we have received your booking request. It is not confirmed yet: we check
availability by hand and reply within 24 hours.

Reference: {$reference}

{$breakdown}

Prices are in euro and include VAT. Payment is arranged directly with us,
with no intermediaries and no extra commission.

Humus Sapiens — Azienda Agricola
Loc. Baresi 15, 16030 Castiglione Chiavarese (GE)
+39 327 8160257 · CIN IT010013B5EKQITTKX
TXT;
} else {
    $guestSubject = 'Richiesta di prenotazione ricevuta — Humus Sapiens (' . $reference . ')';
    $guestBody = <<<TXT
Ciao {$firstName},

abbiamo ricevuto la tua richiesta di prenotazione. Non è ancora confermata:
verifichiamo la disponibilità a mano e ti rispondiamo entro 24 ore.

Riferimento: {$reference}

{$breakdown}

Gli importi sono in euro e comprensivi di IVA. Il pagamento si concorda
direttamente con noi: nessun intermediario, nessuna commissione aggiuntiva.

Humus Sapiens — Azienda Agricola
Loc. Baresi 15, 16030 Castiglione Chiavarese (GE)
+39 327 8160257 · CIN IT010013B5EKQITTKX
TXT;
}

$receivedAt = (new DateTimeImmutable('now', new DateTimeZone('Europe/Rome')))->format('d/m/Y H:i');

$staffBody = <<<TXT
Nuova richiesta di prenotazione dal sito.

Riferimento: {$reference}
Ricevuta:    {$receivedAt}

--- OSPITE ---------------------------------------
Nome:     {$guestName}
Email:    {$email}
Telefono: {$phone}
Città:    {$city} ({$country})
Lingua:   {$locale}

--- SOGGIORNO ------------------------------------
{$breakdown}

--- MESSAGGIO ------------------------------------
{$message}

Gestisci la richiesta:
http://onenaturalecosistem.com/crm/dashboard.php
TXT;

$headersToStaff = implode("\r\n", [
    'From: ' . hs_mime_header(HS_MAIL_FROM_NAME) . ' <' . HS_MAIL_FROM . '>',
    'Reply-To: ' . hs_mime_header($guestName) . ' <' . $email . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: humus-sapiens-booking',
]);

$guestMailSent = @mail(
    $email,
    hs_mime_header($guestSubject),
    $guestBody,
    $headersToGuest,
    '-f' . HS_MAIL_FROM
);

$staffMailSent = @mail(
    HS_MAIL_TO,
    hs_mime_header('[Prenotazione] ' . $roomName . ' · ' . $checkIn->format('d/m') . ' · ' . $guestName),
    $staffBody,
    $headersToStaff,
    '-f' . HS_MAIL_FROM
);

if (!$guestMailSent || !$staffMailSent) {
    error_log(sprintf(
        '[humus-api] mail() fallita per %s (ospite=%s, azienda=%s)',
        $reference,
        $guestMailSent ? 'ok' : 'FAIL',
        $staffMailSent ? 'ok' : 'FAIL'
    ));
}

if ($guestMailSent) {
    $flag = $pdo->prepare('UPDATE `bookings` SET `email_sent` = 1 WHERE `id` = :id');
    $flag->execute([':id' => $bookingId]);
}


// ---------------------------------------------------------------------
// 5. Risposta
// ---------------------------------------------------------------------
hs_json([
    'success'    => true,
    'reference'  => $reference,
    'status'     => 'pending',
    'message'    => $locale === 'en'
        ? 'Request received. We reply within 24 hours.'
        : 'Richiesta ricevuta. Ti rispondiamo entro 24 ore.',
    'email_sent' => (bool) $guestMailSent,
    'room'       => ['slug' => $room['slug'], 'name' => $roomName],
    'stay'       => [
        'check_in'  => $checkIn->format('Y-m-d'),
        'check_out' => $checkOut->format('Y-m-d'),
        'nights'    => $nights,
        'adults'    => $adults,
        'children'  => $children,
    ],
    'price'      => [
        'unit_price' => $unitPrice,
        'nights'     => $nights,
        'total'      => $total,
        'currency'   => 'EUR',
    ],
], 201);
