// Ponte verso il gestionale su Register.it.
//
// Il sito è servito da GitHub Pages e l'API da un altro host: ogni chiamata è
// cross-origin e dipende dagli header CORS di api/db.php.
// In locale si punta altrove con REACT_APP_API_BASE nel file .env.

const API_BASE =
  process.env.REACT_APP_API_BASE || "http://onenaturalecosistem.com/api";

export const ENDPOINTS = {
  booking: `${API_BASE}/booking.php`,
  order: `${API_BASE}/order.php`,
  newsletter: `${API_BASE}/newsletter.php`,
  catalog: `${API_BASE}/catalog.php`,
};

/**
 * POST JSON con timeout.
 *
 * Restituisce sempre { ok, status, data } invece di lanciare: chi chiama deve
 * poter distinguere "il server ha detto no" da "il server non ha risposto",
 * e sono due messaggi diversi per chi sta compilando il form.
 */
export async function postJSON(url, payload, { timeout = 20000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({ success: false }));
    return { ok: response.ok && data.success === true, status: response.status, data };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: {},
      timedOut: error.name === "AbortError",
      networkError: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Legge il catalogo dal gestionale.
 *
 * Restituisce null se non risponde: chi chiama tiene la propria copia statica
 * come rete di sicurezza, così un'API giù non lascia la pagina vuota.
 */
export async function fetchCatalog({ timeout = 8000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(ENDPOINTS.catalog, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) return null;

    const data = await response.json();
    return data && data.success ? data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
