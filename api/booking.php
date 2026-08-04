<?php
declare(strict_types=1);

/**
 * Humus Sapiens — POST /api/booking.php
 *
 * Accepts a JSON booking request from the static frontend, upserts the
 * customer, checks availability, prices the stay server-side and stores the
 * booking, then sends a confirmation to the guest and a notification to the
 * farm.
 *
 * Request body (application/json):
 * {
 *   "first_name": "Mario",  "last_name": "Rossi",
 *   "email": "mario@example.com",  "phone": "+39 333 1234567",
 *   "country": "IT",  "city": "Genova",  "locale": "it",
 *   "room": "villa-levante",
 *   "check_in": "2026-08-14",  "check_out": "2026-08-17",
 *   "adults": 2,  "children": 1,
 *   "message": "Arriviamo in tarda serata",
 *   "privacy": true,  "marketing": false,
 *   "website": ""              // honeypot: must stay empty
 * }
 *
 * 201 → { success, reference, status, price: {...}, room: {...} }
 * 4xx → { success: false, error, fields? }
 */

require_once __DIR__ . '/db.php';

// CORS first: an error returned without these headers is unreadable to the browser.
hs_cors(['POST', 'OPTIONS']);

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST, OPTIONS');
    hs_error('Metodo non consentito. Usa POST.', 405);
}

// ---------------------------------------------------------------------
// Tunables
// ---------------------------------------------------------------------
const HS_MAX_ADVANCE_DAYS   = 730; // no requests more than 2 years out
const HS_THROTTLE_MAX       = 5;   // bookings per IP…
const HS_THROTTLE_WINDOW    = 3600; // …per this many seconds


// ---------------------------------------------------------------------
// Small validation helpers
// ---------------------------------------------------------------------

/** Trim, collapse whitespace and strip control characters from user text. */
function hs_clean(mixed $value, int $maxLength = 255): string
{
    if (!is_scalar($value)) {
        return '';
    }

    $text = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', (string) $value) ?? '';
    $text = trim(preg_replace('/[ \t]+/u', ' ', $text) ?? '');

    return mb_substr($text, 0, $maxLength);
}

/** Parse a strict Y-m-d date. Returns null when the string is not a real date. */
function hs_parse_date(mixed $value): ?DateTimeImmutable
{
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return null;
    }

    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value, new DateTimeZone('Europe/Rome'));
    $errors = DateTimeImmutable::getLastErrors();

    // createFromFormat accepts 2026-02-31 and rolls it over to March; reject that.
    if ($date === false || ($errors && ($errors['warning_count'] > 0 || $errors['error_count'] > 0))) {
        return null;
    }

    return $date;
}

/** Cast to int inside [min, max]; returns null when out of range or not numeric. */
function hs_int(mixed $value, int $min, int $max): ?int
{
    if (is_bool($value) || !is_numeric($value)) {
        return null;
    }

    $n = (int) $value;

    return ($n < $min || $n > $max) ? null : $n;
}

/** Encode a mail header value as RFC 2047 when it is not plain ASCII. */
function hs_mime_header(string $text): string
{
    // Header injection guard: a raw CR/LF here would let a crafted name append
    // arbitrary headers (Bcc, Content-Type) to the outgoing message.
    $text = str_replace(["\r", "\n", "\0"], ' ', $text);

    return preg_match('/^[\x20-\x7E]*$/', $text) === 1
        ? $text
        : '=?UTF-8?B?' . base64_encode($text) . '?=';
}

/** Format an amount the Italian way: 1.234,50 */
function hs_money(float $amount): string
{
    return number_format($amount, 2, ',', '.');
}


// ---------------------------------------------------------------------
// 1. Read and validate the payload
// ---------------------------------------------------------------------
$input  = hs_json_body();
$fields = [];

// Honeypot: a hidden input no human ever fills. Answer 200 so the bot sees
// success and does not retry with a different shape.
if (hs_clean($input['website'] ?? '') !== '') {
    hs_json(['success' => true, 'reference' => 'HS-0000-000000', 'status' => 'pending'], 200);
}

$firstName = hs_clean($input['first_name'] ?? '', 80);
$lastName  = hs_clean($input['last_name'] ?? '', 80);
$email     = mb_strtolower(hs_clean($input['email'] ?? '', 190));
$phone     = hs_clean($input['phone'] ?? '', 32);
$city      = hs_clean($input['city'] ?? '', 120);
$country   = strtoupper(hs_clean($input['country'] ?? 'IT', 2));
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
if ($phone !== '' && preg_match('/^[0-9+().\s-]{6,32}$/', $phone) !== 1) {
    $fields['phone'] = 'Numero di telefono non valido.';
}
if (preg_match('/^[A-Z]{2}$/', $country) !== 1) {
    $country = 'IT';
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

/** @var DateTimeImmutable $checkIn */
/** @var DateTimeImmutable $checkOut */
/** @var int $adults */
/** @var int $children */
$nights = (int) $checkIn->diff($checkOut)->days;
$guests = $adults + $children;

$pdo = hs_db();
$ip  = hs_client_ip_binary();

// ---------------------------------------------------------------------
// 2. Throttle by IP — cheap abuse brake before we touch anything else
// ---------------------------------------------------------------------
if ($ip !== null) {
    // The interval is a compile-time constant, not user input, so interpolating
    // the cast integer is safe — and it sidesteps drivers that refuse a
    // placeholder inside an INTERVAL expression.
    $throttle = $pdo->prepare(sprintf(
        'SELECT COUNT(*) FROM bookings
          WHERE ip_address = :ip AND created_at > (NOW() - INTERVAL %d SECOND)',
        (int) HS_THROTTLE_WINDOW
    ));
    $throttle->bindValue(':ip', $ip, PDO::PARAM_STR); // packed binary; nulls survive the wire protocol
    $throttle->execute();

    if ((int) $throttle->fetchColumn() >= HS_THROTTLE_MAX) {
        header('Retry-After: ' . HS_THROTTLE_WINDOW);
        hs_error('Troppe richieste dallo stesso indirizzo. Riprova più tardi o scrivici via email.', 429);
    }
}

// ---------------------------------------------------------------------
// 3. Transaction: price, availability, customer, booking
// ---------------------------------------------------------------------
try {
    $pdo->beginTransaction();

    // Lock the room row: prevents two concurrent requests from both reading
    // "1 unit free" and both booking it.
    $stmt = $pdo->prepare('SELECT * FROM rooms WHERE slug = :slug AND is_active = 1 FOR UPDATE');
    $stmt->execute([':slug' => $roomSlug]);
    $room = $stmt->fetch();

    if ($room === false) {
        $pdo->rollBack();
        hs_error('Sistemazione non disponibile.', 422, ['room' => 'Scegli una sistemazione valida.']);
    }

    // --- Business rules ------------------------------------------------
    if ($guests > (int) $room['max_guests']) {
        $pdo->rollBack();
        hs_error('Numero di ospiti superiore alla capienza.', 422, [
            'adults' => sprintf('Massimo %d ospiti per %s.', (int) $room['max_guests'], $room['name_it']),
        ]);
    }
    if ($nights < (int) $room['min_nights']) {
        $pdo->rollBack();
        hs_error('Soggiorno troppo breve.', 422, [
            'check_out' => sprintf('Minimo %d notti per %s.', (int) $room['min_nights'], $room['name_it']),
        ]);
    }
    if ($nights > (int) $room['max_nights']) {
        $pdo->rollBack();
        hs_error('Soggiorno troppo lungo.', 422, [
            'check_out' => sprintf('Massimo %d notti per %s.', (int) $room['max_nights'], $room['name_it']),
        ]);
    }

    // --- Availability --------------------------------------------------
    // Two stays overlap when each starts before the other ends. Same-day
    // turnover (check-out == check-in) is not an overlap, hence the strict <.
    $overlap = $pdo->prepare(
        'SELECT COUNT(*) FROM bookings
          WHERE room_id = :room_id
            AND status IN (\'pending\', \'confirmed\')
            AND check_in < :check_out
            AND check_out > :check_in'
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

    // --- Price (server-side; the client estimate is never trusted) ------
    $unitPrice       = (float) $room['base_price'];
    $extraGuestPrice = (float) $room['extra_guest_price'];
    $extraGuests     = max(0, $guests - (int) $room['included_guests']);

    $accommodation = ($unitPrice + $extraGuests * $extraGuestPrice) * $nights;
    $cleaningFee   = (float) $room['cleaning_fee'];
    $touristTax    = (float) $room['tourist_tax'] * $adults * $nights; // minors are exempt
    $total         = round($accommodation + $cleaningFee + $touristTax, 2);

    // --- Customer upsert -----------------------------------------------
    $find = $pdo->prepare('SELECT id FROM customers WHERE email = :email FOR UPDATE');
    $find->execute([':email' => $email]);
    $customerId = $find->fetchColumn();

    if ($customerId === false) {
        $insert = $pdo->prepare(
            'INSERT INTO customers
               (first_name, last_name, email, phone, country, city, language,
                privacy_optin, marketing_optin, bookings_count)
             VALUES (:first_name, :last_name, :email, :phone, :country, :city, :language,
                :privacy, :marketing, 1)'
        );
        $insert->execute([
            ':first_name' => $firstName,
            ':last_name'  => $lastName,
            ':email'      => $email,
            ':phone'      => $phone !== '' ? $phone : null,
            ':country'    => $country,
            ':city'       => $city !== '' ? $city : null,
            ':language'   => $locale,
            ':privacy'    => 1,
            ':marketing'  => $marketing ? 1 : 0,
        ]);
        $customerId = (int) $pdo->lastInsertId();
    } else {
        $customerId = (int) $customerId;
        // Returning guest: refresh the details, keep a granted marketing
        // consent granted (COALESCE-style OR) and bump the counter.
        $update = $pdo->prepare(
            'UPDATE customers SET
                first_name      = :first_name,
                last_name       = :last_name,
                phone           = COALESCE(NULLIF(:phone, \'\'), phone),
                country         = :country,
                city            = COALESCE(NULLIF(:city, \'\'), city),
                language        = :language,
                privacy_optin   = 1,
                marketing_optin = GREATEST(marketing_optin, :marketing),
                bookings_count  = bookings_count + 1
              WHERE id = :id'
        );
        $update->execute([
            ':first_name' => $firstName,
            ':last_name'  => $lastName,
            ':phone'      => $phone,
            ':country'    => $country,
            ':city'       => $city,
            ':language'   => $locale,
            ':marketing'  => $marketing ? 1 : 0,
            ':id'         => $customerId,
        ]);
    }

    // --- Booking --------------------------------------------------------
    $reference = sprintf(
        'HS-%s-%s',
        $checkIn->format('Y'),
        strtoupper(bin2hex(random_bytes(3))) // 16.7M combinations, unique index catches the rest
    );

    $book = $pdo->prepare(
        'INSERT INTO bookings
           (reference, customer_id, room_id, check_in, check_out, adults, children,
            unit_price, extra_guest_price, extra_guests, accommodation_total,
            cleaning_fee, tourist_tax_total, total_price, status, guest_message,
            source, locale, ip_address, user_agent)
         VALUES
           (:reference, :customer_id, :room_id, :check_in, :check_out, :adults, :children,
            :unit_price, :extra_guest_price, :extra_guests, :accommodation_total,
            :cleaning_fee, :tourist_tax_total, :total_price, \'pending\', :guest_message,
            \'website\', :locale, :ip_address, :user_agent)'
    );

    $book->bindValue(':reference', $reference);
    $book->bindValue(':customer_id', $customerId, PDO::PARAM_INT);
    $book->bindValue(':room_id', (int) $room['id'], PDO::PARAM_INT);
    $book->bindValue(':check_in', $checkIn->format('Y-m-d'));
    $book->bindValue(':check_out', $checkOut->format('Y-m-d'));
    $book->bindValue(':adults', $adults, PDO::PARAM_INT);
    $book->bindValue(':children', $children, PDO::PARAM_INT);
    $book->bindValue(':unit_price', number_format($unitPrice, 2, '.', ''));
    $book->bindValue(':extra_guest_price', number_format($extraGuestPrice, 2, '.', ''));
    $book->bindValue(':extra_guests', $extraGuests, PDO::PARAM_INT);
    $book->bindValue(':accommodation_total', number_format($accommodation, 2, '.', ''));
    $book->bindValue(':cleaning_fee', number_format($cleaningFee, 2, '.', ''));
    $book->bindValue(':tourist_tax_total', number_format($touristTax, 2, '.', ''));
    $book->bindValue(':total_price', number_format($total, 2, '.', ''));
    $book->bindValue(':guest_message', $message !== '' ? $message : null);
    $book->bindValue(':locale', $locale);
    $book->bindValue(':ip_address', $ip, $ip === null ? PDO::PARAM_NULL : PDO::PARAM_STR);
    $book->bindValue(':user_agent', mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 255));
    $book->execute();

    $bookingId = (int) $pdo->lastInsertId();

    $pdo->commit();
} catch (PDOException $e) {
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
// 4. Emails — after the commit. A mail failure must not lose the booking,
//    so it is logged and reported as a flag, not as an error response.
// ---------------------------------------------------------------------
$roomName = $locale === 'en' ? (string) $room['name_en'] : (string) $room['name_it'];

$breakdown = [
    sprintf('Sistemazione:        %s', $roomName),
    sprintf('Arrivo:              %s', $checkIn->format('d/m/Y')),
    sprintf('Partenza:            %s', $checkOut->format('d/m/Y')),
    sprintf('Notti:               %d', $nights),
    sprintf('Ospiti:              %d adulti, %d bambini', $adults, $children),
    '',
    sprintf('Alloggio:            EUR %s', hs_money($accommodation)),
];
if ($extraGuests > 0) {
    $breakdown[] = sprintf('  (include %d ospiti extra a EUR %s/notte)', $extraGuests, hs_money($extraGuestPrice));
}
if ($cleaningFee > 0) {
    $breakdown[] = sprintf('Pulizia finale:      EUR %s', hs_money($cleaningFee));
}
if ($touristTax > 0) {
    $breakdown[] = sprintf('Imposta di soggiorno: EUR %s', hs_money($touristTax));
}
$breakdown[] = sprintf('TOTALE:              EUR %s', hs_money($total));
$breakdownText = implode("\n", $breakdown);

$guestName = $firstName . ' ' . $lastName;

// Envelope sender on our own domain keeps SPF/DKIM valid; Reply-To routes
// the farm's answer to the guest.
$headersToGuest = implode("\r\n", [
    'From: ' . hs_mime_header(HS_MAIL_FROM_NAME) . ' <' . HS_MAIL_FROM . '>',
    'Reply-To: ' . HS_MAIL_TO,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'X-Mailer: humus-sapiens-booking',
]);

$guestSubject = $locale === 'en'
    ? 'Booking request received — Humus Sapiens (' . $reference . ')'
    : 'Richiesta di prenotazione ricevuta — Humus Sapiens (' . $reference . ')';

if ($locale === 'en') {
    $guestBody = <<<TXT
Hello {$firstName},

we have received your booking request. It is not confirmed yet: we check
availability by hand and reply within 24 hours.

Reference: {$reference}

{$breakdownText}

Prices are in euro and include VAT. Payment is arranged directly with us,
with no intermediaries and no extra commission.

Humus Sapiens — Azienda Agricola
Loc. Baresi 15, 16030 Castiglione Chiavarese (GE)
+39 327 8160257 · CIN IT010013B5EKQITTKX
TXT;
} else {
    $guestBody = <<<TXT
Ciao {$firstName},

abbiamo ricevuto la tua richiesta di prenotazione. Non è ancora confermata:
verifichiamo la disponibilità a mano e ti rispondiamo entro 24 ore.

Riferimento: {$reference}

{$breakdownText}

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
{$breakdownText}

--- MESSAGGIO ------------------------------------
{$message}

Gestisci la richiesta: http://onenaturalecosistem.com/crm/dashboard.php
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
        '[humus-api] mail() failed for %s (guest=%s, staff=%s)',
        $reference,
        $guestMailSent ? 'ok' : 'FAIL',
        $staffMailSent ? 'ok' : 'FAIL'
    ));
}

if ($guestMailSent) {
    $flag = $pdo->prepare('UPDATE bookings SET email_sent = 1 WHERE id = :id');
    $flag->execute([':id' => $bookingId]);
}

// ---------------------------------------------------------------------
// 5. Response
// ---------------------------------------------------------------------
hs_json([
    'success'   => true,
    'reference' => $reference,
    'status'    => 'pending',
    'message'   => $locale === 'en'
        ? 'Request received. We reply within 24 hours.'
        : 'Richiesta ricevuta. Ti rispondiamo entro 24 ore.',
    'email_sent' => $guestMailSent,
    'room'       => [
        'slug' => (string) $room['slug'],
        'name' => $roomName,
    ],
    'stay' => [
        'check_in'  => $checkIn->format('Y-m-d'),
        'check_out' => $checkOut->format('Y-m-d'),
        'nights'    => $nights,
        'adults'    => $adults,
        'children'  => $children,
    ],
    'price' => [
        'accommodation' => round($accommodation, 2),
        'extra_guests'  => $extraGuests,
        'cleaning_fee'  => round($cleaningFee, 2),
        'tourist_tax'   => round($touristTax, 2),
        'total'         => $total,
        'currency'      => 'EUR',
    ],
], 201);
