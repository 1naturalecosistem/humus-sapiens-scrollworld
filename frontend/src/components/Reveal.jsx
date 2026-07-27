import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1];

// Fade + rise reveal that re-triggers on scroll up/down for a harmonic feel.
export function Reveal({ children, delay = 0, y = 28, className = "", once = false, amount = 0.3, as = "div" }) {
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{ duration: 0.9, ease, delay }}
    >
      {children}
    </MotionTag>
  );
}

// Line-by-line masked text reveal (hero signature moment).
export function MaskLines({ lines, className = "", lineClassName = "", stagger = 0.12, delay = 0.1, label }) {
  return (
    <span className={className} aria-label={label ?? lines.join(" ")}>
      {lines.map((line, i) => (
        <span key={i} className="line-mask">
          <motion.span
            className={`block ${lineClassName}`}
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1.1, ease, delay: delay + i * stagger }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

// Word-level reveal for section headings on scroll.
// The viewport observer must sit on the (unclipped) container: the shifted
// words are fully clipped by their mask, so observing them directly would
// never intersect and the heading would stay hidden.
export function RevealWords({ text, className = "", once = false }) {
  const words = text.split(" ");
  return (
    <motion.span
      className={className}
      aria-label={text}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount: 0.3 }}
    >
      {words.map((w, i) => (
        <span key={i} className="line-mask" style={{ display: "inline-block", verticalAlign: "top" }}>
          <motion.span
            className="inline-block"
            variants={{ hidden: { y: "110%" }, visible: { y: 0 } }}
            transition={{ duration: 0.85, ease, delay: i * 0.05 }}
          >
            {w}&nbsp;
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}
