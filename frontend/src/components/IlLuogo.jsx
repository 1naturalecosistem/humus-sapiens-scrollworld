import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLang } from "../lib/i18n";
import { CONTENT, IMAGES } from "../lib/content";
import { RevealWords } from "./Reveal";

export default function IlLuogo() {
  const { lang } = useLang();
  const t = CONTENT[lang].ilLuogo;
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  return (
    <section id="il-luogo" data-testid="illuogo-section" ref={ref} className="relative h-[110vh] w-full overflow-hidden">
      <motion.img
        style={{ y }}
        src={IMAGES.luogo}
        alt="Alta Val Petronio"
        className="absolute inset-x-0 -top-[15%] w-full h-[140%] object-cover"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1A3626]/85 via-[#1A3626]/25 to-[#1A3626]/40" />

      <div className="relative z-10 h-full mx-auto max-w-[1500px] px-6 md:px-10 flex flex-col justify-between py-28 md:py-32">
        <div>
          <span className="font-mono-label text-xs tracking-label text-[#D3D9C9]">{t.label}</span>
        </div>

        <div className="max-w-4xl">
          <h2 className="font-display font-light text-[#F5F3E9] text-5xl sm:text-7xl lg:text-8xl leading-[0.9]">
            <RevealWords text={t.heading} />
            <span className="italic block text-[#D3D9C9]"><RevealWords text={t.headingEm} /></span>
          </h2>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ amount: 0.4 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 font-body text-lg md:text-xl text-[#F5F3E9]/85 leading-relaxed max-w-2xl"
          >
            {t.lead}
          </motion.p>

          <div className="mt-10 grid grid-cols-3 gap-4 md:gap-8 max-w-2xl">
            {t.facts.map((fct, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.5 }}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="font-display text-3xl md:text-5xl text-[#F5F3E9]">{fct.v}</div>
                <div className="font-mono-label text-[9px] md:text-[10px] tracking-label text-[#D3D9C9] mt-1 leading-tight">{fct.k}</div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#F5F3E9]/25 pt-6">
          <span className="font-mono-label text-[10px] md:text-xs tracking-label text-[#F5F3E9]/80">{t.coords}</span>
          <span className="font-mono-label text-[10px] md:text-xs tracking-label text-[#F5F3E9]/80">Loc. Baresi · Castiglione Chiavarese</span>
        </div>
      </div>
    </section>
  );
}
