import "@/App.css";
import { LangProvider } from "@/lib/i18n";
import SmoothScroll from "@/components/SmoothScroll";
import BeeFollower from "@/components/BeeFollower";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import EsploraIlTerritorio from "@/components/ScrollWorld/EsploraIlTerritorio";
import ChiSiamo from "@/components/ChiSiamo";
import Agricampeggio from "@/components/Agricampeggio";
import Prenota from "@/components/Prenota";
import BeeHumus from "@/components/BeeHumus";
import Shop from "@/components/Shop";
import RAccolti from "@/components/RAccolti";
import IlLuogo from "@/components/IlLuogo";
import Blog from "@/components/Blog";
import Contatti from "@/components/Contatti";

function App() {
  return (
    <LangProvider>
      <SmoothScroll>
        <div className="App relative bg-[#F5F3E9]">
          <div className="grain-overlay" aria-hidden="true" />
          <BeeFollower />
          <Header />
          <main>
            <Hero />
            <EsploraIlTerritorio />
            <ChiSiamo />
            <Agricampeggio />
            <Prenota />
            <BeeHumus />
            <Shop />
            <RAccolti />
            <IlLuogo />
            <Blog />
            <Contatti />
          </main>
        </div>
      </SmoothScroll>
    </LangProvider>
  );
}

export default App;
