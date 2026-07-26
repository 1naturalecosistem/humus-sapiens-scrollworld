import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { ArrowDown } from "lucide-react";
import { useLang } from "../lib/i18n";
import { CONTENT } from "../lib/content";
import { MaskLines } from "./Reveal";
import SeedCanvas from "./SeedCanvas";
import { scrollToId } from "./SmoothScroll";

export default function Hero() {
  const { lang } = useLang();
  const t = CONTENT[lang].hero;
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yText = useTransform(scrollYProgress, [0, 1], [0, -120]);
  const yCanvas = useTransform(scrollYProgress, [0, 1], [0, 160]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      id="hero"
      ref={ref}
      data-testid="hero-section"
      className="relative min-h-[100svh] w-full overflow-hidden flex flex-col justify-center"
    >
      {/* 3D immersive layer */}
      <motion.div style={{ y: yCanvas }} className="absolute inset-0 z-0">
        <SeedCanvas />
      </motion.div>

      {/* Logo sprout — the germoglio, floating with subtle 3D motion */}
      <motion.div
        style={{ y: yCanvas }}
        className="absolute right-[6vw] md:right-[9vw] top-[9vh] md:top-[7vh] z-[5] pointer-events-none"
        aria-hidden="true"
      >
        {/* soft honey glow behind */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[42vh] h-[42vh] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,137,36,0.20) 0%, transparent 62%)" }}
        />
        <div style={{ perspective: 1000 }}>
          <motion.img
            src="/sprout.png"
            alt=""
            data-testid="hero-sprout"
            className="relative h-[52vh] md:h-[68vh] w-auto"
            initial={{ opacity: 0, y: 40, rotateZ: -4 }}
            animate={{
              opacity: 1,
              y: [0, -14, 0],
              rotateZ: [-1.5, 1.5, -1.5],
              rotateY: [-6, 6, -6],
            }}
            transition={{
              opacity: { duration: 1.4, delay: 0.6, ease: [0.22, 1, 0.36, 1] },
              y: { duration: 7, repeat: Infinity, ease: "easeInOut" },
              rotateZ: { duration: 9, repeat: Infinity, ease: "easeInOut" },
              rotateY: { duration: 11, repeat: Infinity, ease: "easeInOut" },
            }}
            style={{ transformStyle: "preserve-3d" }}
          />
        </div>
      </motion.div>

      {/* soft radial vignette */}
      <div className="absolute inset-0 z-[1] pointer-events-none" style={{
        background: "radial-gradient(circle at 50% 40%, transparent 40%, rgba(245,243,233,0.6) 100%)",
      }} />

      <motion.div
        style={{ y: yText, opacity }}
        className="relative z-10 mx-auto max-w-[1500px] w-full px-6 md:px-10"
      >
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.9 }}
          className="font-mono-label text-xs md:text-sm tracking-label text-[#1A3626]/70 mb-6 md:mb-10"
          data-testid="hero-kicker"
        >
          {t.kicker}
        </motion.p>

        <h1 className="font-display font-light leading-[0.86] text-[#1A3626] text-[19vw] sm:text-[16vw] lg:text-[13vw]">
          <MaskLines lines={[t.line1]} delay={0.3} />
          <MaskLines lines={[t.line2]} delay={0.45} lineClassName="italic pl-[0.06em] text-[#2f4c3a]" />
        </h1>

        <div className="mt-8 md:mt-12 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-10 items-end">
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className="md:col-span-5 md:col-start-1 font-display italic text-2xl md:text-3xl text-[#1A3626] leading-snug"
            data-testid="hero-tagline"
          >
            {t.tagline}
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.25, ease: [0.22, 1, 0.36, 1] }}
            className="md:col-span-4 md:col-start-9 font-body text-base text-[#1A3626]/75 leading-relaxed"
          >
            {t.intro}
          </motion.p>
        </div>
      </motion.div>

      {/* scroll cue */}
      <motion.button
        data-testid="hero-scroll-cue"
        onClick={() => scrollToId("chi-siamo")}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-[#1A3626]/70 hover:text-[#1A3626] transition-colors"
      >
        <span className="font-mono-label text-[10px] tracking-label">{t.scroll}</span>
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown size={18} />
        </motion.span>
      </motion.button>
    </section>
  );
}
