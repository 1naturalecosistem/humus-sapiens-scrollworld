import { useCallback, useEffect, useRef, useState } from "react";
import { HUMUS_SCROLL_WORLD } from "./humus-config";

const CFG = HUMUS_SCROLL_WORLD.flight;

// Pick the resolution ladder step once, from viewport shape, pixel density and
// the connection. Only the chosen file is ever fetched.
//
// Chosen once at mount and not revisited: swapping the source on rotation would
// throw away the download and jump the flight mid-scroll, which is worse than a
// rotated phone getting the crop it did not start in.
function pickVariant() {
  const aspect = window.innerWidth / Math.max(1, window.innerHeight);
  const portrait = aspect < CFG.portraitMaxAspect;

  const conn =
    navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const slow = !!(conn && (conn.saveData || /(^|-)[23]g$/.test(conn.effectiveType || "")));
  if (slow) {
    // smallest file wins over the better crop when bytes are scarce
    return { src: CFG.variants.mobile, poster: CFG.poster };
  }

  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse || window.innerWidth <= 860) {
    return portrait
      ? { src: CFG.variants.mobilePortrait, poster: CFG.posterPortrait }
      : { src: CFG.variants.mobile, poster: CFG.poster };
  }

  const devicePx = window.innerWidth * Math.min(window.devicePixelRatio || 1, 2);
  return {
    src: devicePx >= CFG.hidpiMinWidth ? CFG.variants.hidpi : CFG.variants.desktop,
    poster: CFG.poster,
  };
}

// How much of the file is downloaded, and how far into it we can safely seek.
function bufferedEnd(video) {
  const b = video.buffered;
  if (!b || !b.length) return 0;
  // the range that contains (or starts at) the beginning — the browser fetches
  // linearly from a faststart mp4, so this is the usable head of the flight
  for (let i = 0; i < b.length; i++) {
    if (b.start(i) <= 0.25) return b.end(i);
  }
  return b.end(b.length - 1);
}

/**
 * Owns the flight video: chooses a variant, primes it so it is seekable even on
 * iOS, reports load progress, and scrubs it.
 *
 * The scrub is deliberately NOT a direct `currentTime = f(scroll)`:
 *  - it eases toward the scroll target with a time constant, which is what makes
 *    the flight read as an unhurried camera move rather than something bolted to
 *    the scroll wheel;
 *  - it is clamped to the buffered range, so scrolling ahead of the download
 *    holds on the last available frame and then catches up, instead of freezing
 *    on a stale frame mid-flight;
 *  - it never issues a seek while one is in flight, because piling seeks onto a
 *    seeking element makes the browser drop most of them and the picture lurches.
 */
export function useFlightVideo() {
  const videoRef = useRef(null);
  const [{ src, poster }] = useState(pickVariant);
  const [ready, setReady] = useState(false);
  const [loadRatio, setLoadRatio] = useState(0);
  const [failed, setFailed] = useState(false);

  // the eased position the flight is actually painted at
  const shownRef = useRef(0);
  const lastTickRef = useRef(0);

  // ---- priming ------------------------------------------------------------
  // A paused <video> is not guaranteed to have fetched anything: iOS ignores
  // `preload` entirely and will not decode until playback has been started at
  // least once. Muted inline playback is allowed without a gesture, so start it
  // and immediately pause — that leaves a primed, seekable element. If the
  // browser refuses anyway, retry from the first real user gesture.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let done = false;
    const prime = () => {
      if (done || !videoRef.current) return;
      const v = videoRef.current;
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.then(() => {
          v.pause();
          v.currentTime = 0;
          done = true;
        }).catch(() => {
          /* blocked — the gesture listeners below will retry */
        });
      } else {
        v.pause();
        done = true;
      }
    };

    prime();
    const gestures = ["pointerdown", "touchstart", "wheel", "keydown"];
    gestures.forEach((e) =>
      window.addEventListener(e, prime, { passive: true, once: false })
    );
    return () => gestures.forEach((e) => window.removeEventListener(e, prime));
  }, []);

  // ---- readiness + load progress -----------------------------------------
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const update = () => {
      const dur = video.duration || CFG.duration;
      const end = bufferedEnd(video);
      const ratio = dur > 0 ? Math.min(1, end / dur) : 0;
      setLoadRatio(ratio);
      if (video.readyState >= 2 && ratio >= CFG.minBufferRatio) setReady(true);
    };

    // Only give up on the flight when the media is genuinely unusable. A bare
    // `error` listener is too blunt: browsers also raise decode errors that the
    // element recovers from (software decoders drop the pipeline and rebuild it),
    // and treating those as fatal swaps a working flight for the static poster.
    // So: MEDIA_ERR_SRC_NOT_SUPPORTED is fatal, and anything else only counts if
    // the element never reached the point of having frames to show.
    const onError = () => {
      const err = video.error;
      if (err && err.code === 4) {
        setFailed(true);
        return;
      }
      if (video.readyState < 1 && !video.duration) setFailed(true);
    };
    const events = ["progress", "loadeddata", "canplay", "durationchange", "seeked"];
    events.forEach((e) => video.addEventListener(e, update));
    video.addEventListener("error", onError);

    // Nothing at all after a generous wait means it is never coming.
    const giveUp = setTimeout(() => {
      if (videoRef.current && videoRef.current.readyState < 1) setFailed(true);
    }, 15000);

    // `progress` can go quiet on a fully cached file, so poll gently too
    const poll = setInterval(update, 500);
    update();

    return () => {
      events.forEach((e) => video.removeEventListener(e, update));
      video.removeEventListener("error", onError);
      clearInterval(poll);
      clearTimeout(giveUp);
    };
  }, []);

  // Stop polling / listening once everything is in.
  useEffect(() => {
    if (loadRatio >= 0.999) setReady(true);
  }, [loadRatio]);

  /**
   * Advance the flight toward `targetTime` (seconds). Call once per animation
   * frame with the scroll-derived target; `now` is a rAF timestamp in ms.
   */
  const follow = useCallback((targetTime, now) => {
    const video = videoRef.current;
    if (!video || !ready) return;

    const prev = lastTickRef.current || now;
    lastTickRef.current = now;
    // clamp dt so a backgrounded tab does not jump the camera on return
    const dt = Math.min(0.1, Math.max(0, (now - prev) / 1000));

    const alpha = CFG.followTau > 0 ? 1 - Math.exp(-dt / CFG.followTau) : 1;
    shownRef.current += (targetTime - shownRef.current) * alpha;

    const limit = Math.max(0, bufferedEnd(video) - 0.05);
    const want = Math.min(shownRef.current, limit);

    if (video.seeking) return;
    if (Math.abs(video.currentTime - want) < CFG.minSeekStep) return;
    try {
      video.currentTime = want;
    } catch {
      /* seeking before metadata is in — the next frame will retry */
    }
  }, [ready]);

  /** Jump straight to a time, no easing (resize, first paint, tab restore). */
  const snap = useCallback((targetTime) => {
    const video = videoRef.current;
    shownRef.current = targetTime;
    if (!video || !ready) return;
    const limit = Math.max(0, bufferedEnd(video) - 0.05);
    try {
      video.currentTime = Math.min(targetTime, limit);
    } catch {
      /* not seekable yet */
    }
  }, [ready]);

  return { videoRef, src, poster, ready, loadRatio, failed, follow, snap };
}
