import { useState, useMemo, useCallback, useEffect } from "react";
import { useLang } from "../lib/i18n";
import { CONTACT, CONTENT } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";
import { ENDPOINTS, postJSON, fetchCatalog } from "../lib/api";

// Rete di sicurezza se api/catalog.php non risponde: la sezione si disegna
// comunque. Il listino vero vive nella tabella `rooms` del gestionale, e il
// totale lo ricalcola sempre il server.
const FALLBACK_ROOMS = [
  { slug: "villa-levante", it: "Villa Levante", en: "Villa Levante", price: 300, capacity: 9, minNights: 2, available: true },
  { slug: "villa-ponente", it: "Villa Ponente", en: "Villa Ponente", price: 300, capacity: 9, minNights: 2, available: true },
  { slug: "piazzola-food-forest", it: "Piazzola nella Food Forest", en: "Food Forest Pitch", price: 0, capacity: 4, minNights: 1, available: false },
];

const COUNTRIES = ["Italia", "Francia", "Germania", "Svizzera", "Austria", "Paesi Bassi", "Belgio", "Spagna", "Regno Unito", "Stati Uniti", "Altro"];

const EMPTY = {
  room: "",
  check_in: "",
  check_out: "",
  adults: 2,
  children: 0,
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  city: "",
  country: "Italia",
  message: "",
  privacy: false,
  marketing: false,
  website: "", // honeypot
};

/** Data odierna in formato YYYY-MM-DD, ancorata al calendario locale. */
function todayISO() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  return new Date(Date.parse(isoDate) + days * 86400000).toISOString().slice(0, 10);
}

function nightsBetween(from, to) {
  const a = Date.parse(from);
  const b = Date.parse(to);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return 0;
  return Math.round((b - a) / 86400000);
}

const euro = (n) => `€ ${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const inputClass =
  "w-full bg-transparent border-b border-[#1A3626]/20 py-2 text-[#1A3626] font-body " +
  "focus:outline-none focus:border-[#D48924] transition-colors duration-200";
const labelClass = "font-mono-label text-[10px] tracking-label text-[#1A3626]/60 uppercase";

export default function Prenota() {
  const { lang } = useLang();
  const t = CONTENT[lang].prenota;
  const f = t.form;

  const [rooms, setRooms] = useState(FALLBACK_ROOMS);
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [feedback, setFeedback] = useState(null);
  const [reference, setReference] = useState("");

  // Tariffe e capienze dal gestionale: cambiarle in phpMyAdmin le fa comparire
  // sul sito senza ripubblicare nulla.
  useEffect(() => {
    let cancelled = false;
    fetchCatalog().then((data) => {
      if (cancelled || !data || !Array.isArray(data.rooms) || data.rooms.length === 0) return;
      setRooms(
        data.rooms.map((r) => ({
          slug: r.slug,
          it: r.name,
          en: r.name_en,
          price: r.price,
          capacity: r.capacity,
          minNights: r.min_nights,
          available: r.available,
        }))
      );
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    lang === "it" ? "Prenotazione soggiorno — Humus Sapiens" : "Stay booking — Humus Sapiens"
  )}`;

  const room = useMemo(() => rooms.find((r) => r.slug === values.room) || null, [values.room, rooms]);
  const nights = nightsBetween(values.check_in, values.check_out);
  const guests = Number(values.adults || 0) + Number(values.children || 0);
  const total = room && nights > 0 ? room.price * nights : 0;

  const setField = useCallback((name, value) => {
    setValues((prev) => {
      const next = { ...prev, [name]: value };
      // La partenza non può precedere l'arrivo: se lo fa, la si sposta in
      // avanti invece di lasciare in pagina una data impossibile.
      if (name === "check_in" && value && next.check_out && Date.parse(next.check_out) <= Date.parse(value)) {
        next.check_out = addDays(value, 1);
      }
      return next;
    });
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  }, []);

  // Controllo lato client: serve a dare risposta immediata. Il server valida
  // comunque tutto per conto suo e resta l'unica autorità.
  function validate() {
    const e = {};
    if (!values.room) e.room = f.errRoom;
    if (!values.check_in) e.check_in = f.errCheckIn;
    if (!values.check_out) e.check_out = f.errCheckOut;
    else if (nights < 1) e.check_out = f.errOrder;

    if (room && nights > 0) {
      if (nights < room.minNights) e.check_out = f.errMinNights(room.minNights);
      if (guests > room.capacity) e.adults = f.errMaxGuests(room.capacity);
    }
    if (Number(values.adults) < 1) e.adults = f.errAdults;

    if (values.first_name.trim().length < 2) e.first_name = f.errFirstName;
    if (values.last_name.trim().length < 2) e.last_name = f.errLastName;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim())) e.email = f.errEmail;
    if (values.phone.trim() && !/^[0-9+().\s-]{6,50}$/.test(values.phone.trim())) e.phone = f.errPhone;
    if (!values.privacy) e.privacy = f.errPrivacy;

    return e;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback(null);

    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setStatus("error");
      setFeedback(f.errorFields);
      return;
    }

    setStatus("sending");
    setErrors({});

    const result = await postJSON(ENDPOINTS.booking, { ...values, locale: lang });

    if (result.ok) {
      setReference(result.data.reference || "");
      setValues(EMPTY);
      setStatus("success");
      return;
    }

    if (result.networkError) {
      setStatus("error");
      setFeedback(result.timedOut ? f.errorTimeout : f.errorNetwork);
      return;
    }

    if (result.data.fields) setErrors(result.data.fields);
    setStatus("error");
    setFeedback(result.data.error || f.errorGeneric);
  }

  const minCheckIn = todayISO();
  const minCheckOut = values.check_in ? addDays(values.check_in, 1) : addDays(minCheckIn, 1);

  const Err = ({ name }) =>
    errors[name] ? (
      <p role="alert" className="mt-1 font-body text-xs text-[#8b3a2e]">
        {errors[name]}
      </p>
    ) : null;

  return (
    <section id="prenota" data-testid="prenota-section" className="relative bg-[#F5F3E9] py-28 md:py-40">
      <div className="mx-auto max-w-[1500px] px-6 md:px-10">
        <div className="mb-14 md:mb-20">
          <span className="block font-mono-label text-xs tracking-label text-[#D48924] mb-8 md:mb-12">{t.label}</span>
          <h2 className="font-display font-light text-[#1A3626] text-[min(9vw,7.5rem)] leading-[0.9]">
            <RevealWords text={t.heading} />
            <span className="italic block text-[#2f4c3a]">
              <RevealWords text={t.headingEm} />
            </span>
          </h2>
          <Reveal className="mt-8 md:mt-10" y={20}>
            <p className="font-body text-lg md:text-xl text-[#1A3626]/70 max-w-xl leading-relaxed">{t.lead}</p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-14 items-start">
          {/* ---------------- Form ---------------- */}
          <Reveal className="lg:col-span-7" y={24}>
            {status === "success" ? (
              <div
                data-testid="booking-success"
                role="status"
                className="rounded-[2rem] border border-[#1A3626]/20 bg-[#D3D9C9] p-8 md:p-10"
              >
                <h3 className="font-display text-3xl text-[#1A3626]">{f.successTitle}</h3>
                <p className="mt-4 font-body text-base leading-relaxed text-[#1A3626]/80">{f.successBody}</p>
                {reference ? (
                  <p className="mt-6 font-mono-label text-sm tracking-label text-[#1A3626]">{reference}</p>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    setReference("");
                  }}
                  className="mt-8 inline-flex items-center justify-center rounded-full border border-[#1A3626] px-6 py-3 font-mono-label text-[10px] tracking-label uppercase text-[#1A3626] transition-colors duration-200 hover:bg-[#1A3626] hover:text-[#F5F3E9]"
                >
                  {lang === "it" ? "Nuova richiesta" : "New request"}
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                noValidate
                data-testid="booking-form"
                className="rounded-[2rem] border border-[#1A3626]/15 bg-white p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.06)]"
              >
                {/* 01 — soggiorno */}
                <fieldset className="mb-10 border-0 p-0">
                  <legend className="mb-6 font-mono-label text-[10px] tracking-label uppercase text-[#1A3626]/50">
                    {f.stayLegend}
                  </legend>

                  <div className="mb-6">
                    <label className={labelClass} htmlFor="room">
                      {f.room} *
                    </label>
                    <select
                      id="room"
                      data-testid="field-room"
                      className={inputClass}
                      value={values.room}
                      onChange={(ev) => setField("room", ev.target.value)}
                    >
                      <option value="">{f.roomPlaceholder}</option>
                      {rooms.map((r) => (
                        <option key={r.slug} value={r.slug} disabled={!r.available}>
                          {r[lang]}
                          {r.available ? ` — € ${r.price}/${lang === "it" ? "notte" : "night"}` : ` — ${f.comingSoon}`}
                        </option>
                      ))}
                    </select>
                    <Err name="room" />
                  </div>

                  <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="check_in">{f.checkIn} *</label>
                      <input
                        id="check_in" type="date" data-testid="field-check-in" className={inputClass}
                        min={minCheckIn} value={values.check_in}
                        onChange={(ev) => setField("check_in", ev.target.value)}
                      />
                      <Err name="check_in" />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="check_out">{f.checkOut} *</label>
                      <input
                        id="check_out" type="date" data-testid="field-check-out" className={inputClass}
                        min={minCheckOut} value={values.check_out}
                        onChange={(ev) => setField("check_out", ev.target.value)}
                      />
                      <Err name="check_out" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="adults">{f.adults} *</label>
                      <input
                        id="adults" type="number" min="1" max={room ? room.capacity : 20} data-testid="field-adults"
                        className={inputClass} value={values.adults}
                        onChange={(ev) => setField("adults", ev.target.value)}
                      />
                      <Err name="adults" />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="children">{f.children}</label>
                      <input
                        id="children" type="number" min="0" max={room ? room.capacity : 20} data-testid="field-children"
                        className={inputClass} value={values.children}
                        onChange={(ev) => setField("children", ev.target.value)}
                      />
                      <Err name="children" />
                    </div>
                  </div>
                </fieldset>

                {/* 02 — anagrafica */}
                <fieldset className="mb-10 border-0 p-0">
                  <legend className="mb-6 font-mono-label text-[10px] tracking-label uppercase text-[#1A3626]/50">
                    {f.guestLegend}
                  </legend>

                  <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="first_name">{f.firstName} *</label>
                      <input
                        id="first_name" type="text" autoComplete="given-name" data-testid="field-first-name"
                        className={inputClass} value={values.first_name}
                        onChange={(ev) => setField("first_name", ev.target.value)}
                      />
                      <Err name="first_name" />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="last_name">{f.lastName} *</label>
                      <input
                        id="last_name" type="text" autoComplete="family-name" data-testid="field-last-name"
                        className={inputClass} value={values.last_name}
                        onChange={(ev) => setField("last_name", ev.target.value)}
                      />
                      <Err name="last_name" />
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="email">{f.email} *</label>
                      <input
                        id="email" type="email" autoComplete="email" data-testid="field-email"
                        className={inputClass} value={values.email}
                        onChange={(ev) => setField("email", ev.target.value)}
                      />
                      <Err name="email" />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="phone">{f.phone}</label>
                      <input
                        id="phone" type="tel" autoComplete="tel" data-testid="field-phone"
                        className={inputClass} value={values.phone}
                        onChange={(ev) => setField("phone", ev.target.value)}
                      />
                      <Err name="phone" />
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="city">{f.city}</label>
                      <input
                        id="city" type="text" autoComplete="address-level2" data-testid="field-city"
                        className={inputClass} value={values.city}
                        onChange={(ev) => setField("city", ev.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="country">{f.country}</label>
                      <select
                        id="country" data-testid="field-country" className={inputClass}
                        value={values.country} onChange={(ev) => setField("country", ev.target.value)}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className={labelClass} htmlFor="message">{f.message}</label>
                    <textarea
                      id="message" rows={3} maxLength={2000} data-testid="field-message"
                      placeholder={f.messagePlaceholder}
                      className={`${inputClass} resize-y`}
                      value={values.message}
                      onChange={(ev) => setField("message", ev.target.value)}
                    />
                  </div>
                </fieldset>

                {/* Honeypot: invisibile agli umani, compilato dai bot. Non rimuovere. */}
                <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
                  <label htmlFor="website">Website</label>
                  <input
                    id="website" type="text" tabIndex={-1} autoComplete="off"
                    value={values.website} onChange={(ev) => setField("website", ev.target.value)}
                  />
                </div>

                {/* 03 — consensi */}
                <fieldset className="mb-8 border-0 p-0">
                  <legend className="mb-6 font-mono-label text-[10px] tracking-label uppercase text-[#1A3626]/50">
                    {f.consentLegend}
                  </legend>

                  <label className="mb-4 flex items-start gap-3 font-body text-sm text-[#1A3626]/85">
                    <input
                      type="checkbox" data-testid="field-privacy" className="mt-1 h-4 w-4 flex-none accent-[#D48924]"
                      checked={values.privacy} onChange={(ev) => setField("privacy", ev.target.checked)}
                    />
                    <span>{f.privacy} *</span>
                  </label>
                  <Err name="privacy" />

                  <label className="flex items-start gap-3 font-body text-sm text-[#1A3626]/85">
                    <input
                      type="checkbox" data-testid="field-marketing" className="mt-1 h-4 w-4 flex-none accent-[#D48924]"
                      checked={values.marketing} onChange={(ev) => setField("marketing", ev.target.checked)}
                    />
                    <span>{f.marketing}</span>
                  </label>
                </fieldset>

                <button
                  type="submit"
                  data-testid="submit-booking"
                  disabled={status === "sending"}
                  className="inline-flex items-center justify-center rounded-full bg-[#1A3626] px-8 py-4 font-mono-label text-[10px] tracking-label uppercase text-[#F5F3E9] transition-colors duration-200 hover:bg-[#D48924] disabled:opacity-50"
                >
                  {status === "sending" ? f.submitting : f.submit}
                </button>

                {feedback ? (
                  <p role="alert" data-testid="booking-feedback" className="mt-6 border border-[#8b3a2e] bg-[#f6e4e1] p-4 font-body text-sm text-[#8b3a2e]">
                    {feedback}
                  </p>
                ) : null}
              </form>
            )}
          </Reveal>

          {/* ---------------- Preventivo ---------------- */}
          <Reveal className="lg:col-span-5 lg:sticky lg:top-28" y={24} delay={0.1}>
            <div data-testid="price-summary" className="border border-[#1A3626]/15 bg-[#D3D9C9] p-8">
              <h3 className="font-display text-2xl text-[#1A3626]">{f.summaryTitle}</h3>

              <dl className="mt-6 grid grid-cols-[1fr_auto] gap-y-3 font-body text-sm text-[#1A3626]">
                <dt className="opacity-70">{f.summaryRoom}</dt>
                <dd className="text-right">{room ? room[lang] : "—"}</dd>
                <dt className="opacity-70">{f.summaryNights}</dt>
                <dd className="text-right tabular-nums">{nights > 0 ? nights : "—"}</dd>
                <dt className="opacity-70">{f.summaryGuests}</dt>
                <dd className="text-right tabular-nums">{guests > 0 ? guests : "—"}</dd>
                <dt className="opacity-70">{f.summaryRate}</dt>
                <dd className="text-right tabular-nums">{room && room.available ? euro(room.price) : "—"}</dd>
              </dl>

              <div className="mt-6 flex items-baseline justify-between border-t border-[#1A3626]/20 pt-6">
                <span className="font-mono-label text-[10px] tracking-label uppercase text-[#1A3626]/70">
                  {f.summaryTotal}
                </span>
                <span className="font-display text-3xl text-[#1A3626]">{total > 0 ? euro(total) : "—"}</span>
              </div>

              <p className="mt-6 font-body text-xs leading-relaxed text-[#1A3626]/60">{f.summaryNote}</p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href={mailto}
                data-testid="booking-contact-link"
                className="inline-flex flex-1 items-center justify-center rounded-full border border-[#1A3626] px-5 py-3 font-body text-sm text-[#1A3626] transition-colors duration-200 hover:bg-[#1A3626] hover:text-[#F5F3E9]"
              >
                {lang === "it" ? "Scrivici" : "Email us"}
              </a>
              <a
                href={`tel:${CONTACT.phoneRaw}`}
                className="inline-flex flex-1 items-center justify-center rounded-full border border-[#1A3626] px-5 py-3 font-body text-sm text-[#1A3626] transition-colors duration-200 hover:bg-[#D48924] hover:border-[#D48924] hover:text-white"
              >
                {lang === "it" ? "Chiamaci" : "Call us"}
              </a>
            </div>

            <p className="mt-5 font-mono-label text-[10px] tracking-label text-[#1A3626]/50">{t.note}</p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
