import { useEffect, useState } from "react";
import { useLang } from "../lib/i18n";
import { CONTACT, CONTENT } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";

const WIDGET_ORIGIN = "https://widget.holiduhost.com";
const WIDGET_SRC = `${WIDGET_ORIGIN}/widget/be6529bd-1f7a-4029-86d1-6a1e882b7e15`;
const DIRECT_BOOKING_URL = `https://www.holidu.com/it/hosting/${encodeURIComponent("humus-sapiens")}`;

// The widget lays out to whatever height its content needs — ~2700px on desktop
// with the search form plus the property list — and reports that to the parent.
// Until the first report lands we show a box tall enough for the search form and
// the first results rather than clipping it to a few hundred pixels.
const INITIAL_HEIGHT = 1500;
const MIN_HEIGHT = 620;
const WIDGET_READY_TIMEOUT_MS = 4000;

export default function Prenota() {
  const { lang } = useLang();
  const t = CONTENT[lang].prenota;

  const [height, setHeight] = useState(INITIAL_HEIGHT);
  const [widgetFailed, setWidgetFailed] = useState(false);

  useEffect(() => {
    let timeoutId;
    let frame;

    function onMessage(event) {
      if (event.origin !== WIDGET_ORIGIN) return;
      const data = event.data;
      if (!data || data.type !== "resize") return;
      const h = Number(data.height);
      if (Number.isFinite(h) && h > MIN_HEIGHT) {
        setHeight(Math.ceil(h));
        setWidgetFailed(false);
      }
    }

    function onLoad() {
      setWidgetFailed(false);
      clearTimeout(timeoutId);
    }

    function onLoadError() {
      setWidgetFailed(true);
      clearTimeout(timeoutId);
    }

    window.addEventListener("message", onMessage);
    window.addEventListener("error", onLoadError, true);

    frame = document.querySelector('[data-testid="booking-widget"]');
    if (frame) {
      frame.addEventListener("load", onLoad);
      frame.addEventListener("error", onLoadError);
    }

    timeoutId = window.setTimeout(() => {
      if (frame && frame.contentDocument?.readyState === "complete") {
        setWidgetFailed(false);
      } else {
        setWidgetFailed(true);
      }
    }, WIDGET_READY_TIMEOUT_MS);

    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("error", onLoadError, true);
      clearTimeout(timeoutId);
      if (frame) {
        frame.removeEventListener("load", onLoad);
        frame.removeEventListener("error", onLoadError);
      }
    };
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
            {widgetFailed ? (
              <div className="rounded-lg border border-[#1A3626]/15 bg-[#F5F3E9] p-6 text-left">
                <p className="font-body text-base text-[#1A3626]">{t.fallbackTitle}</p>
                <p className="mt-3 font-body text-sm text-[#1A3626]/70">{t.fallbackBody}</p>
                <a
                  href={DIRECT_BOOKING_URL}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="booking-fallback-link"
                  className="mt-5 inline-flex items-center rounded-full bg-[#1A3626] px-5 py-3 text-sm font-medium text-[#F5F3E9] transition hover:bg-[#2f4c3a]"
                >
                  {t.fallbackCta}
                </a>
                <p className="mt-4 font-mono-label text-[10px] tracking-label text-[#1A3626]/50">
                  {CONTACT.email} · {CONTACT.phone}
                </p>
              </div>
            ) : (
              <iframe
                title={t.iframeTitle}
                src={WIDGET_SRC}
                data-testid="booking-widget"
                className="w-full block border-0"
                style={{ height, minHeight: MIN_HEIGHT }}
                scrolling="auto"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                onError={() => setWidgetFailed(true)}
              />
            )}
          </div>
          <p className="mt-5 font-mono-label text-[10px] tracking-label text-[#1A3626]/50">{t.note}</p>
        </Reveal>
      </div>
    </section>
  );
}
