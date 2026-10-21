import { describe, it, expect } from "vitest";
import {
  DEFAULT_ALERT_RULES,
  getQueueCategory,
  parseChampionList,
  isQuietTime,
  shouldAlert,
  shouldAlertApex,
} from "./alertRules";

const at = (hours, minutes = 0) => new Date(2026, 9, 13, hours, minutes);
const ahri = { id: "Ahri", name: "Ahri" };
const wukong = { id: "MonkeyKing", name: "Wukong" };

const alert = (overrides = {}) =>
  shouldAlert({
    kind: "start",
    player: { isMuted: false },
    queueId: 420,
    champion: ahri,
    rules: DEFAULT_ALERT_RULES,
    now: at(15),
    ...overrides,
  });

describe("getQueueCategory", () => {
  it("maps queues to the categories shown in settings", () => {
    expect(getQueueCategory(420)).toBe("RANKED");
    expect(getQueueCategory(440)).toBe("RANKED");
    expect(getQueueCategory(400)).toBe("NORMAL");
    expect(getQueueCategory(450)).toBe("ARAM");
    expect(getQueueCategory(1700)).toBe("OTHER");
    expect(getQueueCategory(0)).toBe("OTHER");
    expect(getQueueCategory(99999)).toBe("OTHER");
  });
});

describe("parseChampionList", () => {
  it("splits on commas and drops blanks", () => {
    expect(parseChampionList(" Ahri, Lee Sin ,, ")).toEqual(["Ahri", "Lee Sin"]);
    expect(parseChampionList("")).toEqual([]);
  });
});

describe("isQuietTime", () => {
  const night = { enabled: true, from: "23:00", to: "08:00" };

  it("wraps past midnight", () => {
    expect(isQuietTime(at(23, 30), night)).toBe(true);
    expect(isQuietTime(at(3), night)).toBe(true);
    expect(isQuietTime(at(8), night)).toBe(false);
    expect(isQuietTime(at(15), night)).toBe(false);
  });

  it("handles a same-day range", () => {
    const work = { enabled: true, from: "09:00", to: "18:00" };
    expect(isQuietTime(at(9), work)).toBe(true);
    expect(isQuietTime(at(18), work)).toBe(false);
  });

  it("is off when disabled or the range is empty", () => {
    expect(isQuietTime(at(3), { ...night, enabled: false })).toBe(false);
    expect(
      isQuietTime(at(3), { enabled: true, from: "10:00", to: "10:00" }),
    ).toBe(false);
  });
});

describe("shouldAlert", () => {
  it("alerts by default", () => {
    expect(alert()).toBe(true);
  });

  it("stays quiet for muted players", () => {
    expect(alert({ player: { isMuted: true } })).toBe(false);
  });

  it("only alerts on results when enabled", () => {
    expect(alert({ kind: "result" })).toBe(false);
    expect(
      alert({
        kind: "result",
        rules: { ...DEFAULT_ALERT_RULES, notifyResults: true },
      }),
    ).toBe(true);
  });

  it("filters by queue category", () => {
    const rankedOnly = { ...DEFAULT_ALERT_RULES, queueCategories: ["RANKED"] };
    expect(alert({ rules: rankedOnly })).toBe(true);
    expect(alert({ rules: rankedOnly, queueId: 450 })).toBe(false);
  });

  it("filters by champion, ignoring case, spaces and the id/name split", () => {
    const rules = { ...DEFAULT_ALERT_RULES, champions: ["ahri", "Monkey King"] };
    expect(alert({ rules })).toBe(true);
    expect(alert({ rules, champion: wukong })).toBe(true);
    expect(alert({ rules, champion: { id: "Zed", name: "Zed" } })).toBe(false);
  });

  it("stays quiet during quiet hours", () => {
    const rules = {
      ...DEFAULT_ALERT_RULES,
      quietHours: { enabled: true, from: "23:00", to: "08:00" },
    };
    expect(alert({ rules, now: at(2) })).toBe(false);
    expect(alert({ rules, now: at(12) })).toBe(true);
  });
});

describe("shouldAlertApex", () => {
  const apexAlert = (overrides = {}) =>
    shouldAlertApex({
      kind: "start",
      player: { isMuted: false },
      legend: "Mad Maggie",
      rules: DEFAULT_ALERT_RULES,
      now: at(15),
      ...overrides,
    });

  it("alerts on match start by default, never for muted players", () => {
    expect(apexAlert()).toBe(true);
    expect(apexAlert({ player: { isMuted: true } })).toBe(false);
  });

  it("alerts on going online only when asked to", () => {
    expect(apexAlert({ kind: "online" })).toBe(false);
    const rules = { ...DEFAULT_ALERT_RULES, apexNotifyOnline: true };
    expect(apexAlert({ kind: "online", rules })).toBe(true);
  });

  it("filters matches by legend, loosely", () => {
    const rules = { ...DEFAULT_ALERT_RULES, apexLegends: ["madmaggie", "Wraith"] };
    expect(apexAlert({ rules })).toBe(true);
    expect(apexAlert({ rules, legend: "Lifeline" })).toBe(false);
    // The lobby legend says nothing about the match
    expect(
      apexAlert({ rules: { ...rules, apexNotifyOnline: true }, kind: "online", legend: "Lifeline" }),
    ).toBe(true);
  });

  it("respects result alerts and quiet hours", () => {
    expect(apexAlert({ kind: "result" })).toBe(false);
    const rules = {
      ...DEFAULT_ALERT_RULES,
      quietHours: { enabled: true, from: "23:00", to: "08:00" },
    };
    expect(apexAlert({ rules, now: at(23, 30) })).toBe(false);
  });
});
