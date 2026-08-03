import { useLang } from "../lib/i18n";
import { Reveal, RevealWords } from "./Reveal";

const CAMPAIGNS = {
  it: [
    {
      title: "Sostieni il futuro del fondo",
      body: "Le campagne GoFoundMe ci aiutano a finanziare la rigenerazione del suolo, la biodiversità e gli spazi di accoglienza per persone e comunità.",
      cta: "Scopri la campagna",
      url: "https://www.gofundme.com/f/humus-sapiens"
    },
    {
      title: "Costruiamo insieme il sistema",
      body: "Ogni contributo sostiene infrastrutture leggere, formazione, apiario e progetti di agricoltura sociale che restano nel territorio.",
      cta: "Apri GoFundMe",
      url: "https://www.gofundme.com/f/humus-sapiens"
    }
  ],
  en: [
    {
      title: "Support the future of the farm",
      body: "GoFoundMe campaigns help finance soil regeneration, biodiversity and welcoming spaces for people and communities.",
      cta: "Discover the campaign",
      url: "https://www.gofundme.com/f/humus-sapiens"
    },
    {
      title: "Building the system together",
      body: "Every contribution supports light infrastructure, training, the apiary and social farming projects that stay in the territory.",
      cta: "Open GoFundMe",
      url: "https://www.gofundme.com/f/humus-sapiens"
    }
  ]
};

export default function GoFoundMe() {
  const { lang } = useLang();
  const items = CAMPAIGNS[lang] ?? CAMPAIGNS.it;

  return (
    <section id="gofoundme" data-testid="gofoundme-section" className="relative bg-[#1A3626] py-28 md:py-40">
      <div className="mx-auto max-w-[1500px] px-6 md:px-10">
        <Reveal className="mb-14 md:mb-20" y={20}>
          <span className="block font-mono-label text-xs tracking-label text-[#D48924] mb-8 md:mb-12">GoFoundMe · Campaigns</span>
          <h2 className="font-display font-light text-[#F5F3E9] text-[min(8vw,5.6rem)] leading-[0.95]">
            <RevealWords text={lang === "it" ? "Sostieni il progetto" : "Support the project"} />
            <span className="italic block text-[#d7e3d7]">
              <RevealWords text={lang === "it" ? "con una donazione" : "with a donation"} />
            </span>
          </h2>
          <p className="mt-8 max-w-2xl font-body text-lg md:text-xl leading-relaxed text-[#F5F3E9]/80">
            {lang === "it"
              ? "Le campagne GoFoundMe sono il canale diretto per sostenere il fondo, la formazione e la rigenerazione del territorio."
              : "GoFoundMe campaigns are the direct channel for supporting the farm, training and the regeneration of the territory."}
          </p>
        </Reveal>

        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item, index) => (
            <Reveal key={item.title} y={24} delay={index * 0.08}>
              <div className="rounded-3xl border border-[#F5F3E9]/15 bg-[#F5F3E9] p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                <h3 className="font-display text-2xl md:text-3xl text-[#1A3626]">{item.title}</h3>
                <p className="mt-4 font-body text-base leading-relaxed text-[#1A3626]/70">{item.body}</p>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 inline-flex items-center rounded-full bg-[#1A3626] px-5 py-3 text-sm font-medium text-[#F5F3E9] transition hover:bg-[#2f4c3a]"
                >
                  {item.cta}
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
