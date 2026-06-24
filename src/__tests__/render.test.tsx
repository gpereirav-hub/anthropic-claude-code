import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import App from "../App";

// A lightweight render smoke test: if any component throws on its initial
// render (bad hook usage, undefined access, a broken chart prop), this fails.
describe("App renders", () => {
  it("mounts the full tree without throwing", () => {
    const html = renderToString(createElement(App));
    expect(html).toContain("Parlay Analyzer");
    // Verdict and core panels should be present with the default sample parlay.
    expect(html.toLowerCase()).toContain("ev");
    expect(html).toContain("Bankroll");
  });
});
