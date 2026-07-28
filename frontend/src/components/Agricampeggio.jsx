import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLang } from "../lib/i18n";
import { CONTENT, IMAGES } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";
import Ribbon from "./Ribbon";

export default function Agricampeggio() {
  const { lang } = useLang();
  const t = CONTENT[lang].agricampeggio;
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1.15, 1]);

  return (
    <section id="agricampeggio" data-testid="agricampeggio-section" className="relative bg-[#F5F3E9]">
      <Ribbon />

      <div className="py-28 md:py-40">
        <div className="mx-auto max-w-[1500px] px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
            <span className="md:col-span-3 font-mono-label text-xs tracking-label text-[#D48924] pt-3">
              {t.label}
            </span>
            <h2 className="md:col-span-9 font-display font-light text-[#1A3626] text-5xl sm:text-7xl lg:text-8xl leading-[0.9]">
              <RevealWords text={t.heading} />
              <span className="italic block text-[#2f4c3a]">
                <RevealWords text={t.headingEm} />
              </span>
            </h2>
          </div>
        </div>

        {/* Full-bleed image */}
        <div ref={ref} className="relative w-full h-[60vh] md:h-[85vh] overflow-hidden my-10">
          <motion.img
            style={{ scale }}
            src={IMAGES.tentForest}
            alt="Terrazza panoramica del fondo verso il mare"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="mx-auto max-w-[1500px] px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start mt-10">
            <Reveal className="md:col-span-5" y={26}>
              <p className="font-body text-lg md:text-xl text-[#1A3626]/80 leading-relaxed">{t.lead}</p>
              {/* The full-bleed image above is the view out; this is the food
                  forest the pitches actually sit in, which the copy claims and
                  nothing on the page was showing. */}
              <div className="relative overflow-hidden aspect-[4/3] mt-10 bg-[#D3D9C9]">
                <img
                  src={IMAGES.foodForest}
                  alt="Le aiuole della food forest dentro il bosco di castagni"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            </Reveal>

            <div className="md:col-span-6 md:col-start-7">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#1A3626]/15 border border-[#1A3626]/15">
                {t.stats.map((s, i) => (
                  <Reveal key={i} delay={i * 0.08} className="bg-[#F5F3E9] p-6 md:p-8">
                    <div className="font-display text-4xl md:text-5xl text-[#1A3626] mb-2">{s.v}</div>
                    <div className="font-mono-label text-[10px] tracking-label text-[#1A3626]/60 leading-relaxed">{s.k}</div>
                  </Reveal>
                ))}
              </div>
            </div>
          </div>

          <Reveal className="mt-20 md:mt-28 max-w-4xl mx-auto text-center" y={30}>
            <p className="font-display italic text-3xl md:text-5xl text-[#1A3626] leading-tight">
              “{t.quote}”
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
