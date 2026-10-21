import { describe, it, expect } from "vitest";
import { formatTier, formatRank, formatRankDetails, getLpChange } from "./ranks";

const entry = (tier, rank, lp, wins = 10, losses = 10) => ({
  tier,
  rank,
  lp,
  wins,
  losses,
});

describe("rank formatting", () => {
  it("drops the division for apex tiers", () => {
    expect(formatTier(entry("GOLD", "II", 45))).toBe("GOLD II");
    expect(formatTier(entry("MASTER", "I", 280))).toBe("MASTER");
  });

  it("formats LP and win rate", () => {
    expect(formatRank(entry("GOLD", "II", 45))).toBe("GOLD II · 45 LP");
    expect(formatRankDetails(entry("GOLD", "II", 45, 30, 10))).toBe(
      "GOLD II · 45 LP · 30W 10L (75%)",
    );
  });
});

describe("getLpChange", () => {
  it("reports gains and losses within a division", () => {
    expect(
      getLpChange(entry("GOLD", "II", 45), entry("GOLD", "II", 63, 11, 10)),
    ).toBe("+18 LP");
    expect(
      getLpChange(entry("GOLD", "II", 45), entry("GOLD", "II", 30, 10, 11)),
    ).toBe("−15 LP");
  });

  it("reports promotions and demotions across divisions and tiers", () => {
    expect(
      getLpChange(entry("GOLD", "I", 90), entry("PLATINUM", "IV", 8, 11, 10)),
    ).toBe("повышение: PLATINUM IV");
    expect(
      getLpChange(entry("GOLD", "III", 5), entry("GOLD", "IV", 75, 10, 11)),
    ).toBe("понижение: GOLD IV");
  });

  it("compares raw LP between apex tiers", () => {
    expect(
      getLpChange(
        entry("MASTER", "I", 280),
        entry("GRANDMASTER", "I", 301, 11, 10),
      ),
    ).toBe("+21 LP");
  });

  it("returns null until Riot counts the game", () => {
    expect(
      getLpChange(entry("GOLD", "II", 45), entry("GOLD", "II", 45)),
    ).toBeNull();
  });

  it("handles placements and missing data", () => {
    expect(getLpChange(null, entry("SILVER", "II", 0, 5, 0))).toBe(
      "получен ранг: SILVER II",
    );
    expect(getLpChange(entry("GOLD", "II", 45), null)).toBeNull();
  });
});
