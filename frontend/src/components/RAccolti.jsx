import { useLang } from "../lib/i18n";
import { CONTENT, IMAGES } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";

export default function RAccolti() {
  const { lang } = useLang();
  const t = CONTENT[lang].raccolti;

  return (
    <section id="raccolti" data-testid="raccolti-section" className="relative bg-[#1A3626] text-[#F5F3E9] py-28 md:py-40 overflow-hidden">
      <div className="mx-auto max-w-[1500px] px-6 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end mb-16 md:mb-24">
          <div className="md:col-span-8">
            <span className="font-mono-label text-xs tracking-label text-[#D48924]">{t.label}</span>
            <h2 className="mt-6 font-display font-light text-4xl sm:text-5xl lg:text-6xl leading-[0.98]">
              <RevealWords text={t.heading} />
              <span className="italic block text-[#D3D9C9]"><RevealWords text={t.headingEm} /></span>
            </h2>
          </div>
          <Reveal className="md:col-span-4" y={20}>
            <p className="font-display italic text-xl md:text-2xl text-[#D3D9C9]/90 leading-snug border-l border-[#D48924] pl-6">
              {t.note}
            </p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
          <Reveal className="md:col-span-5 relative overflow-hidden aspect-[4/5]" y={30}>
            <img src={IMAGES.community} alt="Lavoro nelle aiuole a mezzaluna del fondo" className="w-full h-full object-cover" loading="lazy" />
          </Reveal>

          <div className="md:col-span-6 md:col-start-7">
            <Reveal y={24}>
              <p className="font-body text-lg md:text-xl text-[#F5F3E9]/80 leading-relaxed mb-10">{t.lead}</p>
            </Reveal>
            <div className="flex flex-col">
              {t.pillars.map((p, i) => (
                <Reveal key={i} delay={i * 0.05} className="group flex items-center gap-6 py-5 border-t border-[#F5F3E9]/15">
                  <span className="font-mono-label text-xs text-[#D48924]">0{i + 1}</span>
                  <span className="font-display text-2xl md:text-3xl text-[#F5F3E9] transition-transform duration-500 group-hover:translate-x-2">{p}</span>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
