// ============================================================================
// HUMUS SAPIENS — Scroll World configuration
// ----------------------------------------------------------------------------
// Single source of truth for the drone-flight scroll module:
// flight video, scroll time-warp, hotspots (position + copy IT/EN), minimap,
// altitude profile.
//
// WHY A VIDEO AND NOT A FRAME SEQUENCE
// The flight used to be 240 WebP stills at 1600x900. That is only ~4 frames per
// second of real motion, so every painted frame jumped ~190ms of world — which
// reads as stepping, and the cross-dissolve that hid the stepping turned every
// moving frame into a double image. Hence "blurry, low-res, too fast".
// A frame sequence cannot fix that: this footage costs ~150-450 KB per frame at
// a decent quality, so 24fps over a 56s flight would be well past a gigabyte.
// Inter-frame video compression is 20-40x more efficient on exactly this kind of
// content, so the flight now ships as H.264 and is scrubbed by setting
// `currentTime`. Same bytes, six times the temporal resolution, no ghosting.
//
// REBUILDING THE FLIGHT
// `../../../../../Volo Drone scrolldown/_build/` holds the pipeline:
//   build_master.sh    recut + grade the master from the original 2720x1530 MP4s
//   measure_warp.py    re-measure the motion profile and print `timeWarp` below
//   encode_delivery.sh encode the web variants + posters
// Copy the results into public/assets/flight/ and paste the new `timeWarp`.
// ============================================================================

const BASE = `${process.env.PUBLIC_URL}/assets/flight`;

export const HUMUS_SCROLL_WORLD = {
  flight: {
    // Real drone footage, recut to the hotspot story as one continuous move:
    //   arrival over the farm       0.MP4 37.5-44.9s
    //   the two guest houses        1.MP4  4.0-13.0s
    //   terraces, garden, serra     2.MP4  2.0-8.5s
    //   the forest and the clearing 2.MP4 26.0-32.0s
    //   the farm at golden hour     2.MP4 65.0-71.0s
    //   out to the ridge and sunset 2.MP4 77.0-81.4s
    // joined with 0.7s crossfades. 35.8s at 24fps.
    duration: 35.8,

    // Resolution ladder, picked at runtime from viewport + dpr + network.
    // Only one is ever fetched.
    //
    // `mobilePortrait` is a 9:16 centre crop, not just a smaller landscape file.
    // The flight fills the viewport with object-fit: cover, and a 16:9 video
    // covering a 9:19.5 phone screen gets scaled up ~4.7x vertically — measured,
    // and visibly mushy. Cropping to portrait first covers the same box at ~1.8x
    // for a third of the pixels a landscape file would need to match it.
    variants: {
      hidpi: `${BASE}/flight-hidpi.mp4`,
      desktop: `${BASE}/flight-desktop.mp4`,
      mobile: `${BASE}/flight-mobile.mp4`,
      mobilePortrait: `${BASE}/flight-mobile-portrait.mp4`,
    },
    // device-pixel width above which the hi-dpi ladder step is worth its bytes
    hidpiMinWidth: 2000,
    // viewport aspect (w/h) below which the portrait crop wins
    portraitMaxAspect: 0.85,

    poster: `${BASE}/flight-first.jpg`,
    posterPortrait: `${BASE}/flight-first-portrait.jpg`,
    // the sunset finale, used by the reduced-motion fallback
    posterStatic: `${BASE}/flight-poster.jpg`,

    // How hard the painted time chases the scroll position, as a time constant
    // in seconds. This is what makes the flight feel unhurried rather than
    // nailed to the wheel: the camera eases toward where you scrolled instead of
    // snapping to it. Larger = more float, but also more lag.
    followTau: 0.16,

    // Don't bother re-seeking for less than half a frame of movement.
    minSeekStep: 1 / 48,

    // Buffered fraction required before the flight is handed over to the
    // scroll. The scrub is clamped to the buffered range anyway, so this only
    // needs to be enough that the opening beats play without waiting.
    minBufferRatio: 0.12,
  },

  // ---------------------------------------------------------------------------
  // SCROLL TIME-WARP
  // Evenly spaced samples of scroll progress (0 -> 1) mapped to video seconds.
  // The raw footage is wildly uneven: the drift over the two houses moves the
  // world ~1 unit per frame, the run over the terraces ~23. Mapping scroll
  // linearly onto video time therefore made some beats crawl and others rocket
  // past — the "too fast" complaint. This table spends more scroll distance
  // where the world moves fast and less where it barely moves, so the flight
  // holds one calm pace throughout.
  // Regenerate with `measure_warp.py` (gamma 0.4 = partial equalisation).
  // ---------------------------------------------------------------------------
  timeWarp: [
    0.000, 0.598, 1.172, 1.729, 2.329, 3.190, 3.924, 4.552,
    5.159, 5.735, 6.352, 6.965, 7.601, 8.556, 9.537, 10.459,
    11.049, 11.570, 12.180, 12.873, 13.572, 14.378, 15.053, 15.530,
    16.017, 16.523, 17.002, 17.461, 17.909, 18.350, 18.789, 19.233,
    19.667, 20.056, 20.416, 20.778, 21.162, 21.611, 22.168, 22.722,
    23.233, 23.717, 24.182, 24.624, 25.045, 25.455, 25.860, 26.267,
    26.708, 27.217, 27.747, 28.267, 28.790, 29.318, 29.847, 30.362,
    30.847, 31.314, 31.791, 32.419, 33.220, 33.785, 34.320, 34.900,
    35.800,
  ],

  // Total scroll distance of the flight, in viewport-heights.
  // 35.8s of flight over 8 screens: ~240px of scroll per second of flight on a
  // 1080p window, half again as much as the old cut, and the time-warp holds
  // that rate steady instead of letting the terrace run eat it in one gulp.
  scrollLengthVh: 800,

  // section that "Salta l'animazione" jumps to
  skipTargetId: "chi-siamo",

  // Drone height above ground during the flight (m AGL), as [progress%, meters].
  // [Inferenza] estimated profile of the joined flight — display-only.
  altitudeProfile: [
    [0, 62],
    [7, 70],
    [24, 56],
    [44, 34],
    [65, 48],
    [88, 74],
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
  //   at:    progress % at which the card appears. Derived from the video time
  //          the beat is on screen, run through the time-warp above — so if the
  //          warp is regenerated, re-read these from `measure_warp.py` output.
  //   dwell: half-window in % during which it stays visible (at ± dwell)
  //   pos:   card anchor on desktop (percent of the canvas)
  //   target: section id the CTA scrolls to
  // --------------------------------------------------------------------------
  hotspots: [
    {
      id: "arrivo",
      at: 6.6, // video 2.5s — the farm framed from the air
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
      at: 23.5, // video 10.5s — both guest houses in frame
      dwell: 6.5,
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
      at: 44.1, // video 18.0s — terraces, garden beds and the greenhouse
      dwell: 6.5,
      pos: { x: "56%", y: "40%" },
      target: "shop",
      it: {
        eyebrow: "03 · Orto & Permacultura",
        title: "Coltivare imitando il bosco",
        body:
          "Ortaggi, frutti e piante officinali crescono in policoltura, senza chimica: il suolo si rigenera e diventa raccolto.",
        cta: "I nostri prodotti",
        ctaSecondary: "Scopri di più",
      },
      en: {
        eyebrow: "03 · Garden & Permaculture",
        title: "Farming like a forest",
        body:
          "Vegetables, fruit and medicinal plants grow in polyculture, chemical-free: the soil regenerates and becomes harvest.",
        cta: "Our products",
        ctaSecondary: "Learn more",
      },
    },
    {
      id: "bosco",
      at: 65.0, // video 24.0s — over the chestnut woods above the farm
      dwell: 8,
      pos: { x: "7%", y: "18%" },
      target: "il-luogo",
      it: {
        eyebrow: "04 · Il Bosco",
        title: "ZSC Alta Val Petronio",
        body:
          "Il volo attraversa la Zona Speciale di Conservazione: corridoi ecologici, biodiversità, acqua. Qui si misura la rigenerazione.",
        cta: "Esplora il territorio",
        ctaSecondary: "Scopri di più",
      },
      en: {
        eyebrow: "04 · The Forest",
        title: "Natura 2000 · Alta Val Petronio",
        body:
          "The flight crosses the Special Area of Conservation: ecological corridors, biodiversity, water. Regeneration is measured here.",
        cta: "Explore the land",
        ctaSecondary: "Learn more",
      },
    },
    {
      id: "tramonto",
      // Kept tight to the end so the card lands on the sunset itself (video
      // 33-35.8s) rather than opening over the golden-hour pass before it.
      at: 95,
      dwell: 7,
      pos: { x: "50%", y: "22%" },
      target: "contatti",
      it: {
        eyebrow: "05 · Il Tramonto",
        title: "Resta a guardarlo da qui",
        body:
          "La luce scende sul crinale e la valle rallenta. Il posto migliore per vederlo non è uno schermo: è la terrazza del casale.",
        cta: "Prenota ora",
        ctaSecondary: "Contattaci",
      },
      en: {
        eyebrow: "05 · The Sunset",
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
      eyebrow: "Il volo del drone · Alta Val Petronio",
      title: "Esplora il Territorio",
      hint: "Scorri per volare",
      skip: "Salta l'animazione",
      loading: "Preparo il volo",
      altitude: "Quota",
      map: "Mappa del volo",
    },
    en: {
      eyebrow: "The drone flight · Alta Val Petronio",
      title: "Explore the Land",
      hint: "Scroll to fly",
      skip: "Skip the flight",
      loading: "Preparing the flight",
      altitude: "Altitude",
      map: "Flight map",
    },
  },
};

// Map scroll progress (0–1) to a time in the flight, through the time-warp
// table. Linear interpolation between samples is plenty: the table is dense
// enough that the curve is already smooth at this scale.
export function flightTimeAt(progress, cfg = HUMUS_SCROLL_WORLD) {
  const table = cfg.timeWarp;
  const last = table.length - 1;
  const p = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;
  const x = p * last;
  const i = Math.min(last - 1, Math.floor(x));
  const f = x - i;
  return table[i] + (table[i + 1] - table[i]) * f;
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
