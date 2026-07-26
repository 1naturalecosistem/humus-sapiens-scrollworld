import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowUpRight, X, Clock } from "lucide-react";
import { useLang } from "../lib/i18n";
import { CONTENT, ARTICLES, PILLARS, CONTACT } from "../lib/content";
import { Reveal, RevealWords } from "./Reveal";

function stripFrontmatter(md) {
  let out = md;
  if (out.startsWith("---")) {
    const end = out.indexOf("\n---", 3);
    if (end !== -1) out = out.slice(out.indexOf("\n", end + 1) + 1).trim();
  }
  // drop the leading H1 (title already shown in the modal header)
  out = out.replace(/^#\s+.*\n+/, "");
  return out.trim();
}

function ArticleModal({ article, t, onClose }) {
  const { lang } = useLang();
  const [body, setBody] = useState(null);
  const file = lang === "en" ? article.fileEn : article.file;
  const title = lang === "en" ? article.titleEn : article.title;

  useEffect(() => {
    let active = true;
    setBody(null);
    fetch(file)
      .then((r) => r.text())
      .then((txt) => { if (active) setBody(stripFrontmatter(txt)); })
      .catch(() => { if (active) setBody("Errore nel caricamento."); });
    return () => { active = false; };
  }, [file]);

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
      data-testid="article-modal"
    >
      <div
        className="relative bg-[#F5F3E9] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl"
        data-lenis-prevent
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-56 md:h-72 overflow-hidden">
          <img src={article.cover} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A3626]/70 to-transparent" />
          <button
            data-testid="article-close"
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-[#F5F3E9] text-[#1A3626] flex items-center justify-center hover:bg-[#D48924] hover:text-[#F5F3E9] transition-colors"
            aria-label={t.close}
          >
            <X size={18} />
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <span className="font-mono-label text-[10px] tracking-label text-[#D3D9C9]">{PILLARS[article.pillar][lang]}</span>
          </div>
        </div>

        <div className="px-6 md:px-12 py-8 md:py-12">
          <h2 className="font-display text-3xl md:text-5xl text-[#1A3626] leading-[1.02] mb-4">{title}</h2>
          <div className="flex items-center gap-2 font-mono-label text-[10px] tracking-label text-[#1A3626]/50 mb-8">
            <Clock size={12} /> {article.mins} {t.min}
          </div>
          {body === null ? (
            <div className="py-16 text-center font-mono-label text-xs tracking-label text-[#1A3626]/50 animate-pulse">···</div>
          ) : (
            <div className="article-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// tiny helper removed — lang read directly in components

export default function Blog() {
  const { lang } = useLang();
  const t = CONTENT[lang].blog;
  const [active, setActive] = useState(null);
  const [email, setEmail] = useState("");
  const [filter, setFilter] = useState("all");

  // pillars present, in first-seen order
  const pillarKeys = ARTICLES.reduce((acc, a) => (acc.includes(a.pillar) ? acc : [...acc, a.pillar]), []);
  const filtered = filter === "all" ? ARTICLES : ARTICLES.filter((a) => a.pillar === filter);

  const subscribe = useCallback(
    (e) => {
      e.preventDefault();
      const subject = encodeURIComponent("Iscrizione newsletter Radici");
      const body = encodeURIComponent(`Vorrei iscrivermi a Radici.\nEmail: ${email}`);
      window.location.href = `mailto:${CONTACT.email}?subject=${subject}&body=${body}`;
    },
    [email]
  );

  return (
    <section id="radici" data-testid="blog-section" className="relative bg-[#F5F3E9] py-28 md:py-40">
      <div className="mx-auto max-w-[1500px] px-6 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16 md:mb-24">
          <span className="md:col-span-3 font-mono-label text-xs tracking-label text-[#D48924] pt-3">{t.label}</span>
          <div className="md:col-span-9">
            <h2 className="font-display font-light text-[#1A3626] text-5xl sm:text-7xl lg:text-8xl leading-[0.9]">
              <RevealWords text={t.heading} />
              <span className="italic block text-[#2f4c3a]"><RevealWords text={t.headingEm} /></span>
            </h2>
            <Reveal className="mt-8" y={20}>
              <p className="font-body text-lg md:text-xl text-[#1A3626]/70 max-w-2xl leading-relaxed">{t.lead}</p>
            </Reveal>
          </div>
        </div>

        {/* Filter bar */}
        <Reveal className="flex flex-wrap gap-3 mb-14" y={16}>
          <button
            data-testid="filter-all"
            onClick={() => setFilter("all")}
            className={`font-mono-label text-[11px] tracking-label px-5 py-2.5 border transition-colors duration-300 ${
              filter === "all"
                ? "bg-[#1A3626] text-[#F5F3E9] border-[#1A3626]"
                : "bg-transparent text-[#1A3626] border-[#1A3626]/25 hover:border-[#1A3626]"
            }`}
          >
            {t.all}
          </button>
          {pillarKeys.map((k) => (
            <button
              key={k}
              data-testid={`filter-${k}`}
              onClick={() => setFilter(k)}
              className={`font-mono-label text-[11px] tracking-label px-5 py-2.5 border transition-colors duration-300 ${
                filter === k
                  ? "bg-[#1A3626] text-[#F5F3E9] border-[#1A3626]"
                  : "bg-transparent text-[#1A3626] border-[#1A3626]/25 hover:border-[#1A3626]"
              }`}
            >
              {PILLARS[k][lang]}
            </button>
          ))}
        </Reveal>

        {/* Articles grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-14">
          {filtered.map((a, i) => (
            <Reveal key={a.id} delay={(i % 3) * 0.08} y={34}>
              <button
                data-testid={`article-card-${a.id}`}
                onClick={() => setActive(a)}
                className="group text-left w-full"
              >
                <div className="relative overflow-hidden aspect-[4/3] bg-[#D3D9C9] mb-5">
                  <img
                    src={a.cover}
                    alt={lang === "en" ? a.titleEn : a.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.06]"
                  />
                  <div className="absolute top-3 left-3 font-mono-label text-[9px] tracking-label text-[#1A3626] bg-[#F5F3E9]/90 px-2.5 py-1">
                    {PILLARS[a.pillar][lang]}
                  </div>
                </div>
                <div className="flex items-center gap-2 font-mono-label text-[10px] tracking-label text-[#1A3626]/45 mb-3">
                  <Clock size={11} /> {a.mins} {t.min}
                </div>
                <h3 className="font-display text-2xl md:text-3xl text-[#1A3626] leading-[1.05] mb-3 transition-colors duration-300 group-hover:text-[#D48924]">
                  {lang === "en" ? a.titleEn : a.title}
                </h3>
                <p className="font-body text-[#1A3626]/65 text-sm leading-relaxed mb-4 line-clamp-3">{lang === "en" ? a.excerptEn : a.excerpt}</p>
                <span className="inline-flex items-center gap-1.5 font-mono-label text-[11px] tracking-label text-[#1A3626] link-underline">
                  {t.read}
                  <ArrowUpRight size={14} className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
              </button>
            </Reveal>
          ))}
        </div>

        {/* Newsletter */}
        <Reveal className="mt-24 md:mt-32" y={28}>
          <div className="bg-[#1A3626] text-[#F5F3E9] p-8 md:p-16 flex flex-col md:flex-row md:items-center justify-between gap-10">
            <div className="max-w-md">
              <div className="font-display text-3xl md:text-4xl mb-3">{t.newsletterTitle}</div>
              <p className="font-body text-[#F5F3E9]/70">{t.newsletterNote}</p>
            </div>
            <form onSubmit={subscribe} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto md:min-w-[420px]">
              <input
                data-testid="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="flex-1 bg-transparent border border-[#F5F3E9]/30 px-5 py-4 font-body text-[#F5F3E9] placeholder-[#F5F3E9]/40 focus:outline-none focus:border-[#D48924] transition-colors"
              />
              <button
                data-testid="newsletter-subscribe"
                type="submit"
                className="font-mono-label text-xs tracking-label px-8 py-4 bg-[#D48924] text-[#1A3626] hover:bg-[#F5F3E9] transition-colors whitespace-nowrap"
              >
                {t.subscribe}
              </button>
            </form>
          </div>
        </Reveal>
      </div>

      {active && <ArticleModal article={active} t={t} onClose={() => setActive(null)} />}
    </section>
  );
}
