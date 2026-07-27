import { useEffect, useState } from "react";
import { useLang } from "../lib/i18n";
import { CONTENT } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";

const WIDGET_ORIGIN = "https://widget.holiduhost.com";
const WIDGET_SRC = `${WIDGET_ORIGIN}/widget/be6529bd-1f7a-4029-86d1-6a1e882b7e15`;

// The widget lays out to whatever height its content needs — ~2700px on desktop
// with the search form plus the property list — and reports that to the parent.
// Until the first report lands we show a box tall enough for the search form and
// the first results rather than clipping it to a few hundred pixels.
const INITIAL_HEIGHT = 1500;
const MIN_HEIGHT = 620;

export default function Prenota() {
  const { lang } = useLang();
  const t = CONTENT[lang].prenota;

  // Height has to live in React state, not be poked onto the DOM node. The old
  // version assigned `frame.current.style.height` from the message handler while
  // the element also carried `height: 500` in its style prop, so every re-render
  // (a language toggle is enough) snapped the widget back to 500px and cut it off.
  const [height, setHeight] = useState(INITIAL_HEIGHT);

  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== WIDGET_ORIGIN) return;
      const data = event.data;
      if (!data || data.type !== "resize") return;
      const h = Number(data.height);
      if (Number.isFinite(h) && h > MIN_HEIGHT) setHeight(Math.ceil(h));
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <section id="prenota" data-testid="prenota-section" className="relative bg-[#F5F3E9] py-28 md:py-40">
      <div className="mx-auto max-w-[1500px] px-6 md:px-10">
        <div className="mb-14 md:mb-20">
          <span className="block font-mono-label text-xs tracking-label text-[#D48924] mb-8 md:mb-12">{t.label}</span>
          <h2 className="font-display font-light text-[#1A3626] text-[min(9vw,7.5rem)] leading-[0.9]">
            <RevealWords text={t.heading} />
            <span className="italic block text-[#2f4c3a]"><RevealWords text={t.headingEm} /></span>
          </h2>
          <Reveal className="mt-8 md:mt-10" y={20}>
            <p className="font-body text-lg md:text-xl text-[#1A3626]/70 max-w-xl leading-relaxed">{t.lead}</p>
          </Reveal>
        </div>

        <Reveal y={24}>
          <div className="border border-[#1A3626]/15 bg-white/40 p-2 md:p-4">
            <iframe
              title={t.iframeTitle}
              src={WIDGET_SRC}
              data-testid="booking-widget"
              className="w-full block border-0"
              style={{ height, minHeight: MIN_HEIGHT }}
              /* scrolling stays on so the widget is still usable if the resize
                 message never lands (blocked postMessage, older browser) */
              scrolling="auto"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <p className="mt-5 font-mono-label text-[10px] tracking-label text-[#1A3626]/50">{t.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
