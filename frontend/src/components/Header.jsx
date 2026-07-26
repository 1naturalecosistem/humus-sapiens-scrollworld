import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useLang } from "../lib/i18n";
import { NAV } from "../lib/content";
import { scrollToId } from "./SmoothScroll";

export default function Header() {
  const { lang, toggle } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const items = NAV[lang];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (id) => {
    setOpen(false);
    scrollToId(id);
  };

  return (
    <>
      <motion.header
        data-testid="site-header"
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 1.4 }}
        className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,backdrop-filter,border-color,padding] duration-500 ${
          scrolled
            ? "bg-[#F5F3E9]/80 backdrop-blur-md border-b border-[#1A3626]/10 py-4"
            : "bg-transparent py-6"
        }`}
      >
        <div className="mx-auto max-w-[1500px] px-6 md:px-10 flex items-center justify-between">
          <button
            data-testid="logo-home-btn"
            onClick={() => go("hero")}
            className="flex items-center gap-3 group"
          >
            <img src="/logo.png" alt="Humus Sapiens" className="h-11 w-11 md:h-12 md:w-12 object-contain transition-transform duration-500 group-hover:rotate-6" />
            <span className="hidden sm:block font-display text-xl md:text-2xl leading-none text-[#1A3626] tracking-tight">
              Humus <span className="italic font-light">Sapiens</span>
            </span>
          </button>

          <nav className="hidden lg:flex items-center gap-5 xl:gap-8">
            {items.map((it) => (
              <button
                key={it.id}
                data-testid={`nav-${it.id}`}
                onClick={() => go(it.id)}
                className="font-body text-sm text-[#1A3626]/80 hover:text-[#1A3626] link-underline transition-colors duration-300"
              >
                {it.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button
              data-testid="lang-toggle"
              onClick={toggle}
              className="font-mono-label text-xs tracking-label border border-[#1A3626]/30 rounded-full px-3 py-1.5 text-[#1A3626] hover:bg-[#1A3626] hover:text-[#F5F3E9] transition-colors duration-300"
              aria-label="Toggle language"
            >
              {lang === "it" ? "IT / en" : "it / EN"}
            </button>
            <button
              data-testid="mobile-menu-toggle"
              onClick={() => setOpen((o) => !o)}
              className="lg:hidden text-[#1A3626] p-1"
              aria-label="Menu"
            >
              {open ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {open && (
          <motion.div
            data-testid="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-40 bg-[#1A3626] flex flex-col justify-center px-8 lg:hidden"
          >
            <nav className="flex flex-col gap-2">
              {items.map((it, i) => (
                <motion.button
                  key={it.id}
                  data-testid={`mobile-nav-${it.id}`}
                  onClick={() => go(it.id)}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.07 }}
                  className="text-left font-display text-4xl text-[#F5F3E9] py-2"
                >
                  {it.label}
                </motion.button>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
