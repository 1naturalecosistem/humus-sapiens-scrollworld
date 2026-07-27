import { useEffect, useRef } from "react";
import { useLang } from "../lib/i18n";
import { CONTENT } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";

const WIDGET_SRC = "https://widget.holiduhost.com/widget/be6529bd-1f7a-4029-86d1-6a1e882b7e15";

export default function Prenota() {
  const { lang } = useLang();
  const t = CONTENT[lang].prenota;
  const frame = useRef(null);

  // The widget posts its content height as it changes (date picker opening,
  // results loading); without this the iframe would clip or leave dead space.
  useEffect(() => {
    function onMessage(event) {
      if (event.data?.type === "resize" && frame.current) {
        frame.current.style.height = `${event.data.height}px`;
      }
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
              ref={frame}
              title={t.iframeTitle}
              src={WIDGET_SRC}
              data-testid="booking-widget"
              className="w-full block"
              style={{ aspectRatio: "1280 / 1000", minHeight: 500, height: 500, border: "none" }}
              loading="lazy"
            />
          </div>
          <p className="mt-5 font-mono-label text-[10px] tracking-label text-[#1A3626]/50">{t.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
