import Marquee from "react-fast-marquee";
import { useLang } from "../lib/i18n";
import { CONTENT } from "../lib/content";

export default function Ribbon({ bg = "#D3D9C9", color = "#1A3626", speed = 32 }) {
  const { lang } = useLang();
  const words = CONTENT[lang].marquee;
  return (
    <div className="py-6 md:py-8 border-y" style={{ backgroundColor: bg, borderColor: `${color}22` }} data-testid="ribbon-marquee">
      <Marquee speed={speed} gradient={false} autoFill>
        {words.map((w, i) => (
          <span key={i} className="flex items-center">
            <span className="font-display italic text-3xl md:text-5xl px-8 md:px-14" style={{ color }}>
              {w}
            </span>
            <span className="text-2xl md:text-4xl" style={{ color: `${color}66` }}>✦</span>
          </span>
        ))}
      </Marquee>
    </div>
  );
}
