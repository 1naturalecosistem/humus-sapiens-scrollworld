import { createContext, useContext, useState, useCallback, useEffect } from "react";

const LangContext = createContext(null);

export const LangProvider = ({ children }) => {
  const [lang, setLang] = useState("it");
  const toggle = useCallback(() => setLang((l) => (l === "it" ? "en" : "it")), []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <LangContext.Provider value={{ lang, setLang, toggle }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
};
