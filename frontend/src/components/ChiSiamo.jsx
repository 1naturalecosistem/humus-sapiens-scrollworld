import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLang } from "../lib/i18n";
import { CONTENT, IMAGES } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";

export default function ChiSiamo() {
  const { lang } = useLang();
  const t = CONTENT[lang].chiSiamo;
  const imgRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: imgRef, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "12%"]);

  return (
    <section id="chi-siamo" data-testid="chisiamo-section" className="relative py-28 md:py-40 bg-[#F5F3E9]">
      <div className="mx-auto max-w-[1500px] px-6 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-20 md:mb-28">
          <div className="md:col-span-3">
            <span className="font-mono-label text-xs tracking-label text-[#D48924] pt-3 block">{t.label}</span>
          </div>
          <h2 className="md:col-span-9 font-display font-light text-[#1A3626] text-4xl sm:text-6xl lg:text-7xl leading-[0.95]">
            <RevealWords text={t.heading} />
            <span className="italic block text-[#2f4c3a]">
              <RevealWords text={t.headingEm} />
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-6 items-start">
          {/* Sticky image */}
          <div className="md:col-span-5 md:col-start-1">
            <div ref={imgRef} className="relative overflow-hidden aspect-[4/5] bg-[#D3D9C9]">
              <motion.img
                style={{ y }}
                src={IMAGES.soilHands}
                alt="Vista aerea del casale di Humus Sapiens"
                className="absolute inset-x-0 -top-[15%] w-full h-[135%] object-cover object-[50%_100%]"
                loading="lazy"
              />
            </div>
            <Reveal className="mt-8" y={20}>
              <p className="font-display italic text-2xl md:text-3xl text-[#1A3626] leading-snug">
                {t.lead}
              </p>
            </Reveal>
          </div>

          {/* Chapters */}
          <div className="md:col-span-6 md:col-start-7">
            <div className="flex flex-col">
              {t.chapters.map((c, i) => (
                <Reveal key={c.n} delay={i * 0.05} y={30} className="py-8 md:py-10 border-t border-[#1A3626]/15 first:border-t-0 md:first:border-t">
                  <div className="grid grid-cols-12 gap-4 group">
                    <span className="col-span-2 font-mono-label text-sm text-[#D48924] pt-2">{c.n}</span>
                    <div className="col-span-10">
                      <h3 className="font-display text-3xl md:text-4xl text-[#1A3626] mb-3 transition-transform duration-500 group-hover:translate-x-2">
                        {c.title}
                      </h3>
                      <p className="font-body text-[#1A3626]/70 text-base md:text-lg leading-relaxed max-w-xl">
                        {c.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
