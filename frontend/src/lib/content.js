// Centralized bilingual content + media.
//
// Every image and clip on the site is the farm's own: nothing here is stock, and
// nothing is fetched from a third-party host. The derived files in /public are
// cut from the originals by `scripts/prepare_media.py` — change a crop there and
// re-run it rather than editing the JPEGs by hand.
export const IMAGES = {
  soilHands: `${process.env.PUBLIC_URL}/casale.jpg`, // aerial view of the two villas
  tentForest: `${process.env.PUBLIC_URL}/terrazza.jpg`, // picnic table overlooking the sea
  foodForest: `${process.env.PUBLIC_URL}/foodforest.jpg`, // the beds inside the chestnut wood
  beekeepers: `${process.env.PUBLIC_URL}/apiario.jpg`, // the hives under the trees
  honeycomb: `${process.env.PUBLIC_URL}/favo.jpg`, // uncapping the comb — a video frame, 464px
  community: `${process.env.PUBLIC_URL}/aiuole.jpg`, // working the crescent beds
  luogo: `${process.env.PUBLIC_URL}/valle.jpg`, // wide sunset panorama towards the sea
};

export const CONTACT = {
  company: "Azienda Agricola \u201CHumus Sapiens\u201D di Giovanni Spena",
  address: "Loc. Baresi 15 · 16030 Castiglione Chiavarese (GE)",
  email: "hs.az.agri@gmail.com",
  phone: "+39 327 8160257",
  phoneRaw: "+393278160257",
  region: "Alta Val Petronio · Liguria · 672 m s.l.m.",
  piva: "P.IVA 02446430999",
  cin: "CIN IT010013B5EKQITTKX",
};

export const NAV = {
  it: [
    { id: "esplora-il-territorio", label: "Esplora il Territorio" },
    { id: "chi-siamo", label: "Chi Siamo" },
    { id: "agricampeggio", label: "Ospitalità" },
    { id: "prenota", label: "Prenota" },
    { id: "bee-humus", label: "Bee Humus" },
    { id: "shop", label: "Shop" },
    { id: "raccolti", label: "R'Accolti" },
    { id: "il-luogo", label: "Il Luogo" },
    { id: "radici", label: "Radici" },
    { id: "contatti", label: "Contatti" },
  ],
  en: [
    { id: "esplora-il-territorio", label: "Explore the Land" },
    { id: "chi-siamo", label: "About" },
    { id: "agricampeggio", label: "Stay" },
    { id: "prenota", label: "Book" },
    { id: "bee-humus", label: "Bee Humus" },
    { id: "shop", label: "Shop" },
    { id: "raccolti", label: "R'Accolti" },
    { id: "il-luogo", label: "The Place" },
    { id: "radici", label: "Roots" },
    { id: "contatti", label: "Contact" },
  ],
};

// Honey shop — extendable with new products later.
export const SHOP = {
  castagno: {
    label: `${process.env.PUBLIC_URL}/label_castagno.png`,
    accent: "#8a5a2b",
    it: { name: "Miele di Castagno", note: "Estratto a freddo, non pastorizzato, integrale. Così come lo fanno le api.", tagline: "Delle colline dell'Alta Val Petronio" },
    en: { name: "Chestnut Honey", note: "Cold-extracted, unpasteurised, whole. Just as the bees make it.", tagline: "From the hills of the Alta Val Petronio" },
    sizes: [
      { size: "250 g", price: "4,50" },
      { size: "500 g", price: "7,00" },
      { size: "1 kg", price: "13,00" },
    ],
  },
  millefiori: {
    label: `${process.env.PUBLIC_URL}/label_millefiori.png`,
    accent: "#5a4a2b",
    it: { name: "Miele Millefiori", note: "Piantate, curate, coltivate e raccolte a mano. Dentro il vasetto, nettare di fiori selvatici.", tagline: "Delle colline dell'Alta Val Petronio" },
    en: { name: "Wildflower Honey", note: "Planted, tended, grown and hand-harvested. Inside the jar, nectar of wildflowers.", tagline: "From the hills of the Alta Val Petronio" },
    sizes: [
      { size: "250 g", price: "5,00" },
      { size: "500 g", price: "7,50" },
      { size: "1 kg", price: "14,00" },
    ],
  },
};

// Blog pillars — used for filtering; grows as articles grow.
export const PILLARS = {
  tossicita: { it: "Tossicità quotidiana", en: "Everyday toxicity" },
  problema: { it: "Il problema", en: "The problem" },
  rigenerativa: { it: "La via rigenerativa", en: "The regenerative way" },
  diario: { it: "Diario del fondo", en: "Farm diary" },
};

// Radici blog articles (part of the Radici newsletter). Body fetched from /public/articles.
export const ARTICLES = [
  {
    id: "permacultura",
    pillar: "rigenerativa",
    file: "/articles/01-permacultura.md",
    fileEn: "/articles/en/01-permaculture.md",
    cover: `${process.env.PUBLIC_URL}/cover-permacultura.jpg`,
    date: "2026-07-24",
    mins: 6,
    title: "Cos'è la permacultura e i 12 principi di Holmgren",
    titleEn: "What permaculture is, and Holmgren's 12 principles",
    excerpt:
      "La permacultura non è giardinaggio bio: è un metodo di progettazione. Cosa significa davvero e cosa dicono i 12 principi di David Holmgren, con esempi concreti dal campo.",
    excerptEn:
      "Permaculture isn't organic gardening: it's a design method. What it really means and what David Holmgren's 12 principles say, with concrete examples from the field.",
  },
  {
    id: "socialita-api",
    pillar: "diario",
    file: "/articles/02-socialita-api.md",
    fileEn: "/articles/en/02-bee-sociality.md",
    cover: `${process.env.PUBLIC_URL}/cover-sciame.jpg`,
    date: "2026-07-24",
    mins: 5,
    title: "La socialità delle api: come funziona una colonia",
    titleEn: "The sociality of bees: how a colony works",
    excerpt:
      "Regina, operaie, fuchi, danza dell'ape e feromoni: come 50.000 api coordinano un solo organismo senza un capo. La biologia dell'alveare spiegata semplice.",
    excerptEn:
      "Queen, workers, drones, the bee dance and pheromones: how 50,000 bees coordinate one organism with no leader. The biology of the hive, made simple.",
  },
  {
    id: "impollinatori",
    pillar: "problema",
    file: "/articles/03-impollinatori.md",
    fileEn: "/articles/en/03-pollinators.md",
    cover: `${process.env.PUBLIC_URL}/cover-arnie.jpg`,
    date: "2026-07-24",
    mins: 6,
    title: "La crisi degli impollinatori nel mondo",
    titleEn: "The global pollinator crisis",
    excerpt:
      "Il 75% delle colture alimentari dipende dagli impollinatori, e molti sono in declino. Cause, numeri verificati (IPBES) e cosa funziona davvero per invertire la rotta.",
    excerptEn:
      "75% of food crops depend on pollinators, and many are in decline. Causes, verified numbers (IPBES) and what actually works to turn things around.",
  },
  {
    id: "microplastiche",
    pillar: "tossicita",
    file: "/articles/04-microplastiche.md",
    fileEn: "/articles/en/04-microplastics.md",
    cover: `${process.env.PUBLIC_URL}/cover-mare.jpg`,
    date: "2026-07-24",
    mins: 6,
    title: "Microplastiche: che succede nel mondo?",
    titleEn: "Microplastics: what's happening in the world?",
    excerpt:
      "Le microplastiche sono ovunque: oceani, aria, cibo, sangue umano. Cosa dicono i dati verificati, cosa sappiamo sulla salute e cosa l'Europa sta già facendo. Senza allarmismo.",
    excerptEn:
      "Microplastics are everywhere: oceans, air, food, human blood. What the verified data say, what we know about health, and what Europe is already doing. No alarmism.",
  },
  {
    id: "nutrizione",
    pillar: "problema",
    file: "/articles/05-nutrizione.md",
    fileEn: "/articles/en/05-nutrition.md",
    cover: `${process.env.PUBLIC_URL}/cover-orto.jpg`,
    date: "2026-07-24",
    mins: 7,
    title: "Nutrizione: il futuro sta nelle nostre radici?",
    titleEn: "Nutrition: does the future lie in our roots?",
    excerpt:
      "Frutta e verdura contengono meno nutrienti rispetto a 50 anni fa: cosa dicono davvero i dati, perché succede e cosa c'entrano il suolo vivo e le nostre radici.",
    excerptEn:
      "Fruit and vegetables hold fewer nutrients than 50 years ago: what the data really say, why it happens, and what living soil and our roots have to do with it.",
  },
];

export const CONTENT = {
  it: {
    hero: {
      kicker: "Azienda Agricola Sociale, Agriturismo, Apicoltura · Alta Val Petronio",
      line1: "Humus",
      line2: "Sapiens",
      tagline: "Terra · Persona · Crescita · Rigenerazione.",
      intro:
        "Un'azienda agricola rigenerativa immersa nel verde dell'entroterra di Sestri Levante, dentro la Rete Natura 2000. Suolo vivo, accogliamo persone, restituiamo più di quanto prendiamo.",
      scroll: "Scorri",
      cta: "Scopri il progetto",
    },
    marquee: ["Biodiversità", "Permacultura", "One Health", "Rigenerazione", "Comunità", "Crescita"],
    chiSiamo: {
      label: "Chi Siamo",
      heading: "La terra come",
      headingEm: "sistema da abitare",
      lead:
        "Humus è lo strato più vivo del suolo, dove la materia si trasforma in nutrimento. Sapiens è la sapienza di chi impara osservando. Insieme sono il nome di questo posto e il suo programma.",
      chapters: [
        {
          n: "01",
          title: "Le Radici",
          body:
            "Oltre quindici anni di esperienza nei servizi alla persona e un lungo cammino di affidamento familiare, avviato nel 2008 tra Piemonte e Liguria. Da qui nasce tutto.",
        },
        {
          n: "02",
          title: "Permacultura & One Health",
          body:
            "Non un'estetica rurale, ma una logica di progettazione: osservare prima di agire, integrare invece che separare. Suolo, piante, animali e persone sono un solo sistema di salute.",
        },
        {
          n: "03",
          title: "La Misura",
          body:
            "Numeri volutamente contenuti. Non gestiamo grandi volumi: lavoriamo bene su pochi casi, con continuità. La qualità nasce dalla presenza, non dalla scala.",
        },
        {
          n: "04",
          title: "Rigenerazione, non conservazione",
          body:
            "L'obiettivo non è mantenere il suolo (Fondo) com'è, ma renderlo più ricco ogni anno. Più suolo vivo, più acqua trattenuta, più vita. La presenza umana contribuisce, non sottrae.",
        },
      ],
    },
    agricampeggio: {
      label: "Ospitalità · Agricampeggio Rigenerativo",
      heading: "Non una vacanza nel verde.",
      headingEm: "Il ritmo di un suolo vero",
      lead:
        "Due ville in agriturismo e otto piazzole immerse in una food forest in sviluppo, a 672 metri di quota, dentro la Rete Natura 2000. Non un campeggio vicino alla natura: dentro un sistema che sta crescendo. A venti minuti dal mare di Sestri Levante, a un mondo di distanza.",
      stats: [
        { v: "672 m", k: "sul livello del mare" },
        { v: "8 × 20 m²", k: "piazzole nella food forest" },
        { v: "L.R. 37/2007", k: "agricampeggio autorizzato" },
      ],
      quote:
        "Non è un campeggio vicino alla natura: è dentro un sistema che sta crescendo, dove ogni anno il fondo è più ricco del precedente.",
    },
    prenota: {
      label: "Prenota · Disponibilità in tempo reale",
      heading: "Prenota il tuo",
      headingEm: "soggiorno",
      lead:
        "Scegli le date e prenota direttamente con noi: nessun intermediario, nessuna commissione aggiuntiva. Ville in agriturismo e piazzole nella food forest.",
      iframeTitle: "Prenotazione soggiorno — Humus Sapiens",
      note: "Prenotazione diretta · CIN IT010013B5EKQITTKX",
    },
    beeHumus: {
      label: "Bee Humus · Apicoltura Rigenerativa",
      heading: "Api delle",
      headingEm: "rocce verdi",
      lead:
        "I nostri alveari lavorano su una flora che quasi non esiste altrove: le fioriture dei suoli ofiolitici della ZSC, con specie rare e spesso endemiche. Ne escono mieli con profili aromatici unici. Ma le api sono anche il più onesto degli indicatori: se stanno bene, il sistema sta bene.",
      points: [
        {
          t: "Flora ofiolitica",
          d: "Serpentiniti e diabasi selezionano una flora endemica che cresce solo qui: profili di miele che non esistono altrove.",
        },
        {
          t: "Selezione naturale",
          d: "Regine selezionate per resistenza alla varroa, senza trattamenti chimici ripetuti. Ogni regina porta l'informazione adattativa del territorio.",
        },
        {
          t: "Indicatore di salute",
          d: "Presidio per gli impollinatori selvatici e strumento didattico. La produzione segue i ritmi della colonia, non del mercato.",
        },
      ],
      quote: "L'alveare non è una macchina da miele. È un organismo che pensa, decide, si adatta.",
      // Also the alt text of the two media: they carry the meaning of the panels.
      captions: { honey: "Disopercolatura del favo", apiary: "L'apiario nel bosco" },
    },
    shop: {
      label: "Shop · I mieli del fondo",
      heading: "Miele delle fioriture",
      headingEm: "ofiolitiche",
      lead:
        "Estratto a freddo, non pastorizzato, integrale — venduto direttamente, nel vetro, senza plastiche a contatto con l'alimento. Presto la selezione crescerà con nuovi prodotti del fondo.",
      sizesLabel: "Formati disponibili",
      soon: "Nuovi prodotti in arrivo",
      order: "Ordina",
    },
    raccolti: {
      label: "R'Accolti · Agricoltura Sociale",
      heading: "Il lavoro con la terra non è terapia.",
      headingEm: "È realtà — per questo funziona",
      lead:
        "Accogliamo persone segnalate dai servizi territoriali che hanno bisogno di un contesto educativo, protetto e strutturato. Qui non trovano un laboratorio simulato: trovano un fondo agricolo vero, con responsabilità concrete e risultati che si vedono.",
      pillars: [
        "Nuclei mamma-bambino",
        "Giovani e adulti in fragilità",
        "Reinserimento socio-lavorativo",
        "Relazione educativa continuativa",
        "Progettazione personalizzata",
        "Accompagnamento all'autonomia",
      ],
      note: "Piccoli numeri, presa in carico reale, nessun modello standardizzato. Dal 2008.",
    },
    ilLuogo: {
      label: "Il Luogo · ZSC IT1342806",
      heading: "Non è lo sfondo.",
      headingEm: "È il progetto",
      lead:
        "A 672–676 metri sul livello del mare, tra Sestri Levante e l'Alta Val Petronio, dentro la ZSC \u201CMonte Verruga – Roccagrande – Monte Pu\u201D. Sotto i piedi, uno dei substrati geologici più rari d'Europa: le ofioliti, rocce verdi di un antico fondo oceanico.",
      coords: "44.32° N · 9.42° E — 672-676 m s.l.m.",
      facts: [
        { v: "3.757", k: "ettari protetti" },
        { v: "21", k: "habitat Direttiva UE" },
        { v: "Rete Natura 2000", k: "designata 2017" },
      ],
    },
    blog: {
      label: "Radici · Il Blog",
      all: "Tutti",
      heading: "Cosa dice",
      headingEm: "la scienza",
      lead:
        "Radici è la nostra newsletter. Una volta al mese: cosa succede nel fondo, cosa dice la scienza su ciò che mangiamo e tocchiamo ogni giorno, e come si costruisce un'alternativa. Gratis, senza rumore.",
      read: "Leggi l'articolo",
      close: "Chiudi",
      min: "min di lettura",
      newsletterTitle: "Iscriviti a Radici",
      newsletterNote: "Gratis, senza rumore. Un'email al mese.",
      subscribe: "Iscriviti",
      emailPlaceholder: "La tua email",
    },
    contatti: {
      label: "Contatti",
      heading: "Siamo un posto vero.",
      headingEm: "Vieni a trovarci",
      lead: "Per soggiorni, miele, percorsi di agricoltura sociale, fattoria didattica o collaborazioni.",
      addressLabel: "Dove siamo",
      emailLabel: "Scrivici",
      phoneLabel: "Chiamaci",
    },
    footer: {
      tagline: "Azienda Agricola Rigenerativa",
      rights: "Tutti i diritti riservati.",
      back: "Torna su",
      privacy: "Privacy",
    },
    privacy: {
      title: "Informativa Privacy",
      updated: "Ultimo aggiornamento: luglio 2026",
      close: "Chiudi",
      sections: [
        {
          h: "Titolare del trattamento",
          p: "Azienda Agricola “Humus Sapiens” di Giovanni Spena — Loc. Baresi 15, 16030 Castiglione Chiavarese (GE) · hs.az.agri@gmail.com · P.IVA 02446430999.",
        },
        {
          h: "Cookie e tracciamento",
          p: "Questo sito non utilizza cookie, strumenti di analisi o sistemi di tracciamento. Nessun dato di navigazione viene raccolto o condiviso a fini di profilazione.",
        },
        {
          h: "Dati di contatto",
          p: "I pulsanti di contatto, ordine e iscrizione alla newsletter aprono il tuo programma di posta: i dati che ci invii (indirizzo email e contenuto del messaggio) sono usati esclusivamente per risponderti e gestire la tua richiesta (art. 6.1.b GDPR). Non vengono ceduti a terzi né usati per altre finalità.",
        },
        {
          h: "Newsletter Radici",
          p: "L'iscrizione avviene su tua richiesta via email. L'indirizzo è usato solo per l'invio della newsletter mensile; puoi disiscriverti in ogni momento scrivendo a hs.az.agri@gmail.com.",
        },
        {
          h: "Servizi di terze parti",
          p: "I caratteri tipografici sono caricati da Google Fonts: alla richiesta, il tuo indirizzo IP viene trasmesso ai server di Google. Il provider di hosting può registrare log tecnici (indirizzo IP, orario di accesso) necessari al funzionamento e alla sicurezza del sito.",
        },
        {
          h: "I tuoi diritti",
          p: "Puoi esercitare in ogni momento i diritti previsti dagli artt. 15–22 del GDPR (accesso, rettifica, cancellazione, limitazione, opposizione) scrivendo al titolare. Hai inoltre il diritto di proporre reclamo al Garante per la Protezione dei Dati Personali.",
        },
      ],
    },
  },
  en: {
    hero: {
      kicker: "Regenerative Farm · Alta Val Petronio, Liguria",
      line1: "Humus",
      line2: "Sapiens",
      tagline: "Soil · People · Growth · Regeneration.",
      intro:
        "A regenerative farm immersed in the green hills behind Sestri Levante, inside the Natura 2000 network. Living soil, we welcome people, we give back more than we take.",
      scroll: "Scroll",
      cta: "Discover the project",
    },
    marquee: ["Biodiversity", "Permaculture", "One Health", "Regeneration", "Community", "Growth"],
    chiSiamo: {
      label: "About Us",
      heading: "The land as a",
      headingEm: "system to inhabit",
      lead:
        "Humus is the most alive layer of the soil, where matter becomes nourishment. Sapiens is the wisdom of those who learn by observing. Together, they are the name of this place and its program.",
      chapters: [
        {
          n: "01",
          title: "The Roots",
          body:
            "Over fifteen years of experience in human services and a long journey of family fostering, begun in 2008 between Piedmont and Liguria. Everything grows from here.",
        },
        {
          n: "02",
          title: "Permaculture & One Health",
          body:
            "Not a rural aesthetic but a design logic: observe before acting, integrate rather than segregate. Soil, plants, animals and people are one single system of health.",
        },
        {
          n: "03",
          title: "The Scale",
          body:
            "Deliberately small numbers. We don't manage large volumes: we work well on few cases, with continuity. Quality comes from presence, not scale.",
        },
        {
          n: "04",
          title: "Regeneration, not preservation",
          body:
            "The goal is not to keep the farm as it is, but to make it richer every year. More living soil, more water retained, more life. Human presence contributes, it doesn't subtract.",
        },
      ],
    },
    agricampeggio: {
      label: "Stay · Regenerative Farm Camping",
      heading: "Not a holiday in the countryside.",
      headingEm: "The rhythm of a working farm",
      lead:
        "Two farmhouse villas and eight pitches inside a growing food forest at 672 metres, within a Natura 2000 area. Not camping near nature: camping inside a system that is growing. Twenty minutes from the sea at Sestri Levante — a world away.",
      stats: [
        { v: "672 m", k: "above sea level" },
        { v: "8 × 20 m²", k: "pitches in the food forest" },
        { v: "Authorised", k: "regional law L.R. 37/2007" },
      ],
      quote:
        "This is not camping near nature: it is camping inside a system that is growing, richer every year than the last.",
    },
    prenota: {
      label: "Book · Real-time availability",
      heading: "Book your",
      headingEm: "stay",
      lead:
        "Pick your dates and book directly with us: no middleman, no extra commission. Farmhouse villas and pitches in the food forest.",
      iframeTitle: "Book a stay — Humus Sapiens",
      note: "Direct booking · CIN IT010013B5EKQITTKX",
    },
    beeHumus: {
      label: "Bee Humus · Regenerative Beekeeping",
      heading: "Bees of the",
      headingEm: "green rocks",
      lead:
        "Our hives forage on flora that barely exists anywhere else: the blooms of the ophiolitic soils of the protected area, with rare and often endemic species. The result is honey with aromatic profiles found nowhere else. And bees are the most honest indicator we have: when they are well, the system is well.",
      points: [
        {
          t: "Ophiolitic flora",
          d: "Serpentinites and diabase select an endemic flora that grows only here: honey profiles that exist nowhere else.",
        },
        {
          t: "Natural selection",
          d: "Queens selected for varroa resistance, without repeated chemical treatments. Each queen carries the adaptive information of the territory.",
        },
        {
          t: "Health indicator",
          d: "A stronghold for wild pollinators and a teaching tool. Production follows the rhythms of the colony, not the market.",
        },
      ],
      quote: "The hive is not a honey machine. It is an organism that thinks, decides, adapts.",
      captions: { honey: "Uncapping the comb", apiary: "The apiary in the wood" },
    },
    shop: {
      label: "Shop · Honey from the farm",
      heading: "Honey from",
      headingEm: "ophiolitic blooms",
      lead:
        "Cold-extracted, unpasteurised, whole — sold directly, in glass, with no plastic touching your food. The selection will soon grow with new products from the farm.",
      sizesLabel: "Available sizes",
      soon: "New products coming soon",
      order: "Order",
    },
    raccolti: {
      label: "R'Accolti · Social Farming",
      heading: "Working the land is not therapy.",
      headingEm: "It is reality — which is why it works",
      lead:
        "We welcome people referred by public social services who need an educational, protected, structured environment. What they find here is not a simulated workshop but a real working farm, with real responsibilities and visible results.",
      pillars: [
        "Mothers with children",
        "Young people & adults in fragility",
        "Work reintegration pathways",
        "Continuous educational relationship",
        "Personalised design",
        "Guidance towards autonomy",
      ],
      note: "Small numbers, real care, no standardised model. Since 2008.",
    },
    ilLuogo: {
      label: "The Place · Natura 2000 IT1342806",
      heading: "Not the backdrop.",
      headingEm: "The point",
      lead:
        "At 672–676 metres above sea level, between Sestri Levante and the upper Petronio valley, inside the \u201CMonte Verruga – Roccagrande – Monte Pu\u201D protected area. Beneath our feet, one of Europe's rarest geological substrates: ophiolites, green rocks of an ancient ocean floor.",
      coords: "44.32° N · 9.42° E — 672-676 m a.s.l.",
      facts: [
        { v: "3,757", k: "protected hectares" },
        { v: "21", k: "EU Directive habitats" },
        { v: "Natura 2000", k: "designated 2017" },
      ],
    },
    blog: {
      label: "Roots · The Blog",
      all: "All",
      heading: "What the",
      headingEm: "science says",
      lead:
        "Roots is our newsletter. Once a month: life on the farm, what science says about what we eat and touch every day, and how an alternative gets built. Free, no noise.",
      read: "Read the article",
      close: "Close",
      min: "min read",
      newsletterTitle: "Subscribe to Roots",
      newsletterNote: "Free, no noise. One email a month.",
      subscribe: "Subscribe",
      emailPlaceholder: "Your email",
    },
    contatti: {
      label: "Contact",
      heading: "We're a real place.",
      headingEm: "Come and see",
      lead: "For stays, honey, social farming paths, the educational farm or collaborations.",
      addressLabel: "Where we are",
      emailLabel: "Write us",
      phoneLabel: "Call us",
    },
    footer: {
      tagline: "Regenerative Farm",
      rights: "All rights reserved.",
      back: "Back to top",
      privacy: "Privacy",
    },
    privacy: {
      title: "Privacy Policy",
      updated: "Last updated: July 2026",
      close: "Close",
      sections: [
        {
          h: "Data controller",
          p: "Azienda Agricola “Humus Sapiens” di Giovanni Spena — Loc. Baresi 15, 16030 Castiglione Chiavarese (GE), Italy · hs.az.agri@gmail.com · VAT 02446430999.",
        },
        {
          h: "Cookies and tracking",
          p: "This website uses no cookies, analytics or tracking tools. No browsing data is collected or shared for profiling purposes.",
        },
        {
          h: "Contact data",
          p: "Contact, order and newsletter buttons open your own email client: the data you send us (email address and message content) is used solely to reply and handle your request (art. 6.1.b GDPR). It is never shared with third parties or used for other purposes.",
        },
        {
          h: "Radici newsletter",
          p: "Subscription happens at your request via email. Your address is used only to send the monthly newsletter; you can unsubscribe at any time by writing to hs.az.agri@gmail.com.",
        },
        {
          h: "Third-party services",
          p: "Typefaces are served by Google Fonts: on request, your IP address is transmitted to Google's servers. The hosting provider may keep technical logs (IP address, access time) required for the operation and security of the site.",
        },
        {
          h: "Your rights",
          p: "You may exercise at any time the rights set out in arts. 15–22 GDPR (access, rectification, erasure, restriction, objection) by writing to the controller. You also have the right to lodge a complaint with the Italian Data Protection Authority (Garante).",
        },
      ],
    },
  },
};
