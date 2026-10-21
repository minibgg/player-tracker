import { describe, it, expect } from "vitest";
import {
  getMatchResult,
  getTrackerKind,
  formatApexResult,
  isSameMatch,
} from "./apexMatch";

const gold = (score, div = 2) => ({ name: "Gold", div, score, season: "s1" });
const wraith = (kills, damage, wins) => ({
  wraith: {
    name: "Wraith",
    trackers: [
      { key: "kills", name: "BR Kills", value: kills },
      { key: "damage", name: "BR Damage", value: damage },
      { key: "wins", name: "BR Wins", value: wins },
    ],
  },
});

const pending = (baseline) => ({
  matchKey: 1000,
  legend: "Wraith",
  startedAt: 0,
  endedAt: 18 * 60 * 1000,
  baseline,
});

const before = {
  rank: gold(6400),
  level: 100,
  xpPercent: 40,
  legends: wraith(50, 9000, 3),
};

describe("getMatchResult", () => {
  it("measures kills, damage, win and RP against the baseline", () => {
    const after = {
      rank: gold(6445),
      level: 100,
      xpPercent: 52,
      legends: wraith(55, 10204, 4),
    };
    expect(getMatchResult(pending(before), after)).toMatchObject({
      counted: true,
      win: true,
      kills: 5,
      damage: 1204,
      rpChange: 45,
      tierChange: null,
      duration: 18 * 60,
    });
  });

  it("is not counted while the API still shows pre-match numbers", () => {
    const result = getMatchResult(pending(before), { ...before });
    expect(result.counted).toBe(false);
    expect(result.win).toBeNull();
    expect(result.kills).toBeNull();
  });

  it("reports zero for trackers that did not move once counted", () => {
    const after = { ...before, xpPercent: 45 };
    expect(getMatchResult(pending(before), after)).toMatchObject({
      counted: true,
      win: false,
      kills: 0,
      damage: 0,
      rpChange: null,
    });
  });

  it("leaves win unknown without a wins tracker", () => {
    const legends = {
      wraith: { name: "Wraith", trackers: [{ key: "kills", name: "Kills", value: 1 }] },
    };
    const after = {
      ...before,
      legends: {
        wraith: { name: "Wraith", trackers: [{ key: "kills", name: "Kills", value: 3 }] },
      },
    };
    const result = getMatchResult(pending({ ...before, legends }), after);
    expect(result.win).toBeNull();
    expect(result.kills).toBe(2);
  });

  it("names a promotion", () => {
    const after = { ...before, rank: gold(6520, 1) };
    expect(getMatchResult(pending(before), after).tierChange).toBe(
      "повышение: Gold I",
    );
  });
});

describe("getTrackerKind", () => {
  it("knows the match totals and skips the rest", () => {
    expect(getTrackerKind({ key: "kills" })).toBe("kills");
    expect(getTrackerKind({ key: "br_damage" })).toBe("damage");
    expect(getTrackerKind({ key: "specialEvent_wins" })).toBe("wins");
    expect(getTrackerKind({ key: "kills_season_19" })).toBe("kills");
    expect(getTrackerKind({ key: "shotgun_kills" })).toBeNull();
    expect(getTrackerKind({ key: "kd" })).toBeNull();
    expect(getTrackerKind({ key: "x", name: "BR Kills" })).toBe("kills");
  });
});

describe("formatApexResult", () => {
  it("joins what is known", () => {
    expect(
      formatApexResult({
        counted: true,
        win: true,
        legend: "Wraith",
        kills: 5,
        damage: 1204,
        duration: 1080,
        rpChange: -12,
        tierChange: null,
      }),
    ).toBe("Победа · Wraith · 5 убийств · 1 204 урона · 18 мин · −12 RP");
  });

  it("says so when the stats never updated", () => {
    expect(
      formatApexResult({
        counted: false,
        win: null,
        legend: "Lifeline",
        kills: null,
        damage: null,
        duration: 30,
        rpChange: null,
      }),
    ).toBe("Lifeline · 1 мин · статистика не обновилась");
  });
});

describe("isSameMatch", () => {
  it("tolerates a jittery start time", () => {
    expect(isSameMatch(1_000_000, 1_030_000)).toBe(true);
    expect(isSameMatch(1_000_000, 1_000_000 + 5 * 60_000)).toBe(false);
  });
});
