import { renderToStaticMarkup } from "react-dom/server";
import Prenota from "./Prenota";
import { LangProvider } from "../lib/i18n";

const render = () =>
  renderToStaticMarkup(
    <LangProvider>
      <Prenota />
    </LangProvider>
  );

describe("Prenota", () => {
  it("renders the booking section with direct booking calls to action", () => {
    const html = render();

    expect(html).toContain('data-testid="prenota-section"');
    expect(html).toContain('data-testid="booking-contact-link"');
    expect(html).toContain("Prenotazione diretta · CIN IT010013B5EKQITTKX");
  });

  it("renders the booking form with every field the API requires", () => {
    const html = render();

    expect(html).toContain('data-testid="booking-form"');
    [
      "field-room",
      "field-check-in",
      "field-check-out",
      "field-adults",
      "field-children",
      "field-first-name",
      "field-last-name",
      "field-email",
      "field-phone",
      "field-privacy",
      "submit-booking",
    ].forEach((testId) => {
      expect(html).toContain(`data-testid="${testId}"`);
    });
  });

  it("offers both villas and marks the agricampeggio as not yet bookable", () => {
    const html = render();

    expect(html).toContain('value="villa-levante"');
    expect(html).toContain('value="villa-ponente"');
    // The pitch is in the catalogue but must not be selectable until it opens.
    expect(html).toMatch(/value="piazzola-food-forest"[^>]*disabled/);
  });

  it("shows the villa rate so the estimate matches what the server will charge", () => {
    const html = render();

    expect(html).toContain("€ 300/notte");
  });
});
