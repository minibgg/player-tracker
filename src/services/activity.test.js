import { describe, it, expect } from "vitest";
import {
  startSession,
  updateSession,
  getPlayStats,
  getRecentPlayStats,
  getWeeklyHeatmap,
  formatPlayTime,
  startOfDay,
} from "./activity";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
// Tuesday 13 Oct 2026, 20:00 local time
const NOW = new Date(2026, 9, 13, 20, 0).getTime();

const session = (matchId, start, minutes, win = null) => ({
  matchId,
  start,
  end: minutes === null ? null : start + minutes * MIN,
  queueId: 420,
  championId: 103,
  win,
});

describe("startSession / updateSession", () => {
  it("adds a session once per match", () => {
    let sessions = startSession([], { matchId: "A", start: NOW }, NOW);
    sessions = startSession(sessions, { matchId: "A", start: NOW }, NOW);
    expect(sessions).toHaveLength(1);
    expect(sessions[0]).toMatchObject({ matchId: "A", end: null, win: null });
  });

  it("drops sessions older than 60 days", () => {
    const old = session("OLD", NOW - 61 * DAY, 30);
    const sessions = startSession([old], { matchId: "NEW", start: NOW }, NOW);
    expect(sessions.map((s) => s.matchId)).toEqual(["NEW"]);
  });

  it("merges a patch into the matching session only", () => {
    const sessions = [session("A", NOW, null), session("B", NOW, null)];
    const updated = updateSession(sessions, "A", { end: NOW + HOUR, win: true });
    expect(updated[0]).toMatchObject({ end: NOW + HOUR, win: true });
    expect(updated[1].end).toBeNull();
  });
});

describe("getPlayStats", () => {
  it("sums time and counts games, wins and losses in the window", () => {
    const sessions = [
      session("A", NOW - 3 * HOUR, 30, true),
      session("B", NOW - 2 * HOUR, 40, false),
      session("C", NOW - 2 * DAY, 30, true), // outside the window
    ];
    expect(getPlayStats(sessions, NOW - 5 * HOUR, NOW)).toEqual({
      ms: 70 * MIN,
      games: 2,
      wins: 1,
      losses: 1,
    });
  });

  it("clips a session that started before the window", () => {
    const sessions = [session("A", NOW - 70 * MIN, 40)];
    expect(getPlayStats(sessions, NOW - HOUR, NOW)).toMatchObject({
      ms: 30 * MIN,
      games: 0,
    });
  });

  it("counts an open game up to now but caps a stale one at 90 minutes", () => {
    expect(
      getPlayStats([session("LIVE", NOW - 20 * MIN, null)], NOW - DAY, NOW).ms,
    ).toBe(20 * MIN);
    expect(
      getPlayStats([session("STALE", NOW - 5 * HOUR, null)], NOW - DAY, NOW)
        .ms,
    ).toBe(90 * MIN);
  });
});

describe("getRecentPlayStats", () => {
  it("splits today from the last 7 days", () => {
    const sessions = [
      session("TODAY", startOfDay(NOW) + 10 * HOUR, 30, true),
      session("YESTERDAY", startOfDay(NOW) - 5 * HOUR, 30, false),
    ];
    const { today, week } = getRecentPlayStats(sessions, NOW);
    expect(today).toMatchObject({ games: 1, wins: 1 });
    expect(week).toMatchObject({ games: 2, wins: 1, losses: 1 });
  });
});

describe("getWeeklyHeatmap", () => {
  it("buckets games by weekday (Monday first) and hour", () => {
    const tuesday21 = new Date(2026, 9, 13, 21, 15).getTime();
    const sunday9 = new Date(2026, 9, 11, 9, 0).getTime();
    const grid = getWeeklyHeatmap([
      session("A", tuesday21, 30),
      session("B", tuesday21 + 10 * MIN, 30),
      session("C", sunday9, 30),
    ]);
    expect(grid).toHaveLength(7);
    expect(grid[1][21]).toBe(2);
    expect(grid[6][9]).toBe(1);
    expect(grid.flat().reduce((a, b) => a + b, 0)).toBe(3);
  });
});

describe("formatPlayTime", () => {
  it("formats minutes and hours", () => {
    expect(formatPlayTime(0)).toBe("0 мин");
    expect(formatPlayTime(45 * MIN)).toBe("45 мин");
    expect(formatPlayTime(2 * HOUR)).toBe("2 ч");
    expect(formatPlayTime(2 * HOUR + 15 * MIN)).toBe("2 ч 15 мин");
  });
});
