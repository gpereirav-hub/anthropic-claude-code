import { describe, it, expect } from "vitest";
import { dataUrlToImageSource } from "../ai";
import { analysisContext } from "../context";
import { analyzeParlay } from "../analyze";
import { sampleLegs, defaultSettings } from "../../state";

describe("dataUrlToImageSource", () => {
  it("parses a png data URL", () => {
    const src = dataUrlToImageSource("data:image/png;base64,AAAB");
    expect(src.media_type).toBe("image/png");
    expect(src.data).toBe("AAAB");
  });

  it("normalizes jpg to image/jpeg", () => {
    expect(dataUrlToImageSource("data:image/jpg;base64,ZZ").media_type).toBe("image/jpeg");
  });

  it("accepts webp and gif", () => {
    expect(dataUrlToImageSource("data:image/webp;base64,WW").media_type).toBe("image/webp");
    expect(dataUrlToImageSource("data:image/gif;base64,GG").media_type).toBe("image/gif");
  });

  it("rejects non-image or malformed data URLs", () => {
    expect(() => dataUrlToImageSource("data:application/pdf;base64,AA")).toThrow();
    expect(() => dataUrlToImageSource("not-a-data-url")).toThrow();
  });
});

describe("analysisContext", () => {
  it("produces a factual summary the chatbot can ground on", () => {
    const a = analyzeParlay(sampleLegs(), [], defaultSettings);
    const ctx = analysisContext(a, "american");
    expect(ctx).toContain("Verdict:");
    expect(ctx).toContain("Parlay EV");
    expect(ctx).toContain("Legs:");
    // Every active leg should be listed.
    for (const l of a.legs) expect(ctx).toContain(l.leg.selection);
    // No raw template artifacts / undefineds leaked in.
    expect(ctx).not.toContain("undefined");
    expect(ctx).not.toContain("NaN");
  });
});
