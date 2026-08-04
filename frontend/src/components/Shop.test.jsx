import { renderToStaticMarkup } from "react-dom/server";
import Shop from "./Shop";
import { LangProvider } from "../lib/i18n";

const render = () =>
  renderToStaticMarkup(
    <LangProvider>
      <Shop />
    </LangProvider>
  );

describe("Shop", () => {
  it("renders the store experience with purchasing, donation, and booking actions", () => {
    const html = render();

    expect(html).toContain("Dona su GoFundMe");
    expect(html).toContain("Verifica disponibilità");
    expect(html).toContain("Vai al catalogo");
  });

  it("orders run through the management system, not a mailto", () => {
    const html = render();

    expect(html).toContain('data-testid="order-form"');
    expect(html).toContain('data-testid="submit-order"');
    // The old flow handed the order to the visitor's mail client, which left
    // no record anywhere. Nothing in the shop may go back to that.
    expect(html).not.toContain("Ordina direttamente via email");
    expect(html).not.toContain("Scrivici per un ordine");
  });

  it("renders every honey size as an addable line", () => {
    const html = render();

    ["castagno-250g", "castagno-500g", "castagno-1kg",
     "millefiori-250g", "millefiori-500g", "millefiori-1kg"].forEach((sku) => {
      expect(html).toContain(`data-testid="add-${sku}"`);
    });
  });

  it("collects what an order needs: contact details, delivery choice and consent", () => {
    const html = render();

    [
      "order-first-name",
      "order-last-name",
      "order-email",
      "order-privacy",
      "delivery-pickup",
      "delivery-shipping",
    ].forEach((testId) => {
      expect(html).toContain(`data-testid="${testId}"`);
    });
  });

  it("starts with an empty cart and a zero total", () => {
    const html = render();

    expect(html).toContain("Il carrello è vuoto");
    expect(html).toMatch(/data-testid="cart-total"[^>]*>€\s*0,00</);
  });
});
