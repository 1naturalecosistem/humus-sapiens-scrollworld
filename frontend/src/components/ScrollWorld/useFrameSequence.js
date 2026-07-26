import { useEffect, useRef, useState } from "react";
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
  };
}

// Loads the drone-flight frame sequence progressively:
// pass 1 loads every Nth frame (fast, gives a scrubbable-but-coarse sequence),
// pass 2 backfills the rest in idle time. Returns live refs the canvas reads
// on every scroll tick, plus a 0-1 loading ratio for the preloader UI.
export function useFrameSequence() {
  const f = HUMUS_SCROLL_WORLD.frames;
  const total = f.count;
  const imagesRef = useRef(new Array(total).fill(null));
  const [firstPassReady, setFirstPassReady] = useState(false);
  const [loadRatio, setLoadRatio] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const f = HUMUS_SCROLL_WORLD.frames;
    const { set, stride } = pickQuality();
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
        img.src = frameSrc(set, idx + f.firstIndex, f);
      });

    async function run() {
      const firstPassIdx = [];
      for (let i = 0; i < total; i += stride) firstPassIdx.push(i);
      if (firstPassIdx[firstPassIdx.length - 1] !== total - 1) firstPassIdx.push(total - 1);

      await Promise.all(firstPassIdx.map(loadOne));
      if (cancelled) return;
      setFirstPassReady(true);

      const remaining = [];
      for (let i = 0; i < total; i++) if (!loaded[i]) remaining.push(i);

      const idle = window.requestIdleCallback || ((cb) => setTimeout(cb, 60));
      let cursor = 0;
      const step = () => {
        if (cancelled) return;
        const batchEnd = Math.min(cursor + 6, remaining.length);
        const batch = [];
        for (; cursor < batchEnd; cursor++) batch.push(loadOne(remaining[cursor]));
        Promise.all(batch).then(() => {
          if (!cancelled && cursor < remaining.length) idle(step);
        });
      };
      if (remaining.length) idle(step);
    }

    run();
    return () => {
      cancelled = true;
    };
    // HUMUS_SCROLL_WORLD.frames is a static module-level config object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  return { imagesRef, total, firstPassReady, loadRatio };
}
