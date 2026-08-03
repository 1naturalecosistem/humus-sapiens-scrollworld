import { renderToStaticMarkup } from "react-dom/server";
import Prenota from "./Prenota";
import { LangProvider } from "../lib/i18n";

describe("Prenota", () => {
  it("renders the booking section and a visible booking widget container", () => {
    const html = renderToStaticMarkup(
      <LangProvider>
        <Prenota />
      </LangProvider>
    );

    expect(html).toContain("data-testid=\"prenota-section\"");
    expect(html).toContain("data-testid=\"booking-widget\"");
    expect(html).toContain("Prenotazione diretta · CIN IT010013B5EKQITTKX");
  });
});
