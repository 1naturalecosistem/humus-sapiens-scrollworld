import { renderToStaticMarkup } from "react-dom/server";
import Prenota from "./Prenota";
import { LangProvider } from "../lib/i18n";

describe("Prenota", () => {
  it("renders the booking section with direct booking calls to action", () => {
    const html = renderToStaticMarkup(
      <LangProvider>
        <Prenota />
      </LangProvider>
    );

    expect(html).toContain("data-testid=\"prenota-section\"");
    expect(html).toContain("data-testid=\"booking-contact-link\"");
    expect(html).toContain("Prenotazione diretta · CIN IT010013B5EKQITTKX");
  });
});
