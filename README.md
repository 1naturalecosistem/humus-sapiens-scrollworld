# Humus Sapiens — Sito

Landing page single-page dell'Azienda Agricola Humus Sapiens (Alta Val Petronio, Liguria).
Bilingue IT/EN · React 19 + CRA/craco · framer-motion · Lenis · Three.js (hero) · Tailwind.

## Sviluppo

```bash
cd frontend
npm install --legacy-peer-deps
npm start          # dev server su http://localhost:3000
npm run build      # build di produzione in frontend/build/
```

## Struttura contenuti

- **Testi e immagini**: tutto centralizzato in `frontend/src/lib/content.js`
  - `IMAGES` — URL delle foto di sezione (sostituire con foto reali)
  - `CONTACT` — recapiti, P.IVA, CIN
  - `CONTENT` — tutti i testi IT/EN
  - `SHOP` / `ARTICLES` — prodotti miele e articoli blog
- **Articoli blog**: markdown in `frontend/public/articles/` (IT) e `articles/en/`
- **Design system**: `design_guidelines.json` (font, palette, spacing)
- **Foto locali**: vanno in `frontend/public/` e referenziate come `/nomefile.jpg`

## Note

- Solo vetrina: shop e newsletter aprono `mailto:` (nessun backend).
- Decisioni di progetto: `memory/PRD.md`.
