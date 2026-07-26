import { motion, useScroll, useTransform, useSpring } from "framer-motion";

// A realistic engraved bee that flies across the page as you scroll (down & up).
export default function BeeFollower() {
  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 60, damping: 20, mass: 0.6 });

  const x = useTransform(
    smooth,
    [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1],
    ["8vw", "72vw", "22vw", "78vw", "14vw", "80vw", "34vw", "62vw"]
  );
  const y = useTransform(
    smooth,
    [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1],
    ["14vh", "62vh", "30vh", "70vh", "24vh", "58vh", "40vh", "50vh"]
  );
  const rotate = useTransform(
    smooth,
    [0, 0.14, 0.28, 0.42, 0.56, 0.7, 0.84, 1],
    [20, -25, 35, -20, 30, -30, 15, -10]
  );

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="fixed top-0 left-0 z-30 pointer-events-none"
      style={{ x, y, rotate }}
      data-testid="scroll-bee"
    >
      <motion.img
        src="/bee.png"
        alt=""
        className="w-14 md:w-20 h-auto select-none"
        animate={{ y: [0, -4, 0], scaleX: [1, 0.94, 1] }}
        transition={{ duration: 0.28, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.div>
  );
}
