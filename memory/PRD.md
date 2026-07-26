# Humus Sapiens — Landing Page Immersiva

## Problema originale
"Crea la landing page immersiva di Humus Sapiens, hai tutto il contesto allegato, usa grafiche 3d e includi placeholder per immagini che inserirò io in un secondo momento. Usa animazioni scroll down e up dinamiche e armoniche."
+ brief: livello Awwwards, hero cinetico con reveal riga-per-riga, marquee editoriale, capitoli numerati, framer-motion + lenis, momento 3D/parallax.

## Contesto brand
Azienda Agricola (sociale) Humus Sapiens — Alta Val Petronio, Castiglione Chiavarese (GE), Liguria.
Temi: agricoltura rigenerativa, permacultura, apicoltura (Bee Humus, 60 colonie), agricoltura sociale (R'Accolti), agricampeggio rigenerativo. Fonti: 3 docx (agricampeggio, bee_humus, carta servizi) + logo. Nota: `presentazione.docx` risultava corrotto (zip non valido), contenuti dedotti dagli altri documenti.

## Scelte utente
- Sezioni: Hero + Chi Siamo + Agricampeggio + Bee Humus + R'Accolti + Il Luogo + Contatti (single page scroll)
- Solo vetrina (nessun form funzionante)
- Stile: naturale/organico ed elegante
- Bilingue IT + EN (toggle header)
- Contatti: Loc. Baresi 15, 16030 Castiglione Chiavarese (GE) · hs.az.agri@gmail.com · +39 327 8160257

## Architettura
- Frontend-only (React 19 CRA/craco). Nessun backend usato (default template intatto). MongoDB non usato.
- Librerie: framer-motion, lenis (smooth scroll), react-fast-marquee, three + @react-three/fiber + @react-three/drei (hero 3D).
- Design: `/app/design_guidelines.json`. Font: Cormorant Garamond (display), Figtree (body), IBM Plex Mono (label). Palette: paper #F5F3E9, forest #1A3626, soil #2B231D, honey #D48924, sage #D3D9C9.

## Implementato (2026-06 / build 1)
- Hero cinetico: reveal riga-per-riga mascherato, canvas R3F (seme distorto + spore fluttuanti + glow miele), parallax scroll, scroll cue.
- Smooth momentum scroll (Lenis) + grain overlay globale.
- Chi Siamo: 4 capitoli numerati + immagine parallax.
- Agricampeggio: full-bleed image, marquee editoriale, stat grid, quote.
- Bee Humus: sezione dark honey, doppia immagine parallax, 3 punti.
- R'Accolti: sezione forest green, 6 pilastri.
- Il Luogo: parallax full-screen panorama Liguria.
- Contatti + footer con wordmark gigante, back-to-top.
- Toggle lingua IT/EN funzionante su tutti i contenuti. Header glass sticky + menu mobile.
- Placeholder immagini etichettati ([ IMG · ... ]); URL centralizzati in `src/lib/content.js` (IMAGES) per sostituzione facile.

## Backlog / Next
- P1: L'utente sostituisce le immagini placeholder con foto reali (modificare `IMAGES` in `src/lib/content.js`).
- P2: Sezione prodotti/shop miele, galleria foto, mappa interattiva Val Petronio.
- P2: eventuale form contatti reale (Resend) se richiesto.
