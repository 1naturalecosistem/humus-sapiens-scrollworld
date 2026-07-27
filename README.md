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

## Il volo del drone ("Esplora il Territorio")

Il volo è un video H.264 scrubato dallo scroll, non una sequenza di frame.

- Config: `frontend/src/components/ScrollWorld/humus-config.js`
  (varianti video, curva `timeWarp`, hotspot, lunghezza dello scroll)
- Motore: `useFlightVideo.js` (scelta variante, priming iOS, seek smorzato)
- Asset: `frontend/public/assets/flight/` — 5 file, ne viene scaricato **uno solo**
  per visita, scelto da viewport / densità pixel / connessione:

  | file | risoluzione | peso | quando |
  |---|---|---|---|
  | `flight-hidpi.mp4` | 2048×1152 | 29 MB | desktop ≥2000 px device |
  | `flight-desktop.mp4` | 1600×900 | 20 MB | desktop |
  | `flight-mobile-portrait.mp4` | 810×1440 | 11 MB | schermi verticali |
  | `flight-mobile.mp4` | 960×540 | 8 MB | touch in orizzontale, rete lenta |
  | `flight-first*.jpg`, `flight-poster.jpg` | — | 0,5 MB | poster + fallback statico |

### Ricostruire il volo

La pipeline sta in `../../Volo Drone scrolldown/_build/` (fuori dal repo, ~500 MB
di intermedi — si può cancellare, si rigenera dalle riprese originali):

```bash
./build_master.sh        # ricava il master 2560x1440 dai 3 MP4 originali (~7 min)
python3 measure_warp.py  # rimisura il moto e stampa la tabella timeWarp
./encode_delivery.sh     # encoda hidpi / desktop / mobile + poster
./encode_portrait.sh     # encoda la variante verticale
python3 build_photos.py  # rigenera casale.jpg e terrazza.jpg dal master
node test_site.js --width 1600 --dpr 2 --shots   # test nel browser
```

Dopo `measure_warp.py` va incollata la nuova tabella `timeWarp` in
`humus-config.js`, insieme ai valori `at` degli hotspot che lo script stampa.

## Note

- Solo vetrina: shop e newsletter aprono `mailto:` (nessun backend).
- Decisioni di progetto: `memory/PRD.md`.
- `BeeHumus` e `Blog` usano ancora 7 foto stock esterne (Pexels): vanno
  sostituite con foto proprie quando disponibili.
