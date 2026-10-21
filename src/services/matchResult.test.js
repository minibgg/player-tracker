import { describe, it, expect } from "vitest";
import { getMatchId, getOutcomeLabel, formatMatchResult } from "./matchResult";

const result = (overrides = {}) => ({
  championId: 103, // Ahri, in the offline fallback list
  win: true,
  remake: false,
  placement: null,
  kills: 8,
  deaths: 2,
  assists: 11,
  duration: 1930,
  ...overrides,
});

describe("getMatchId", () => {
  it("joins the platform and game id the way Match-V5 does", () => {
    expect(getMatchId({ platformId: "EUW1", gameId: 7123456789 })).toBe(
      "EUW1_7123456789",
    );
  });

  it("returns null without a game", () => {
    expect(getMatchId(null)).toBeNull();
    expect(getMatchId({ gameId: 1 })).toBeNull();
  });
});

describe("getOutcomeLabel", () => {
  it("prefers remake, then Arena placement, then win/loss", () => {
    expect(getOutcomeLabel(result({ remake: true }))).toBe("Ремейк");
    expect(getOutcomeLabel(result({ placement: 3 }))).toBe("3 место");
    expect(getOutcomeLabel(result())).toBe("Победа");
    expect(getOutcomeLabel(result({ win: false }))).toBe("Поражение");
  });
});

describe("formatMatchResult", () => {
  it("builds a one-line summary with the LP change", () => {
    expect(formatMatchResult(result({ lpChange: "+18 LP" }))).toBe(
      "Победа · Ahri 8/2/11 · 32 мин · +18 LP",
    );
  });

  it("leaves the LP part out when unknown", () => {
    expect(formatMatchResult(result({ win: false }))).toBe(
      "Поражение · Ahri 8/2/11 · 32 мин",
    );
  });
});
