import { useLang } from "../lib/i18n";
import { CONTACT, CONTENT } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";

export default function Prenota() {
  const { lang } = useLang();
  const t = CONTENT[lang].prenota;
  const mailto = `mailto:${CONTACT.email}?subject=${encodeURIComponent(lang === "it" ? "Prenotazione soggiorno — Humus Sapiens" : "Stay booking — Humus Sapiens")}`;

  return (
    <section id="prenota" data-testid="prenota-section" className="relative bg-[#F5F3E9] py-28 md:py-40">
      <div className="mx-auto max-w-[1500px] px-6 md:px-10">
        <div className="mb-14 md:mb-20">
          <span className="block font-mono-label text-xs tracking-label text-[#D48924] mb-8 md:mb-12">{t.label}</span>
          <h2 className="font-display font-light text-[#1A3626] text-[min(9vw,7.5rem)] leading-[0.9]">
            <RevealWords text={t.heading} />
            <span className="italic block text-[#2f4c3a]"><RevealWords text={t.headingEm} /></span>
          </h2>
          <Reveal className="mt-8 md:mt-10" y={20}>
            <p className="font-body text-lg md:text-xl text-[#1A3626]/70 max-w-xl leading-relaxed">{t.lead}</p>
          </Reveal>
        </div>

        <Reveal y={24}>
          <div className="rounded-[2rem] border border-[#1A3626]/15 bg-white p-8 shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
            <h3 className="font-display text-3xl text-[#1A3626]">{lang === "it" ? "Soggiorna in Villa Levante o Ponente" : "Stay in Villa Levante or Ponente"}</h3>
            <p className="mt-4 font-body text-base leading-relaxed text-[#1A3626]/75">{lang === "it" ? "Due ville indipendenti, una proposta diretta e riservata. Scrivici per verificare disponibilità, date e tariffe personalizzate." : "Two independent villas, a direct and private offer. Contact us to check availability, dates and tailored rates."}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href={mailto}
                data-testid="booking-contact-link"
                className="inline-flex items-center justify-center rounded-full bg-[#1A3626] px-6 py-3 text-sm font-medium text-[#F5F3E9] transition hover:bg-[#2f4c3a]"
              >
                {lang === "it" ? "Scrivici per prenotare" : "Email to book"}
              </a>
              <a
                href={`tel:${CONTACT.phoneRaw}`}
                className="inline-flex items-center justify-center rounded-full border border-[#1A3626] px-6 py-3 text-sm font-medium text-[#1A3626] transition hover:bg-[#D48924] hover:text-white"
              >
                {lang === "it" ? "Chiama per disponibilità" : "Call for availability"}
              </a>
            </div>
            <p className="mt-5 font-mono-label text-[10px] tracking-label text-[#1A3626]/50">{t.note}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
