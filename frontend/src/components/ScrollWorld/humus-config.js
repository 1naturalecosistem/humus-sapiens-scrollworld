// ============================================================================
// HUMUS SAPIENS — Scroll World configuration
// ----------------------------------------------------------------------------
// Single source of truth for the drone-flight scroll module:
// frame sequence, hotspots (position + copy IT/EN), minimap, altitude profile.
//
// FRAME SWAP (Gemini / Higgsfield render):
// drop the new sequence into public/assets/frames/<set>/ keeping the naming
// `humus_frame_0001.webp … humus_frame_NNNN.webp`, then update `frames.count`.
// Current sequence: real drone footage, ungraded. 240 frames across a 45.1s
// flight cut to follow the hotspot narrative:
//   arrival over the farm      0.MP4 37.0-44.9s
//   the two guest houses       1.MP4  5.0-18.0s
//   terraces and garden        2.MP4  2.0-13.0s
//   forest and the clearing    2.MP4 21.0-29.5s
//   the ridge at sunset        2.MP4 74.0-81.9s
// Joined with 0.8s crossfades so the flight reads as one continuous move.
//
// Why 45s and not the full 90s of footage: how steppy the scrub feels is set
// by how much world motion each painted frame advances, i.e. by the ratio of
// footage seconds to scroll distance — not by the frame count. Halving the
// footage and lengthening `scrollLengthVh` is what makes it glide; adding
// frames past what the scroll can traverse only adds weight.
// ============================================================================

export const HUMUS_SCROLL_WORLD = {
  frames: {
    basePath: `${process.env.PUBLIC_URL}/assets/frames`,
    prefix: "humus_frame_",
    ext: "webp",
    pad: 4,          // humus_frame_0001
    firstIndex: 1,
    count: 240,
    // resolution sets: key -> subfolder. Picked at runtime (viewport + network).
    sets: {
      desktop: "1600",
      mobile: "720",
    },
    // pixel width of the files in `sets.desktop` — the canvas never allocates
    // a backing store wider than this, there would be no detail to show in it
    sourceWidth: 1600,
    // phase-1 preload loads every Nth frame, the rest streams in background
    preloadStride: 4,
    // on slow connections (2g/3g/saveData) the stride widens and mobile set is forced
    slowStride: 8,
    // parallel requests used to backfill the remaining frames
    concurrency: 8,
  },

  // total scroll distance of the flight, in viewport-heights (~8 screens).
  // Spreads 45s of footage over more pixels => less motion per painted frame.
  scrollLengthVh: 800,

  // section that "Salta l'animazione" jumps to
  skipTargetId: "chi-siamo",

  // Drone height above ground during the flight (m AGL), as [progress%, meters].
  // [Inferenza] estimated profile of the joined flight — edit freely, it is display-only.
  altitudeProfile: [
    [0, 64],
    [8, 72],
    [36, 46],
    [51, 30],
    [78, 58],
    [93, 86],
    [100, 92],
  ],

  // Minimap: stylised property outline + flight path (0–100 viewBox units).
  // The drone dot and the hotspot dots are placed ALONG `flightPath` by their
  // progress %, so only the two paths need editing if the flight changes.
  minimap: {
    viewBox: "0 0 100 100",
    propertyOutline:
      "M14,62 C10,44 18,26 34,18 C50,10 72,10 84,22 C94,32 94,52 86,66 C76,84 52,92 34,86 C22,82 17,74 14,62 Z",
    flightPath:
      "M20,74 C28,60 24,46 36,38 C50,29 60,42 66,30 C71,20 80,26 78,40 C76,56 66,64 56,72 C48,78 38,82 30,80",
  },

  // --------------------------------------------------------------------------
  // HOTSPOTS — the key points of the ecosystem along the flight.
  //   at:    progress % at which the card appears
  //   dwell: half-window in % during which it stays visible (at ± dwell)
  //   pos:   card anchor on desktop (percent of the canvas)
  //   target: section id the CTA scrolls to
  // --------------------------------------------------------------------------
  hotspots: [
    {
      id: "arrivo",
      at: 8,
      dwell: 6,
      pos: { x: "7%", y: "16%" },
      target: "il-luogo",
      it: {
        eyebrow: "01 · L'Arrivo",
        title: "Il casale tra i castagni",
        body:
          "Il volo comincia sopra il cuore di Humus Sapiens: un anfiteatro di terrazzamenti, tre case, un sistema dove terra viva e sapienza contadina si incontrano.",
        cta: "Scopri il luogo",
        ctaSecondary: "Scopri di più",
      },
      en: {
        eyebrow: "01 · The Arrival",
        title: "The farmhouse among chestnut trees",
        body:
          "The flight begins above the heart of Humus Sapiens: an amphitheatre of terraces, three houses, a system where living soil and rural wisdom meet.",
        cta: "Discover the place",
        ctaSecondary: "Learn more",
      },
    },
    {
      id: "ospitalita",
      at: 36,
      dwell: 6,
      pos: { x: "55%", y: "14%" },
      target: "agricampeggio",
      it: {
        eyebrow: "02 · Ospitalità Rurale, turistica, sociale, formativa, esperienziale.",
        title: "Ponente e Levante, due strutture, indipendenti e immerse nella natura",
        body:
          "Le camere verde, gialla e arancio, la cucina condivisa e il campo tra gli alberi: un'ospitalità semplice, radicata, rigenerativa.",
        cta: "Prenota ora",
        ctaSecondary: "Vedi le camere",
      },
      en: {
        eyebrow: "02 · Rural, tourism, social, educational and experiential hospitality.",
        title: "Ponente and Levante, two structures, independent and immersed in nature",
        body:
          "The green, yellow and orange rooms, the shared kitchen and the field among the trees: simple, rooted, regenerative hospitality.",
        cta: "Book now",
        ctaSecondary: "See the rooms",
      },
    },
    {
      id: "permacultura",
      at: 51,
      dwell: 6,
      pos: { x: "56%", y: "40%" },
      target: "shop",
      it: {
        eyebrow: "04 · Orto & Permacultura",
        title: "Coltivare imitando il bosco",
        body:
          "Ortaggi, frutti e piante officinali crescono in policoltura, senza chimica: il suolo si rigenera e diventa raccolto.",
        cta: "I nostri prodotti",
        ctaSecondary: "Scopri di più",
      },
      en: {
        eyebrow: "04 · Garden & Permaculture",
        title: "Farming like a forest",
        body:
          "Vegetables, fruit and medicinal plants grow in polyculture, chemical-free: the soil regenerates and becomes harvest.",
        cta: "Our products",
        ctaSecondary: "Learn more",
      },
    },
    {
      id: "bosco",
      at: 78,
      dwell: 6,
      pos: { x: "7%", y: "18%" },
      target: "il-luogo",
      it: {
        eyebrow: "05 · Il Bosco",
        title: "ZSC Alta Val Petronio",
        body:
          "Il volo attraversa la Zona Speciale di Conservazione: corridoi ecologici, biodiversità, acqua. Qui si misura la rigenerazione.",
        cta: "Esplora il territorio",
        ctaSecondary: "Scopri di più",
      },
      en: {
        eyebrow: "05 · The Forest",
        title: "Natura 2000 · Alta Val Petronio",
        body:
          "The flight crosses the Special Area of Conservation: ecological corridors, biodiversity, water. Regeneration is measured here.",
        cta: "Explore the land",
        ctaSecondary: "Learn more",
      },
    },
    {
      id: "tramonto",
      at: 93,
      dwell: 7,
      pos: { x: "50%", y: "22%" },
      target: "contatti",
      it: {
        eyebrow: "06 · Il Tramonto",
        title: "Resta a guardarlo da qui",
        body:
          "La luce scende sul crinale e la valle rallenta. Il posto migliore per vederlo non è uno schermo: è la terrazza del casale.",
        cta: "Prenota ora",
        ctaSecondary: "Contattaci",
      },
      en: {
        eyebrow: "06 · The Sunset",
        title: "Stay and watch it from here",
        body:
          "Light falls on the ridge and the valley slows down. The best place to watch it is not a screen: it is the farmhouse terrace.",
        cta: "Book now",
        ctaSecondary: "Contact us",
      },
    },
  ],

  // fixed UI strings
  ui: {
    it: {
      eyebrow: "Il volo del drone · Alta Val di Vara",
      title: "Esplora il Territorio",
      hint: "Scorri per volare",
      skip: "Salta l'animazione",
      loading: "Preparo il volo",
      altitude: "Quota",
      map: "Mappa del volo",
    },
    en: {
      eyebrow: "The drone flight · Alta Val di Vara",
      title: "Explore the Land",
      hint: "Scroll to fly",
      skip: "Skip the flight",
      loading: "Preparing the flight",
      altitude: "Altitude",
      map: "Flight map",
    },
  },
};

// path helper: frameSrc("1600", 12) -> /assets/frames/1600/humus_frame_0012.webp
export function frameSrc(setDir, i, f = HUMUS_SCROLL_WORLD.frames) {
  return `${f.basePath}/${setDir}/${f.prefix}${String(i).padStart(f.pad, "0")}.${f.ext}`;
}

// piecewise-linear altitude lookup for the HUD
export function altitudeAt(pct, profile = HUMUS_SCROLL_WORLD.altitudeProfile) {
  if (pct <= profile[0][0]) return profile[0][1];
  for (let k = 1; k < profile.length; k++) {
    const [p1, a1] = profile[k - 1];
    const [p2, a2] = profile[k];
    if (pct <= p2) return Math.round(a1 + ((pct - p1) / (p2 - p1)) * (a2 - a1));
  }
  return profile[profile.length - 1][1];
}
