import { useCallback, useEffect, useRef, useState } from "react";
import { HUMUS_SCROLL_WORLD, frameSrc } from "./humus-config";

// Picks the frame resolution set + preload stride based on viewport and
// network conditions (Data Saver / 2g-3g => smaller frames, sparser preload).
function pickQuality() {
  const f = HUMUS_SCROLL_WORLD.frames;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth <= 860;
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const slow = !!(conn && (conn.saveData || /2g|3g/.test(conn.effectiveType || "")));
  return {
    set: slow || coarse || narrow ? f.sets.mobile : f.sets.desktop,
    stride: slow ? f.slowStride : f.preloadStride,
    concurrency: slow ? 3 : f.concurrency,
  };
}

// Loads the drone-flight frame sequence progressively:
// pass 1 loads every Nth frame (fast, gives a scrubbable-but-coarse sequence),
// pass 2 backfills the rest nearest-to-the-viewer first.
//
// The backfill deliberately does NOT wait for idle time: it is exactly while
// the visitor is scrolling that the missing frames are needed, and that is
// precisely when the main thread is never idle. Gating it on idle callbacks
// starves the very frames being scrubbed through, which reads as the canvas
// freezing on one image and then jumping several frames at once.
export function useFrameSequence() {
  const f = HUMUS_SCROLL_WORLD.frames;
  const total = f.count;
  const imagesRef = useRef(new Array(total).fill(null));
  const priorityRef = useRef(0);
  const [firstPassReady, setFirstPassReady] = useState(false);
  const [loadRatio, setLoadRatio] = useState(0);

  // The canvas tells the loader which frame the viewer is on, so the backfill
  // always works outwards from where the flight actually is.
  const setPriority = useCallback((idx) => {
    priorityRef.current = idx;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cfg = HUMUS_SCROLL_WORLD.frames;
    const { set, stride, concurrency } = pickQuality();
    const loaded = new Array(total).fill(false);
    let loadedCount = 0;

    const markLoaded = (idx) => {
      if (loaded[idx]) return;
      loaded[idx] = true;
      loadedCount++;
      if (!cancelled) setLoadRatio(loadedCount / total);
    };

    const loadOne = (idx) =>
      new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          if (!cancelled) imagesRef.current[idx] = img;
          markLoaded(idx);
          resolve();
        };
        img.onerror = () => {
          markLoaded(idx);
          resolve();
        };
        img.src = frameSrc(set, idx + cfg.firstIndex, cfg);
      });

    async function run() {
      const firstPassIdx = [];
      for (let i = 0; i < total; i += stride) firstPassIdx.push(i);
      if (firstPassIdx[firstPassIdx.length - 1] !== total - 1) firstPassIdx.push(total - 1);

      await Promise.all(firstPassIdx.map(loadOne));
      if (cancelled) return;
      setFirstPassReady(true);

      const pending = new Set();
      for (let i = 0; i < total; i++) if (!loaded[i]) pending.add(i);

      // nearest pending frame to where the viewer currently is
      const takeNearest = () => {
        const from = Math.min(total - 1, Math.max(0, priorityRef.current));
        for (let r = 0; r < total; r++) {
          if (pending.has(from + r)) {
            pending.delete(from + r);
            return from + r;
          }
          if (pending.has(from - r)) {
            pending.delete(from - r);
            return from - r;
          }
        }
        return -1;
      };

      const worker = async () => {
        while (!cancelled) {
          const idx = takeNearest();
          if (idx < 0) return;
          await loadOne(idx);
        }
      };

      await Promise.all(Array.from({ length: concurrency }, worker));
    }

    run();
    return () => {
      cancelled = true;
    };
    // HUMUS_SCROLL_WORLD.frames is a static module-level config object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  return { imagesRef, total, firstPassReady, loadRatio, setPriority };
}
