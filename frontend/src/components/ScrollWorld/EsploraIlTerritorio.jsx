import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useLang } from "../../lib/i18n";
import { scrollToId } from "../SmoothScroll";
import { HUMUS_SCROLL_WORLD, altitudeAt, frameSrc } from "./humus-config";
import { useFrameSequence } from "./useFrameSequence";
import HotspotCard from "./HotspotCard";
import MiniMap from "./MiniMap";
import "./scroll-world.css";

const CONFIG = HUMUS_SCROLL_WORLD;

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export default function EsploraIlTerritorio() {
  const { lang } = useLang();
  const ui = CONFIG.ui[lang];

  const sectionRef = useRef(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isMobile = useMediaQuery("(max-width: 860px), (pointer: coarse)");

  const { imagesRef, total, firstPassReady, loadRatio } = useFrameSequence();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const progressRef = useRef(0);
  const [progressPct, setProgressPct] = useState(0);
  const [showSection, setShowSection] = useState(false);

  // ---- Canvas draw (imperative, runs every scroll tick — no React re-render) ----
  const drawAt = (progress) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const idx = Math.min(total - 1, Math.max(0, Math.round(progress * (total - 1))));

    let img = imagesRef.current[idx];
    if (!img) {
      // frame not loaded yet: use nearest already-loaded neighbour so the
      // canvas never flashes blank while the background pass catches up.
      for (let r = 1; r < total && !img; r++) {
        img = imagesRef.current[idx - r] || imagesRef.current[idx + r];
      }
    }
    if (!img) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const ir = img.naturalWidth / img.naturalHeight;
    const cr = cw / ch;
    let sw, sh, sx, sy;
    if (ir > cr) {
      sh = img.naturalHeight;
      sw = sh * cr;
      sx = (img.naturalWidth - sw) / 2;
      sy = 0;
    } else {
      sw = img.naturalWidth;
      sh = sw / cr;
      sx = 0;
      sy = (img.naturalHeight - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);
  };

  // canvas sizing (device-pixel-ratio aware) + redraw on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      drawAt(progressRef.current);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // redraw as soon as more frames land (first pass fills in / backfill pass)
  useEffect(() => {
    drawAt(progressRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRatio]);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    progressRef.current = v;
    drawAt(v);
  });

  // throttled React-state mirror of progress, only while the section is
  // actually in view — drives the HUD / hotspots / minimap without forcing
  // a re-render on every sub-pixel scroll tick.
  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => setShowSection(entry.isIntersecting), {
      threshold: 0,
    });
    if (sectionRef.current) io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!showSection || reducedMotion) return;
    let raf;
    let last = -1;
    const tick = () => {
      const pct = progressRef.current * 100;
      if (Math.abs(pct - last) > 0.12) {
        last = pct;
        setProgressPct(pct);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [showSection, reducedMotion]);

  const altitude = useMemo(() => altitudeAt(progressPct), [progressPct]);

  const visibleHotspots = useMemo(
    () =>
      CONFIG.hotspots
        .map((h) => ({ h, dist: Math.abs(progressPct - h.at) }))
        .filter(({ h, dist }) => dist <= h.dwell)
        .sort((a, b) => a.dist - b.dist),
    [progressPct]
  );

  const activeMobile = visibleHotspots[0]?.h ?? null;

  const posterSrc = frameSrc(CONFIG.frames.sets.desktop, CONFIG.frames.firstIndex, CONFIG.frames);

  // ---------------------------------------------------------------------
  // Reduced-motion fallback: no canvas scrubbing, no pin — a normal static
  // section with the poster frame and every hotspot as a plain content card.
  // ---------------------------------------------------------------------
  if (reducedMotion) {
    return (
      <section id="esplora-il-territorio" className="sw-static" data-testid="scrollworld-static">
        <img src={posterSrc} alt="" className="sw-static-poster" loading="lazy" />
        <div className="sw-static-overlay" />
        <div className="sw-static-content">
          <span className="sw-eyebrow">{ui.eyebrow}</span>
          <h2 className="sw-static-title">{ui.title}</h2>
          <div className="sw-static-grid">
            {CONFIG.hotspots.map((h) => {
              const copy = h[lang];
              return (
                <div key={h.id} className="sw-card sw-card--static">
                  <span className="sw-card-eyebrow">{copy.eyebrow}</span>
                  <h3 className="sw-card-title">{copy.title}</h3>
                  <p className="sw-card-body">{copy.body}</p>
                  <button
                    type="button"
                    className="sw-btn sw-btn--primary"
                    onClick={() => scrollToId(h.target)}
                  >
                    {copy.cta}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="esplora-il-territorio"
      ref={sectionRef}
      data-testid="scrollworld-section"
      className="sw-section"
      style={{ height: `${CONFIG.scrollLengthVh}vh` }}
    >
      <div ref={wrapRef} className="sw-sticky">
        <canvas ref={canvasRef} className="sw-canvas" aria-hidden="true" />
        <div className="sw-vignette" aria-hidden="true" />

        {/* Preloader */}
        <AnimatePresence>
          {!firstPassReady && (
            <motion.div
              className="sw-preloader"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="sw-preloader-sprout">
                <span className="sw-preloader-petal" />
                <span className="sw-preloader-petal" />
                <span className="sw-preloader-petal" />
              </div>
              <div className="sw-preloader-track">
                <div
                  className="sw-preloader-fill"
                  style={{ width: `${Math.round(loadRatio * 100)}%` }}
                />
              </div>
              <span className="sw-preloader-label">
                {ui.loading}&nbsp;· {Math.round(loadRatio * 100)}%
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Intro title, fades out as the flight begins */}
        <div className="sw-intro" style={{ opacity: Math.max(0, 1 - progressPct / 6) }}>
          <span className="sw-eyebrow">{ui.eyebrow}</span>
          <h2 className="sw-intro-title">{ui.title}</h2>
          <span className="sw-hint">{ui.hint}</span>
        </div>

        {/* Skip button */}
        <button type="button" className="sw-skip" onClick={() => scrollToId(CONFIG.skipTargetId)}>
          {ui.skip}
        </button>

        {/* HUD: altitude / progress rail */}
        <div className="sw-hud">
          <div className="sw-hud-rail">
            <div className="sw-hud-rail-fill" style={{ height: `${progressPct}%` }} />
            <div className="sw-hud-rail-marker" style={{ top: `${progressPct}%` }} />
          </div>
          <div className="sw-hud-readout">
            <span className="sw-hud-label">{ui.altitude}</span>
            <span className="sw-hud-value">{altitude} m</span>
          </div>
        </div>

        {/* Minimap */}
        <div className="sw-minimap-wrap">
          <MiniMap progressPct={progressPct} label={ui.map} />
        </div>

        {/* Desktop hotspot cards */}
        {!isMobile && (
          <AnimatePresence>
            {visibleHotspots.map(({ h }) => (
              <HotspotCard
                key={h.id}
                hotspot={h}
                copy={h[lang]}
                uiCopy={ui}
                style={{ left: h.pos.x, top: h.pos.y }}
              />
            ))}
          </AnimatePresence>
        )}

        {/* Mobile bottom sheet: one hotspot at a time, never covers the canvas centre */}
        {isMobile && (
          <div className="sw-sheet-dock">
            <AnimatePresence mode="wait">
              {activeMobile && (
                <HotspotCard
                  key={activeMobile.id}
                  hotspot={activeMobile}
                  copy={activeMobile[lang]}
                  uiCopy={ui}
                  mobile
                />
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  );
}
