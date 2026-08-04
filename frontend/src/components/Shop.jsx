import { useLang } from "../lib/i18n";
import { CONTENT, SHOP, CONTACT } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";

function StoreAction({ title, body, cta, href, accent, delay }) {
  return (
    <Reveal delay={delay} y={24} className="group rounded-[2rem] border border-[#1A3626]/15 bg-white/80 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
      <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: accent }}>
        <span className="text-sm font-semibold text-white">↗</span>
      </div>
      <h3 className="mt-6 font-display text-2xl text-[#1A3626]">{title}</h3>
      <p className="mt-3 font-body text-base leading-relaxed text-[#1A3626]/70">{body}</p>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex items-center rounded-full bg-[#1A3626] px-5 py-3 text-sm font-medium text-[#F5F3E9] transition hover:bg-[#D48924]"
      >
        {cta}
      </a>
    </Reveal>
  );
}

function ProductCard({ data, lang, delay }) {
  const c = data[lang];
  const t = CONTENT[lang].shop;
  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent("Ordine miele — " + c.name)}`;

  return (
    <Reveal delay={delay} y={36} className="group bg-[#F5F3E9] border border-[#1A3626]/15 flex flex-col overflow-hidden">
      <div className="relative bg-white overflow-hidden border-b border-[#1A3626]/10">
        <img
          src={data.label}
          alt={c.name}
          className="w-full h-auto object-contain transition-transform duration-[1200ms] ease-out group-hover:scale-[1.03]"
          loading="lazy"
        />
      </div>

      <div className="p-8 md:p-10 flex flex-col flex-1">
        <h3 className="font-display text-3xl md:text-4xl text-[#1A3626] leading-none">{c.name}</h3>
        <p className="font-mono-label text-[10px] tracking-label mt-3" style={{ color: data.accent }}>{c.tagline}</p>
        <p className="font-body text-[#1A3626]/70 text-base leading-relaxed mt-5">{c.note}</p>

        <div className="mt-8 pt-2">
          <span className="font-mono-label text-[10px] tracking-label text-[#1A3626]/50">{t.sizesLabel}</span>
          <div className="mt-4 flex flex-col divide-y divide-[#1A3626]/12">
            {data.sizes.map((s, i) => (
              <div key={i} className="flex items-baseline justify-between py-3">
                <span className="font-display text-2xl text-[#1A3626]">{s.size}</span>
                <span className="flex-1 mx-4 border-b border-dotted border-[#1A3626]/25 translate-y-[-4px]" />
                <span className="font-body text-lg text-[#1A3626]">€ {s.price}</span>
              </div>
            ))}
          </div>
        </div>

        <a
          data-testid={`order-${c.name.toLowerCase().includes("castagno") || c.name.toLowerCase().includes("chestnut") ? "castagno" : "millefiori"}`}
          href={mailto}
          className="mt-8 inline-flex items-center justify-center gap-2 font-mono-label text-xs tracking-label py-4 px-6 bg-[#1A3626] text-[#F5F3E9] hover:bg-[#D48924] transition-colors duration-300"
        >
          {t.order}
        </a>
      </div>
    </Reveal>
  );
}

function CategorySection({ category, lang, delay }) {
  return (
    <Reveal delay={delay} y={24} className="rounded-[2rem] border border-[#1A3626]/15 bg-white/80 p-8 shadow-[0_16px_48px_rgba(0,0,0,0.06)]">
      <h3 className="font-display text-3xl text-[#1A3626]">{category.label[lang]}</h3>
      <p className="mt-4 font-body text-base leading-relaxed text-[#1A3626]/70">{category.description[lang]}</p>
    </Reveal>
  );
}

export default function Shop() {
  const { lang } = useLang();
  const t = CONTENT[lang].shop;
  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(lang === "it" ? "Ordine miele — Humus Sapiens" : "Honey order — Humus Sapiens")}`;

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

        <Reveal className="mb-10 rounded-[2rem] border border-[#1A3626]/15 bg-[#1A3626] p-8 text-[#F5F3E9] shadow-[0_20px_60px_rgba(0,0,0,0.12)]" y={16}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono-label text-[10px] uppercase tracking-label text-[#D48924]">{lang === "it" ? "Pagamento diretto" : "Direct payment"}</p>
              <h3 className="mt-2 font-display text-3xl md:text-4xl">{lang === "it" ? "Acquisto diretto, zero commissioni" : "Direct purchase, zero commission"}</h3>
            </div>
            <a
              href={mailto}
              className="inline-flex items-center justify-center rounded-full bg-[#F5F3E9] px-5 py-3 text-sm font-medium text-[#1A3626] transition hover:bg-[#D48924] hover:text-white"
            >
              {lang === "it" ? "Ordina direttamente via email" : "Order directly by email"}
            </a>
          </div>
          <p className="mt-5 text-sm text-[#F5F3E9]/80 max-w-2xl leading-relaxed">
            {lang === "it"
              ? "Scegli un prodotto, manda la richiesta e gestiamo insieme pagamento diretto o consegna. Nessuna piattaforma esterna, solo rapporto umano con Humus Sapiens."
              : "Choose a product, send the request and we will arrange direct payment or delivery. No external platforms, only a human connection with Humus Sapiens."}
          </p>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <StoreAction
            title={lang === "it" ? "Compra il miele" : "Buy the honey"}
            body={lang === "it" ? "Ordini diretti via email o telefono, consegna personalizzata e pagamento diretto." : "Direct orders by email or phone, personalized delivery and direct payment."}
            cta={lang === "it" ? "Richiedi un ordine" : "Request order"}
            href={mailto}
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

        {SHOP.categories.map((category, index) => (
          <div key={category.id} className="mt-14">
            <CategorySection category={category} lang={lang} delay={0.08 * index} />
            <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {category.items.map((itemKey, itemIndex) => (
                <ProductCard key={itemKey} data={SHOP[itemKey]} lang={lang} delay={0.08 * itemIndex} />
              ))}
            </div>
          </div>
        ))}

        <Reveal className="mt-10 rounded-[2rem] border border-[#1A3626]/15 bg-white/90 p-8 text-[#1A3626] shadow-[0_20px_60px_rgba(0,0,0,0.08)]" y={16}>
          <p className="font-body text-base leading-relaxed">
            {lang === "it"
              ? "Acquista e sostieni in modo diretto: zero frizioni, zero commissioni di piattaforma. Il tuo ordine arriva da chi coltiva, alleva e trasforma nel territorio."
              : "Buy and support directly: zero friction, zero platform fees. Your order comes from those who cultivate, raise and process within the territory."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={mailto} className="rounded-full bg-[#1A3626] px-5 py-3 text-sm text-[#F5F3E9] transition hover:bg-[#D48924]">
              {lang === "it" ? "Scrivici per un ordine" : "Email for an order"}
            </a>
            <a href={`tel:${CONTACT.phoneRaw}`} className="rounded-full border border-[#1A3626] px-5 py-3 text-sm text-[#1A3626] transition hover:bg-[#D48924] hover:text-white">
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
