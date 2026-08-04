import { renderToStaticMarkup } from "react-dom/server";
import { LangProvider } from "../lib/i18n";

// react-markdown and its unified/micromark tree ship ESM only, and CRA's Jest
// setup does not transform node_modules. These tests are about the newsletter
// form, not about rendering article bodies, so the markdown renderer is stubbed
// rather than dragging the whole ESM chain into the test run.
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }) => children,
}));
jest.mock("remark-gfm", () => ({ __esModule: true, default: () => {} }));

// eslint-disable-next-line import/first
import Blog from "./Blog";

const render = () =>
  renderToStaticMarkup(
    <LangProvider>
      <Blog />
    </LangProvider>
  );

describe("Blog", () => {
  it("renders the Radici section with its newsletter form", () => {
    const html = render();

    expect(html).toContain('data-testid="blog-section"');
    expect(html).toContain('data-testid="newsletter-email"');
    expect(html).toContain('data-testid="newsletter-subscribe"');
  });

  it("subscribing does not fall back to a mailto link", () => {
    const html = render();

    // Subscriptions belong in the customers table, not in someone's outbox:
    // a mailto also silently fails for anyone without a mail client set up.
    expect(html).not.toContain("Iscrizione newsletter Radici");
    expect(html).not.toMatch(/href="mailto:[^"]*Radici/);
  });
});
