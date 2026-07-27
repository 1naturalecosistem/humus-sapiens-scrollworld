import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll } from "framer-motion";
import { useLang } from "../../lib/i18n";
import { scrollToId } from "../SmoothScroll";
import { HUMUS_SCROLL_WORLD, altitudeAt, flightTimeAt } from "./humus-config";
import { useFlightVideo } from "./useFlightVideo";
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

  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isMobile = useMediaQuery("(max-width: 860px), (pointer: coarse)");

  const { videoRef, src, poster, ready, loadRatio, failed, follow, snap } = useFlightVideo();

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const progressRef = useRef(0);
  const [progressPct, setProgressPct] = useState(0);
  const [inView, setInView] = useState(false);

  // ---- scrub loop ---------------------------------------------------------
  // One rAF loop drives the flight while the section is on screen. framer-motion
  // emits many progress events per displayed frame (Lenis interpolates), so the
  // loop reads the latest value rather than reacting to each event.
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (v) => {
      progressRef.current = v;
    });
    return unsubscribe;
  }, [scrollYProgress]);

  useEffect(() => {
    if (!inView || reducedMotion) return;
    let raf = 0;
    const tick = (now) => {
      follow(flightTimeAt(progressRef.current), now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reducedMotion, follow]);

  // Land on the right frame when the section first becomes seekable, and when
  // the visitor scrolls back into it after being away.
  useEffect(() => {
    if (ready) snap(flightTimeAt(progressRef.current));
  }, [ready, snap]);

  useEffect(() => {
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    });
    if (sectionRef.current) io.observe(sectionRef.current);
    return () => io.disconnect();
  }, []);

  // Throttled React-state mirror of progress, only while the section is in view:
  // drives the HUD / hotspots / minimap without a re-render per scroll tick.
  useEffect(() => {
    if (!inView || reducedMotion) return;
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
  }, [inView, reducedMotion]);

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

  // ---------------------------------------------------------------------
  // Static fallback: reduced-motion, or the video failed to load at all.
  // A normal section with the poster frame and every hotspot as a plain card.
  // ---------------------------------------------------------------------
  if (reducedMotion || failed) {
    return (
      <section id="esplora-il-territorio" className="sw-static" data-testid="scrollworld-static">
        <img
          src={CONFIG.flight.posterStatic}
          alt=""
          className="sw-static-poster"
          loading="lazy"
        />
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
      <div className="sw-sticky">
        {/* The flight itself. Painted straight to the element rather than blitted
            through a canvas: the browser scales it on the compositor, so it stays
            at full resolution and costs nothing per frame. */}
        <video
          ref={videoRef}
          className="sw-video"
          data-testid="scrollworld-video"
          src={src}
          poster={poster}
          preload="auto"
          muted
          playsInline
          disablePictureInPicture
          aria-hidden="true"
          tabIndex={-1}
        />
        <div className="sw-vignette" aria-hidden="true" />

        {/* Preloader */}
        <AnimatePresence>
          {!ready && (
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
