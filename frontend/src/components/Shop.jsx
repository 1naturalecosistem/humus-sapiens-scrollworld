import { useLang } from "../lib/i18n";
import { CONTENT, SHOP, CONTACT } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";

function ProductCard({ data, lang, delay }) {
  const c = data[lang];
  const t = CONTENT[lang].shop;
  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent("Ordine miele — " + c.name)}`;
  return (
    <Reveal delay={delay} y={36} className="group bg-[#F5F3E9] border border-[#1A3626]/15 flex flex-col overflow-hidden">
      {/* Label strip */}
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

export default function Shop() {
  const { lang } = useLang();
  const t = CONTENT[lang].shop;

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <ProductCard data={SHOP.castagno} lang={lang} delay={0} />
          <ProductCard data={SHOP.millefiori} lang={lang} delay={0.1} />
        </div>

        <Reveal className="mt-12 flex items-center justify-center gap-3" y={16}>
          <span className="w-2 h-2 rounded-full bg-[#D48924] animate-pulse" />
          <span className="font-mono-label text-xs tracking-label text-[#1A3626]/60">{t.soon}</span>
        </Reveal>
      </div>
    </section>
  );
}
