import { useState, useMemo, useCallback, useEffect } from "react";
import { useLang } from "../lib/i18n";
import { CONTENT, SHOP, CONTACT } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";
import { ENDPOINTS, postJSON, fetchCatalog } from "../lib/api";

// Spedizione: deve restare allineata alle costanti in api/order.php, che è
// chi calcola davvero il totale. Qui serve solo a mostrare la stima.
const SHIPPING_COST = 7.0;
const FREE_SHIPPING_OVER = 60.0;

const euro = (n) =>
  `€ ${n.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Il listino statico di content.js, nella forma che restituisce api/catalog.php. */
function fallbackProducts() {
  return SHOP.categories.flatMap((category) =>
    category.items.map((key) => {
      const p = SHOP[key];
      return {
        slug: key,
        name: p.it.name,
        name_en: p.en.name,
        tagline: p.it.tagline,
        tagline_en: p.en.tagline,
        note: p.it.note,
        note_en: p.en.note,
        category: category.id,
        accent: p.accent,
        image: p.label,
        available: true,
        variants: p.sizes.map((s) => ({
          sku: `${key}-${s.size.replace(/\s+/g, "").toLowerCase()}`,
          size: s.size,
          price: Number(s.price.replace(",", ".")),
          available: true,
        })),
      };
    })
  );
}

/** Le immagini del DB sono nomi di file in public/; quelle statiche già URL. */
function imageUrl(image) {
  if (!image) return "";
  return image.startsWith("http") || image.startsWith("/")
    ? image
    : `${process.env.PUBLIC_URL}/${image}`;
}

const EMPTY_FORM = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  country: "Italia",
  message: "",
  privacy: false,
  marketing: false,
  website: "",
};

const inputClass =
  "w-full bg-transparent border-b border-[#1A3626]/20 py-2 text-[#1A3626] font-body " +
  "focus:outline-none focus:border-[#D48924] transition-colors duration-200";
const labelClass = "font-mono-label text-[10px] tracking-label text-[#1A3626]/60 uppercase";

function StoreAction({ title, body, cta, href, accent, delay, external }) {
  return (
    <Reveal delay={delay} y={24} className="group rounded-[2rem] border border-[#1A3626]/15 bg-white/80 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
        <span className="text-sm font-semibold text-white">↗</span>
      </div>
      <h3 className="mt-6 font-display text-2xl text-[#1A3626]">{title}</h3>
      <p className="mt-3 font-body text-base leading-relaxed text-[#1A3626]/70">{body}</p>
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
        className="mt-6 inline-flex items-center rounded-full bg-[#1A3626] px-5 py-3 text-sm font-medium text-[#F5F3E9] transition-colors duration-200 hover:bg-[#D48924]"
      >
        {cta}
      </a>
    </Reveal>
  );
}

function ProductCard({ product, lang, t, onAdd, cart, delay }) {
  const name = lang === "en" ? product.name_en : product.name;
  const tagline = lang === "en" ? product.tagline_en : product.tagline;
  const note = lang === "en" ? product.note_en : product.note;
  const c = t.cart;

  return (
    <Reveal delay={delay} y={36} className="group bg-[#F5F3E9] border border-[#1A3626]/15 flex flex-col overflow-hidden">
      <div className="relative bg-white overflow-hidden border-b border-[#1A3626]/10">
        <img
          src={imageUrl(product.image)}
          alt={name}
          className="w-full h-auto object-contain transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>

      <div className="p-8 md:p-10 flex flex-col flex-1">
        <h3 className="font-display text-3xl md:text-4xl text-[#1A3626] leading-none">{name}</h3>
        <p className="font-mono-label text-[10px] tracking-label mt-3" style={{ color: product.accent }}>{tagline}</p>
        <p className="font-body text-[#1A3626]/70 text-base leading-relaxed mt-5">{note}</p>

        <div className="mt-8 pt-2">
          <span className="font-mono-label text-[10px] tracking-label text-[#1A3626]/50">{t.sizesLabel}</span>
          <div className="mt-4 flex flex-col divide-y divide-[#1A3626]/12">
            {product.variants.map((v) => {
              const inCart = cart[v.sku];
              return (
                <div key={v.sku} className="flex items-center justify-between gap-3 py-3">
                  <span className="font-display text-2xl text-[#1A3626]">{v.size}</span>
                  <span className="flex-1 border-b border-dotted border-[#1A3626]/25" />
                  <span className="font-body text-lg text-[#1A3626] tabular-nums">{euro(v.price)}</span>
                  <button
                    type="button"
                    data-testid={`add-${v.sku}`}
                    disabled={!v.available}
                    onClick={() => onAdd(product, v)}
                    className="ml-2 shrink-0 rounded-full border border-[#1A3626] px-4 py-1.5 font-mono-label text-[10px] tracking-label uppercase text-[#1A3626] transition-colors duration-200 hover:bg-[#1A3626] hover:text-[#F5F3E9] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#1A3626]"
                  >
                    {!v.available ? c.soldOut : inCart ? `${c.added} (${inCart.quantity})` : c.add}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function Shop() {
  const { lang } = useLang();
  const t = CONTENT[lang].shop;
  const c = t.cart;

  const [products, setProducts] = useState(fallbackProducts);
  const [cart, setCart] = useState({});          // sku → { sku, name, size, price, quantity }
  const [delivery, setDelivery] = useState("pickup");
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");  // idle | sending | success | error
  const [feedback, setFeedback] = useState(null);
  const [reference, setReference] = useState("");

  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
    lang === "it" ? "Ordine miele — Humus Sapiens" : "Honey order — Humus Sapiens"
  )}`;

  // Il listino vero sta nel gestionale. Se l'API non risponde restano i dati
  // statici, così la vetrina si vede comunque.
  useEffect(() => {
    let cancelled = false;
    fetchCatalog().then((data) => {
      if (!cancelled && data && Array.isArray(data.products) && data.products.length > 0) {
        setProducts(data.products);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const itemsTotal = useMemo(
    () => Object.values(cart).reduce((sum, l) => sum + l.price * l.quantity, 0),
    [cart]
  );
  const shipping =
    delivery === "shipping" && itemsTotal > 0 && itemsTotal < FREE_SHIPPING_OVER ? SHIPPING_COST : 0;
  const total = itemsTotal + shipping;
  const lines = Object.values(cart);

  const addToCart = useCallback((product, variant) => {
    const name = product.name;
    setCart((prev) => {
      const existing = prev[variant.sku];
      return {
        ...prev,
        [variant.sku]: {
          sku: variant.sku,
          name,
          size: variant.size,
          price: variant.price,
          quantity: existing ? existing.quantity + 1 : 1,
        },
      };
    });
    setErrors((prev) => (prev.items ? { ...prev, items: undefined } : prev));
  }, []);

  const setQuantity = useCallback((sku, quantity) => {
    setCart((prev) => {
      if (quantity < 1) {
        const { [sku]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [sku]: { ...prev[sku], quantity: Math.min(50, quantity) } };
    });
  }, []);

  const setField = useCallback((name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
  }, []);

  function validate() {
    const e = {};
    if (lines.length === 0) e.items = c.errEmpty;
    if (form.first_name.trim().length < 2) e.first_name = c.errFirstName;
    if (form.last_name.trim().length < 2) e.last_name = c.errLastName;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) e.email = c.errEmail;
    if (form.phone.trim() && !/^[0-9+().\s-]{6,50}$/.test(form.phone.trim())) e.phone = c.errPhone;
    if (delivery === "shipping") {
      if (form.address.trim().length < 5) e.address = c.errAddress;
      if (form.city.trim().length < 2) e.city = c.errCity;
    }
    if (!form.privacy) e.privacy = c.errPrivacy;
    return e;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFeedback(null);

    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setStatus("error");
      setFeedback(c.errorFields);
      return;
    }

    setStatus("sending");
    setErrors({});

    const result = await postJSON(ENDPOINTS.order, {
      ...form,
      delivery,
      locale: lang,
      items: lines.map((l) => ({ sku: l.sku, quantity: l.quantity })),
    });

    if (result.ok) {
      setReference(result.data.reference || "");
      setCart({});
      setForm(EMPTY_FORM);
      setStatus("success");
      return;
    }

    if (result.networkError) {
      setStatus("error");
      setFeedback(result.timedOut ? c.errorTimeout : c.errorNetwork);
      return;
    }

    if (result.data.fields) setErrors(result.data.fields);
    setStatus("error");
    setFeedback(result.data.error || c.errorGeneric);
  }

  const Err = ({ name }) =>
    errors[name] ? (
      <p role="alert" className="mt-1 font-body text-xs text-[#8b3a2e]">
        {errors[name]}
      </p>
    ) : null;

  const categories = useMemo(() => {
    const map = new Map();
    products.forEach((p) => {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category).push(p);
    });
    return Array.from(map.entries());
  }, [products]);

  return (
    <section id="shop" data-testid="shop-section" className="relative bg-[#D3D9C9]/40 py-28 md:py-40">
      <div className="mx-auto max-w-[1500px] px-6 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16 md:mb-24">
          <span className="md:col-span-3 font-mono-label text-xs tracking-label text-[#D48924] pt-3">{t.label}</span>
          <div className="md:col-span-9">
            <h2 className="font-display font-light text-[#1A3626] text-5xl sm:text-7xl lg:text-8xl leading-[0.9]">
              <RevealWords text={t.heading} />
              <span className="italic block text-[#2f4c3a]"><RevealWords text={t.headingEm} /></span>
            </h2>
            <Reveal className="mt-8" y={20}>
              <p className="font-body text-lg md:text-xl text-[#1A3626]/70 max-w-2xl leading-relaxed">{t.lead}</p>
            </Reveal>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <StoreAction
            title={lang === "it" ? "Compra il miele" : "Buy the honey"}
            body={lang === "it" ? "Scegli i formati, ordina online e paghi direttamente a noi. Nessuna piattaforma in mezzo." : "Pick your sizes, order online and pay us directly. No platform in between."}
            cta={lang === "it" ? "Vai al catalogo" : "Go to the catalogue"}
            href="#catalogo-miele"
            accent="#1A3626"
            delay={0}
          />
          <StoreAction
            title={lang === "it" ? "Contribuisci al progetto" : "Support the project"}
            body={lang === "it" ? "Sostieni la rigenerazione del suolo e le attività sociali con una donazione GoFundMe." : "Support soil regeneration and social farming with a GoFundMe donation."}
            cta={lang === "it" ? "Dona su GoFundMe" : "Donate on GoFundMe"}
            href="https://www.gofundme.com/f/humus-sapiens"
            accent="#D48924"
            delay={0.08}
            external
          />
          <StoreAction
            title={lang === "it" ? "Prenota Villa Levante o Ponente" : "Book Villa Levante or Ponente"}
            body={lang === "it" ? "Due ville indipendenti disponibili con prenotazione diretta e senza intermediari." : "Two independent villas available with direct booking and no intermediaries."}
            cta={lang === "it" ? "Verifica disponibilità" : "Check availability"}
            href="#prenota"
            accent="#2f4c3a"
            delay={0.16}
          />
        </div>

        {/* ---------------- Catalogo ---------------- */}
        <div id="catalogo-miele">
          {categories.map(([categoryId, items], index) => {
            const meta = SHOP.categories.find((cat) => cat.id === categoryId);
            return (
              <div key={categoryId} className="mt-14">
                {meta ? (
                  <Reveal delay={0.08 * index} y={24} className="rounded-[2rem] border border-[#1A3626]/15 bg-white/80 p-8 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
                    <h3 className="font-display text-3xl text-[#1A3626]">{meta.label[lang]}</h3>
                    <p className="mt-4 font-body text-base leading-relaxed text-[#1A3626]/70">{meta.description[lang]}</p>
                  </Reveal>
                ) : null}
                <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((product, i) => (
                    <ProductCard
                      key={product.slug}
                      product={product}
                      lang={lang}
                      t={t}
                      cart={cart}
                      onAdd={addToCart}
                      delay={0.08 * i}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ---------------- Carrello e ordine ---------------- */}
        <div id="ordine" className="mt-16">
          {status === "success" ? (
            <Reveal y={24}>
              <div
                data-testid="order-success"
                role="status"
                className="rounded-[2rem] border border-[#1A3626]/20 bg-[#D3D9C9] p-8 md:p-10"
              >
                <h3 className="font-display text-3xl text-[#1A3626]">{c.successTitle}</h3>
                <p className="mt-4 font-body text-base leading-relaxed text-[#1A3626]/80">{c.successBody}</p>
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
                  {c.newOrder}
                </button>
              </div>
            </Reveal>
          ) : (
            <Reveal y={24}>
              <form
                onSubmit={handleSubmit}
                noValidate
                data-testid="order-form"
                className="rounded-[2rem] border border-[#1A3626]/15 bg-white p-8 md:p-10 shadow-[0_20px_60px_rgba(0,0,0,0.06)]"
              >
                <h3 className="font-display text-3xl text-[#1A3626]">{c.title}</h3>

                {/* Righe del carrello */}
                <div className="mt-6" data-testid="cart-lines">
                  {lines.length === 0 ? (
                    <p className="font-body text-base text-[#1A3626]/60">{c.empty}</p>
                  ) : (
                    <div className="divide-y divide-[#1A3626]/12">
                      {lines.map((l) => (
                        <div key={l.sku} className="flex flex-wrap items-center gap-3 py-4">
                          <div className="min-w-[180px] flex-1">
                            <span className="font-display text-xl text-[#1A3626]">{l.name}</span>
                            <span className="ml-2 font-body text-sm text-[#1A3626]/60">{l.size}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button" aria-label="-"
                              onClick={() => setQuantity(l.sku, l.quantity - 1)}
                              className="h-8 w-8 rounded-full border border-[#1A3626]/30 text-[#1A3626] transition-colors duration-200 hover:bg-[#1A3626] hover:text-[#F5F3E9]"
                            >−</button>
                            <span className="w-8 text-center font-body tabular-nums">{l.quantity}</span>
                            <button
                              type="button" aria-label="+"
                              onClick={() => setQuantity(l.sku, l.quantity + 1)}
                              className="h-8 w-8 rounded-full border border-[#1A3626]/30 text-[#1A3626] transition-colors duration-200 hover:bg-[#1A3626] hover:text-[#F5F3E9]"
                            >+</button>
                          </div>
                          <span className="w-24 text-right font-body text-lg tabular-nums text-[#1A3626]">
                            {euro(l.price * l.quantity)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setQuantity(l.sku, 0)}
                            className="font-mono-label text-[10px] tracking-label uppercase text-[#8b3a2e] hover:underline"
                          >
                            {c.remove}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Err name="items" />
                </div>

                {/* Totali */}
                <dl className="mt-6 grid grid-cols-[1fr_auto] gap-y-2 border-t border-[#1A3626]/15 pt-6 font-body text-sm text-[#1A3626]">
                  <dt className="opacity-70">{c.itemsTotal}</dt>
                  <dd className="text-right tabular-nums">{euro(itemsTotal)}</dd>
                  <dt className="opacity-70">{c.shipping}</dt>
                  <dd className="text-right tabular-nums">
                    {delivery === "pickup" ? c.pickupFree : shipping > 0 ? euro(shipping) : c.shippingFree}
                  </dd>
                </dl>
                <div className="mt-4 flex items-baseline justify-between border-t border-[#1A3626]/20 pt-4">
                  <span className="font-mono-label text-[10px] tracking-label uppercase text-[#1A3626]/70">{c.total}</span>
                  <span className="font-display text-3xl text-[#1A3626]" data-testid="cart-total">{euro(total)}</span>
                </div>

                {/* Consegna */}
                <fieldset className="mt-10 border-0 p-0">
                  <legend className="mb-4 font-mono-label text-[10px] tracking-label uppercase text-[#1A3626]/50">
                    {c.deliveryLegend}
                  </legend>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {[
                      { key: "pickup", label: c.pickup, note: c.pickupNote },
                      { key: "shipping", label: c.shippingOption, note: c.shippingNote },
                    ].map((opt) => (
                      <label
                        key={opt.key}
                        className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors duration-200 ${
                          delivery === opt.key ? "border-[#D48924] bg-[#D48924]/5" : "border-[#1A3626]/20"
                        }`}
                      >
                        <input
                          type="radio" name="delivery" value={opt.key}
                          data-testid={`delivery-${opt.key}`}
                          checked={delivery === opt.key}
                          onChange={() => setDelivery(opt.key)}
                          className="mt-1 h-4 w-4 flex-none accent-[#D48924]"
                        />
                        <span>
                          <span className="block font-body text-base text-[#1A3626]">{opt.label}</span>
                          <span className="block font-body text-xs text-[#1A3626]/60">{opt.note}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {/* Dati cliente */}
                <fieldset className="mt-10 border-0 p-0">
                  <legend className="mb-6 font-mono-label text-[10px] tracking-label uppercase text-[#1A3626]/50">
                    {c.contactLegend}
                  </legend>

                  <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="o_first_name">{c.firstName} *</label>
                      <input id="o_first_name" type="text" autoComplete="given-name" data-testid="order-first-name"
                             className={inputClass} value={form.first_name}
                             onChange={(ev) => setField("first_name", ev.target.value)} />
                      <Err name="first_name" />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="o_last_name">{c.lastName} *</label>
                      <input id="o_last_name" type="text" autoComplete="family-name" data-testid="order-last-name"
                             className={inputClass} value={form.last_name}
                             onChange={(ev) => setField("last_name", ev.target.value)} />
                      <Err name="last_name" />
                    </div>
                  </div>

                  <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label className={labelClass} htmlFor="o_email">{c.email} *</label>
                      <input id="o_email" type="email" autoComplete="email" data-testid="order-email"
                             className={inputClass} value={form.email}
                             onChange={(ev) => setField("email", ev.target.value)} />
                      <Err name="email" />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="o_phone">{c.phone}</label>
                      <input id="o_phone" type="tel" autoComplete="tel" data-testid="order-phone"
                             className={inputClass} value={form.phone}
                             onChange={(ev) => setField("phone", ev.target.value)} />
                      <Err name="phone" />
                    </div>
                  </div>

                  {delivery === "shipping" ? (
                    <div className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
                      <div className="sm:col-span-2">
                        <label className={labelClass} htmlFor="o_address">{c.address} *</label>
                        <input id="o_address" type="text" autoComplete="street-address" data-testid="order-address"
                               className={inputClass} value={form.address}
                               onChange={(ev) => setField("address", ev.target.value)} />
                        <Err name="address" />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="o_city">{c.city} *</label>
                        <input id="o_city" type="text" autoComplete="address-level2" data-testid="order-city"
                               className={inputClass} value={form.city}
                               onChange={(ev) => setField("city", ev.target.value)} />
                        <Err name="city" />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className={labelClass} htmlFor="o_message">{c.message}</label>
                    <textarea id="o_message" rows={3} maxLength={2000} data-testid="order-message"
                              placeholder={c.messagePlaceholder} className={`${inputClass} resize-y`}
                              value={form.message} onChange={(ev) => setField("message", ev.target.value)} />
                  </div>
                </fieldset>

                {/* Honeypot: invisibile agli umani, compilato dai bot. */}
                <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
                  <label htmlFor="o_website">Website</label>
                  <input id="o_website" type="text" tabIndex={-1} autoComplete="off"
                         value={form.website} onChange={(ev) => setField("website", ev.target.value)} />
                </div>

                {/* Consensi */}
                <div className="mt-8">
                  <label className="mb-4 flex items-start gap-3 font-body text-sm text-[#1A3626]/85">
                    <input type="checkbox" data-testid="order-privacy" className="mt-1 h-4 w-4 flex-none accent-[#D48924]"
                           checked={form.privacy} onChange={(ev) => setField("privacy", ev.target.checked)} />
                    <span>{c.privacy} *</span>
                  </label>
                  <Err name="privacy" />

                  <label className="flex items-start gap-3 font-body text-sm text-[#1A3626]/85">
                    <input type="checkbox" data-testid="order-marketing" className="mt-1 h-4 w-4 flex-none accent-[#D48924]"
                           checked={form.marketing} onChange={(ev) => setField("marketing", ev.target.checked)} />
                    <span>{c.marketing}</span>
                  </label>
                </div>

                <button
                  type="submit"
                  data-testid="submit-order"
                  disabled={status === "sending"}
                  className="mt-8 inline-flex items-center justify-center rounded-full bg-[#1A3626] px-8 py-4 font-mono-label text-[10px] tracking-label uppercase text-[#F5F3E9] transition-colors duration-200 hover:bg-[#D48924] disabled:opacity-50"
                >
                  {status === "sending" ? c.submitting : c.submit}
                </button>

                {feedback ? (
                  <p role="alert" data-testid="order-feedback" className="mt-6 border border-[#8b3a2e] bg-[#f6e4e1] p-4 font-body text-sm text-[#8b3a2e]">
                    {feedback}
                  </p>
                ) : null}
              </form>
            </Reveal>
          )}
        </div>

        <Reveal className="mt-10 rounded-[2rem] border border-[#1A3626]/15 bg-white/90 p-8 text-[#1A3626] shadow-[0_20px_60px_rgba(0,0,0,0.08)]" y={16}>
          <p className="font-body text-base leading-relaxed">
            {lang === "it"
              ? "Acquista e sostieni in modo diretto: zero frizioni, zero commissioni di piattaforma. Il tuo ordine arriva da chi coltiva, alleva e trasforma nel territorio."
              : "Buy and support directly: zero friction, zero platform fees. Your order comes from those who cultivate, raise and process within the territory."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={mailto} className="rounded-full border border-[#1A3626] px-5 py-3 text-sm text-[#1A3626] transition-colors duration-200 hover:bg-[#1A3626] hover:text-[#F5F3E9]">
              {lang === "it" ? "Preferisci scriverci?" : "Rather write to us?"}
            </a>
            <a href={`tel:${CONTACT.phoneRaw}`} className="rounded-full border border-[#1A3626] px-5 py-3 text-sm text-[#1A3626] transition-colors duration-200 hover:bg-[#D48924] hover:border-[#D48924] hover:text-white">
              {lang === "it" ? "Chiama per ordini" : "Call to order"}
            </a>
          </div>
        </Reveal>

        <Reveal className="mt-10 flex items-center justify-center gap-3" y={16}>
          <span className="w-2 h-2 rounded-full bg-[#D48924] animate-pulse" />
          <span className="font-mono-label text-xs tracking-label text-[#1A3626]/60">{t.soon}</span>
        </Reveal>
      </div>
    </section>
  );
}
