import { renderToStaticMarkup } from "react-dom/server";
import Shop from "./Shop";
import { LangProvider } from "../lib/i18n";

describe("Shop", () => {
  it("renders the store experience with purchasing, donation, and booking actions", () => {
    const html = renderToStaticMarkup(
      <LangProvider>
        <Shop />
      </LangProvider>
    );

    expect(html).toContain("Pagamento diretto");
    expect(html).toContain("Dona su GoFundMe");
    expect(html).toContain("Verifica disponibilità");
    expect(html).toContain("Ordina direttamente via email");
  });
});
