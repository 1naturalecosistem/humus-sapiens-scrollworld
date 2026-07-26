import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLang } from "../lib/i18n";
import { CONTENT, IMAGES } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";

export default function BeeHumus() {
  const { lang } = useLang();
  const t = CONTENT[lang].beeHumus;
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y1 = useTransform(scrollYProgress, [0, 1], ["-6%", "14%"]);
  const y2 = useTransform(scrollYProgress, [0, 1], ["10%", "-8%"]);

  return (
    <section id="bee-humus" data-testid="beehumus-section" className="relative bg-[#2B231D] text-[#F5F3E9] overflow-hidden py-28 md:py-40">
      {/* honey glow */}
      <div className="absolute -top-40 -right-40 w-[50vw] h-[50vw] rounded-full pointer-events-none" style={{
        background: "radial-gradient(circle, rgba(212,137,36,0.28) 0%, transparent 60%)",
      }} />

      <div className="mx-auto max-w-[1500px] px-6 md:px-10 relative">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16 md:mb-24">
          <span className="md:col-span-3 font-mono-label text-xs tracking-label text-[#D48924] pt-3">{t.label}</span>
          <h2 className="md:col-span-9 font-display font-light text-5xl sm:text-6xl lg:text-7xl leading-[0.92]">
            <span className="text-[#F5F3E9]"><RevealWords text={t.heading} /></span>
            <span className="italic block text-[#D48924]"><RevealWords text={t.headingEm} /></span>
          </h2>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-stretch">
          {/* image tall */}
          <div className="md:col-span-4 relative overflow-hidden aspect-[3/4] md:aspect-auto md:min-h-[560px]">
            <motion.img style={{ y: y1 }} src={IMAGES.honeyJar} alt="Miele" className="absolute inset-x-0 -top-[17%] w-full h-[137%] object-cover" loading="lazy" />
            <div className="absolute bottom-4 left-4 font-mono-label text-[10px] tracking-label text-[#2B231D] bg-[#D48924] px-3 py-1.5">[ IMG · MIELE ]</div>
          </div>

          {/* text lead */}
          <div className="md:col-span-4 flex flex-col justify-between py-2">
            <Reveal y={24}>
              <p className="font-body text-lg md:text-xl text-[#F5F3E9]/80 leading-relaxed">{t.lead}</p>
            </Reveal>
            <Reveal delay={0.1} y={24} className="mt-10">
              <p className="font-display italic text-2xl md:text-3xl text-[#D48924] leading-snug">“{t.quote}”</p>
            </Reveal>
          </div>

          {/* image */}
          <div className="md:col-span-4 relative overflow-hidden aspect-[3/4] md:aspect-auto md:min-h-[560px]">
            <motion.img style={{ y: y2 }} src={IMAGES.beekeepers} alt="Apicoltori" className="absolute inset-x-0 -top-[17%] w-full h-[137%] object-cover" loading="lazy" />
            <div className="absolute bottom-4 left-4 font-mono-label text-[10px] tracking-label text-[#2B231D] bg-[#D48924] px-3 py-1.5">[ IMG · APIARIO ]</div>
          </div>
        </div>

        {/* three points */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[#F5F3E9]/15 border border-[#F5F3E9]/15 mt-8">
          {t.points.map((p, i) => (
            <Reveal key={i} delay={i * 0.08} className="bg-[#2B231D] p-8 md:p-10">
              <span className="font-mono-label text-sm text-[#D48924]">0{i + 1}</span>
              <h3 className="font-display text-2xl md:text-3xl text-[#F5F3E9] mt-4 mb-3">{p.t}</h3>
              <p className="font-body text-[#F5F3E9]/65 leading-relaxed">{p.d}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
