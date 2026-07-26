import { motion } from "framer-motion";
import { scrollToId } from "../SmoothScroll";

const ease = [0.22, 1, 0.36, 1];

// Glassmorphism hotspot card — cream/terra frosted panel, used both as a
// free-floating desktop card (positioned via `style`) and as the content of
// the mobile bottom sheet (positioned by its parent instead).
export default function HotspotCard({ hotspot, copy, uiCopy, style, mobile = false }) {
  return (
    <motion.div
      className={mobile ? "sw-card sw-card--sheet" : "sw-card"}
      style={style}
      initial={{ opacity: 0, y: mobile ? 24 : 14, scale: mobile ? 1 : 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: mobile ? 24 : 14, scale: mobile ? 1 : 0.97 }}
      transition={{ duration: 0.55, ease }}
    >
      <span className="sw-card-eyebrow">{copy.eyebrow}</span>
      <h3 className="sw-card-title">{copy.title}</h3>
      <p className="sw-card-body">{copy.body}</p>
      <div className="sw-card-actions">
        <button
          type="button"
          className="sw-btn sw-btn--primary"
          onClick={() => scrollToId(hotspot.target)}
        >
          {copy.cta}
        </button>
        <button
          type="button"
          className="sw-btn sw-btn--ghost"
          onClick={() => scrollToId(hotspot.target)}
        >
          {copy.ctaSecondary}
        </button>
      </div>
    </motion.div>
  );
}
