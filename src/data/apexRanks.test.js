import { describe, it, expect } from "vitest";
import { formatApexTier, formatApexRank, getRpChange } from "./apexRanks";

const rank = (name, div, score, extra = {}) => ({
  name,
  div,
  score,
  season: "s1",
  ladderPos: -1,
  ...extra,
});

describe("formatApexTier", () => {
  it("shows divisions as roman numerals, none for the top tiers", () => {
    expect(formatApexTier(rank("Gold", 2, 0))).toBe("Gold II");
    expect(formatApexTier(rank("Master", 0, 0))).toBe("Master");
    expect(
      formatApexTier(rank("Apex Predator", 0, 0, { ladderPos: 45 })),
    ).toBe("Apex Predator #45");
  });

  it("formats RP with a thousands separator", () => {
    expect(formatApexRank(rank("Platinum", 4, 12000))).toBe(
      "Platinum IV · 12 000 RP",
    );
  });
});

describe("getRpChange", () => {
  it("returns the difference within one season", () => {
    expect(getRpChange(rank("Gold", 2, 6400), rank("Gold", 2, 6445))).toEqual({
      rp: 45,
      tierChange: null,
    });
  });

  it("names promotions and demotions", () => {
    expect(
      getRpChange(rank("Gold", 1, 7900), rank("Platinum", 4, 8010)).tierChange,
    ).toBe("повышение: Platinum IV");
    expect(
      getRpChange(rank("Gold", 4, 5000), rank("Silver", 1, 4980)).tierChange,
    ).toBe("понижение: Silver I");
  });

  it("is empty for pubs, unranked players and a new season", () => {
    const none = { rp: null, tierChange: null };
    expect(getRpChange(rank("Gold", 2, 6400), rank("Gold", 2, 6400))).toEqual(none);
    expect(getRpChange(null, rank("Gold", 2, 6400))).toEqual(none);
    expect(getRpChange(rank("Unranked", 0, 0), rank("Rookie", 4, 10))).toEqual(none);
    expect(
      getRpChange(rank("Gold", 2, 6400), rank("Rookie", 4, 0, { season: "s2" })),
    ).toEqual(none);
  });
});
