import { useState } from "react";
import { ArrowUpRight, ArrowUp } from "lucide-react";
import { useLang } from "../lib/i18n";
import { CONTENT, CONTACT } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";
import { scrollToId } from "./SmoothScroll";
import PrivacyModal from "./PrivacyModal";

export default function Contatti() {
  const { lang } = useLang();
  const t = CONTENT[lang].contatti;
  const f = CONTENT[lang].footer;
  const [privacyOpen, setPrivacyOpen] = useState(false);

  return (
    <section id="contatti" data-testid="contatti-section" className="relative bg-[#F5F3E9] pt-28 md:pt-40">
      <div className="mx-auto max-w-[1500px] px-6 md:px-10">
        <div className="mb-16 md:mb-24">
          <span className="block font-mono-label text-xs tracking-label text-[#D48924] mb-8 md:mb-12">{t.label}</span>
          {/* Fluid size tuned to the measured line width (~8.4em incl. word spacing)
              so the first line fills the container without wrapping */}
          <h2 className="font-display font-light text-[#1A3626] text-[min(10vw,10.3rem)] leading-[0.85]">
            <RevealWords text={t.heading} />
            <span className="italic block text-[#2f4c3a]"><RevealWords text={t.headingEm} /></span>
          </h2>
          <Reveal className="mt-8 md:mt-10" y={20}>
            <p className="font-body text-lg md:text-xl text-[#1A3626]/70 max-w-xl leading-relaxed">{t.lead}</p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#1A3626]/15 border border-[#1A3626]/15">
          <Reveal className="bg-[#F5F3E9] p-8 md:p-10">
            <span className="font-mono-label text-[10px] tracking-label text-[#1A3626]/50">{t.addressLabel}</span>
            <p className="font-display text-2xl md:text-3xl text-[#1A3626] mt-4 leading-tight">{CONTACT.address}</p>
            <p className="font-mono-label text-xs text-[#D48924] mt-3">{CONTACT.region}</p>
          </Reveal>
          <Reveal delay={0.08} className="bg-[#F5F3E9] p-8 md:p-10">
            <span className="font-mono-label text-[10px] tracking-label text-[#1A3626]/50">{t.emailLabel}</span>
            <a data-testid="contact-email" href={`mailto:${CONTACT.email}`} className="group flex items-start gap-2 mt-4">
              <span className="font-display text-2xl md:text-3xl text-[#1A3626] break-all leading-tight link-underline">{CONTACT.email}</span>
              <ArrowUpRight className="shrink-0 mt-1 text-[#D48924] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" size={22} />
            </a>
          </Reveal>
          <Reveal delay={0.16} className="bg-[#F5F3E9] p-8 md:p-10">
            <span className="font-mono-label text-[10px] tracking-label text-[#1A3626]/50">{t.phoneLabel}</span>
            <a data-testid="contact-phone" href={`tel:${CONTACT.phoneRaw}`} className="group flex items-start gap-2 mt-4">
              <span className="font-display text-2xl md:text-3xl text-[#1A3626] leading-tight link-underline">{CONTACT.phone}</span>
              <ArrowUpRight className="shrink-0 mt-1 text-[#D48924] transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" size={22} />
            </a>
          </Reveal>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-24 md:mt-36 bg-[#1A3626] text-[#F5F3E9]" data-testid="site-footer">
        <div className="mx-auto max-w-[1500px] px-6 md:px-10 pt-16 md:pt-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
            <div className="flex items-center gap-4">
              <img src={`${process.env.PUBLIC_URL}/logo.png`} alt="Humus Sapiens" className="h-14 w-14 object-contain invert-0" style={{ filter: "brightness(0) saturate(100%) invert(93%) sepia(6%) saturate(400%) hue-rotate(30deg)" }} />
              <div>
                <div className="font-display text-3xl leading-none">Humus <span className="italic">Sapiens</span></div>
                <div className="font-mono-label text-[10px] tracking-label text-[#F5F3E9]/60 mt-2">{f.tagline}</div>
              </div>
            </div>
            <button
              data-testid="back-to-top"
              onClick={() => scrollToId("hero")}
              className="group flex items-center gap-3 font-mono-label text-xs tracking-label text-[#F5F3E9]/80 hover:text-[#D48924] transition-colors"
            >
              {f.back}
              <span className="w-9 h-9 rounded-full border border-[#F5F3E9]/40 flex items-center justify-center group-hover:border-[#D48924] transition-colors">
                <ArrowUp size={16} />
              </span>
            </button>
          </div>

        </div>

        {/* Giant wordmark — SVG viewBox matches the measured text width (7.491em
            at font-size 1000) so it always spans edge to edge without clipping */}
        <div className="mt-16 md:mt-24 select-none" aria-hidden="true">
          <svg viewBox="0 0 7491 675" className="block w-full h-auto" preserveAspectRatio="xMidYMax meet">
            <text
              x="0"
              y="652"
              fontFamily="'Cormorant Garamond', serif"
              fontWeight="300"
              fontSize="1000"
              textLength="7491"
              lengthAdjust="spacingAndGlyphs"
              fill="#F5F3E9"
              fillOpacity="0.1"
            >
              HUMUS SAPIENS
            </text>
          </svg>
        </div>

        <div className="mx-auto max-w-[1500px] px-6 md:px-10 pb-16 md:pb-20">
          <div className="mt-10 pt-6 border-t border-[#F5F3E9]/15 flex flex-col md:flex-row justify-between gap-3 font-mono-label text-[10px] tracking-label text-[#F5F3E9]/50">
            <span>© {new Date().getFullYear()} {CONTACT.company} · {f.rights}</span>
            <span>{CONTACT.piva} · {CONTACT.cin}</span>
            <button
              data-testid="privacy-link"
              onClick={() => setPrivacyOpen(true)}
              className="text-left md:text-right hover:text-[#D48924] transition-colors uppercase"
            >
              {f.privacy}
            </button>
          </div>
        </div>
      </footer>

      {/* Map — Google Maps embed, right below the footer */}
      <div className="w-full h-[380px] md:h-[460px]" data-testid="footer-map">
        <iframe
          title="Humus Sapiens — Google Maps"
          src="https://www.google.com/maps?q=Localit%C3%A0%20Baresi%2015%2C%2016030%20Castiglione%20Chiavarese%20GE&z=14&output=embed"
          className="w-full h-full block"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>

      {privacyOpen && <PrivacyModal onClose={() => setPrivacyOpen(false)} />}
    </section>
  );
}
