import { useEffect } from "react";
import { X } from "lucide-react";
import { useLang } from "../lib/i18n";
import { CONTENT } from "../lib/content";

export default function PrivacyModal({ onClose }) {
  const { lang } = useLang();
  const t = CONTENT[lang].privacy;

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    if (window.__lenis) window.__lenis.stop();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (window.__lenis) window.__lenis.start();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center p-3 md:p-8 bg-[#1A3626]/40 backdrop-blur-sm"
      onClick={onClose}
      data-testid="privacy-modal"
    >
      <div
        className="relative bg-[#F5F3E9] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl"
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
      >
        <button
          data-testid="privacy-close"
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#1A3626] text-[#F5F3E9] flex items-center justify-center hover:bg-[#D48924] transition-colors"
          aria-label={t.close}
        >
          <X size={18} />
        </button>

        <div className="px-6 md:px-12 py-10 md:py-14">
          <h2 className="font-display text-3xl md:text-5xl text-[#1A3626] leading-[1.02]">{t.title}</h2>
          <p className="font-mono-label text-[10px] tracking-label text-[#1A3626]/50 mt-3 mb-10">{t.updated}</p>

          <div className="flex flex-col">
            {t.sections.map((s, i) => (
              <div key={i} className="py-6 border-t border-[#1A3626]/15">
                <div className="grid grid-cols-12 gap-4">
                  <span className="col-span-2 sm:col-span-1 font-mono-label text-sm text-[#D48924] pt-1">0{i + 1}</span>
                  <div className="col-span-10 sm:col-span-11">
                    <h3 className="font-display text-xl md:text-2xl text-[#1A3626] mb-2">{s.h}</h3>
                    <p className="font-body text-[#1A3626]/70 text-sm md:text-base leading-relaxed">{s.p}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
