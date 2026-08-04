<?php
// api/catalog.php — GET /api/catalog.php
//
// Restituisce il catalogo pubblico: sistemazioni e mieli, con prezzi e
// disponibilità presi dal gestionale. È questo che rende il database l'unica
// fonte di verità: il sito non porta più un listino suo che può divergere.
//
// Il frontend tiene comunque una copia statica come rete di sicurezza: se
// questo endpoint non risponde, la pagina si disegna lo stesso.
//
// Risposta:
// {
//   "success": true,
//   "rooms":    [ { slug, name, name_en, capacity, price, min_nights, available } ],
//   "products": [ { slug, name, name_en, tagline, note, accent, image,
//                   variants: [ { sku, size, price, available } ] } ]
// }

require_once __DIR__ . '/db.php';   // gestisce CORS e pre-flight OPTIONS

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    header('Allow: GET, OPTIONS');
    hs_error('Metodo non consentito. Usa GET.', 405);
}

$pdo = hs_db();

try {
    // --- Sistemazioni -------------------------------------------------
    // Si includono anche le 'coming_soon': il sito le mostra in elenco ma
    // non permette di selezionarle. Le altre (manutenzione, occupato)
    // restano fuori.
    $rooms = $pdo->query(
        'SELECT `slug`, `name`, `name_en`, `type`, `capacity`, `price_per_night`,
                `min_nights`, `max_nights`, `description`, `description_en`, `status`
           FROM `rooms`
          WHERE `status` IN (\'available\', \'coming_soon\')
          ORDER BY `sort_order`, `id`'
    )->fetchAll();

    $roomsOut = array_map(static function (array $r): array {
        return [
            'slug'        => $r['slug'],
            'name'        => $r['name'],
            'name_en'     => $r['name_en'] !== '' ? $r['name_en'] : $r['name'],
            'type'        => $r['type'],
            'capacity'    => (int) $r['capacity'],
            'price'       => (float) $r['price_per_night'],
            'min_nights'  => (int) $r['min_nights'],
            'max_nights'  => (int) $r['max_nights'],
            'description' => $r['description'],
            'available'   => $r['status'] === 'available',
        ];
    }, $rooms);

    // --- Mieli ---------------------------------------------------------
    $products = $pdo->query(
        'SELECT `id`, `slug`, `name`, `name_en`, `tagline`, `tagline_en`,
                `note`, `note_en`, `category`, `accent`, `image`, `status`
           FROM `products`
          WHERE `status` <> \'hidden\'
          ORDER BY `sort_order`, `id`'
    )->fetchAll();

    $variants = $pdo->query(
        'SELECT `product_id`, `sku`, `size_label`, `price`, `stock`, `status`
           FROM `product_variants`
          WHERE `status` <> \'hidden\'
          ORDER BY `sort_order`, `id`'
    )->fetchAll();

    // Le varianti si raggruppano per prodotto in PHP invece di fare una query
    // per prodotto: due letture in tutto, qualunque sia il numero di mieli.
    $byProduct = [];
    foreach ($variants as $v) {
        $byProduct[(int) $v['product_id']][] = [
            'sku'       => $v['sku'],
            'size'      => $v['size_label'],
            'price'     => (float) $v['price'],
            // Esaurito se marcato tale o se la giacenza tracciata è a zero.
            'available' => $v['status'] === 'available'
                && ($v['stock'] === null || (int) $v['stock'] > 0),
        ];
    }

    $productsOut = array_map(static function (array $p) use ($byProduct): array {
        return [
            'slug'       => $p['slug'],
            'name'       => $p['name'],
            'name_en'    => $p['name_en'] !== '' ? $p['name_en'] : $p['name'],
            'tagline'    => $p['tagline'],
            'tagline_en' => $p['tagline_en'] ?: $p['tagline'],
            'note'       => $p['note'],
            'note_en'    => $p['note_en'] ?: $p['note'],
            'category'   => $p['category'],
            'accent'     => $p['accent'],
            'image'      => $p['image'],
            'available'  => $p['status'] === 'available',
            'variants'   => $byProduct[(int) $p['id']] ?? [],
        ];
    }, $products);
} catch (\PDOException $e) {
    hs_error('Catalogo non disponibile.', 503, [], 'Catalog query failed: ' . $e->getMessage());
}

// Il catalogo cambia di rado: mezz'ora di cache alleggerisce il server senza
// far vedere prezzi vecchi troppo a lungo.
header('Cache-Control: public, max-age=1800');

hs_json([
    'success'  => true,
    'rooms'    => $roomsOut,
    'products' => $productsOut,
]);
