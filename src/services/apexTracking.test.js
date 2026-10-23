import { describe, it, expect } from "vitest";
import {
  createApexPlayer,
  applyApexSnapshot,
  RESULT_WAIT_MS,
} from "./apexTracking";

const MIN = 60 * 1000;
const T0 = 1_760_000_000_000;

const snap = (overrides = {}) => ({
  uid: "42",
  name: "Caustic_Fan",
  level: 100,
  xpPercent: 40,
  isBanned: false,
  rank: { name: "Gold", div: 2, score: 6400, season: "s1" },
  presence: "IN_LOBBY",
  stateSince: T0 - 10 * MIN,
  legend: "Wraith",
  legends: {
    wraith: {
      name: "Wraith",
      trackers: [{ key: "kills", name: "BR Kills", value: 50 }],
    },
  },
  legendAssets: {},
  ...overrides,
});

const inMatch = (since, overrides = {}) =>
  snap({ presence: "IN_GAME", stateSince: since, ...overrides });

// Applies a snapshot and returns the updated player plus the event types
const step = (player, snapshot, now) => {
  const { patch, events } = applyApexSnapshot(player, snapshot, now);
  return { player: { ...player, ...patch }, events: events.map((e) => e.type), raw: events };
};

const added = (snapshot = snap(), now = T0) =>
  createApexPlayer(snapshot, { id: "p1", platform: "PC" }, now);

describe("createApexPlayer", () => {
  it("starts a session for a player added mid-match", () => {
    const p = added(inMatch(T0 - 5 * MIN));
    expect(p.status).toBe("IN_GAME");
    expect(p.currentGame.gameStartTime).toBe(T0 - 5 * MIN);
    expect(p.sessions).toHaveLength(1);
    expect(p.statusHistory[0].message).toBe("Добавлен (в матче)");
  });
});

describe("applyApexSnapshot", () => {
  it("announces going online, but not on every poll", () => {
    let p = added(snap({ presence: "OFFLINE" }));
    let r = step(p, snap(), T0 + MIN);
    expect(r.events).toEqual(["ONLINE"]);
    r = step(r.player, snap(), T0 + 2 * MIN);
    expect(r.events).toEqual([]);
  });

  it("follows a match from start to counted result", () => {
    let r = step(added(), inMatch(T0 + MIN), T0 + 2 * MIN);
    expect(r.events).toEqual(["GAME_START"]);
    expect(r.player.currentGame.gameStartTime).toBe(T0 + MIN);

    // Legend picked after the match started; still the same match
    r = step(r.player, inMatch(T0 + MIN, { legend: "Bangalore" }), T0 + 3 * MIN);
    expect(r.events).toEqual([]);
    expect(r.player.currentGame.legend).toBe("Bangalore");

    // Back in the lobby, stats not updated yet: wait for them
    const lobby = snap({ stateSince: T0 + 15 * MIN, legend: "Bangalore" });
    r = step(r.player, lobby, T0 + 16 * MIN);
    expect(r.events).toEqual(["GAME_END"]);
    expect(r.player.pendingResult.endedAt).toBe(T0 + 15 * MIN);
    expect(r.player.sessions[0].end).toBe(T0 + 15 * MIN);
    expect(r.player.status).toBe("IN_LOBBY");

    // Counted on the next poll
    const counted = snap({
      stateSince: T0 + 15 * MIN,
      legend: "Bangalore",
      xpPercent: 55,
      rank: { name: "Gold", div: 2, score: 6430, season: "s1" },
    });
    r = step(r.player, counted, T0 + 17 * MIN);
    expect(r.events).toEqual(["MATCH_RESULT"]);
    expect(r.player.pendingResult).toBeNull();
    expect(r.player.lastMatchResult).toMatchObject({
      legend: "Bangalore",
      counted: true,
      rpChange: 30,
      duration: 14 * 60,
    });
    expect(r.player.matchLog).toHaveLength(1);
  });

  it("measures RP from before the match", () => {
    let r = step(added(), inMatch(T0 + MIN), T0 + 2 * MIN);
    // Entry cost taken at the start of the match
    const paid = { name: "Gold", div: 2, score: 6365, season: "s1" };
    r = step(r.player, inMatch(T0 + MIN, { rank: paid }), T0 + 5 * MIN);
    const after = { name: "Gold", div: 2, score: 6420, season: "s1" };
    r = step(r.player, snap({ rank: after, xpPercent: 60 }), T0 + 20 * MIN);
    expect(r.events).toEqual(["GAME_END", "MATCH_RESULT"]);
    expect(r.player.lastMatchResult.rpChange).toBe(20);
  });

  it("gives up waiting for the stats after a while", () => {
    let r = step(added(), inMatch(T0 + MIN), T0 + 2 * MIN);
    r = step(r.player, snap({ stateSince: T0 + 10 * MIN }), T0 + 11 * MIN);
    r = step(r.player, snap({ stateSince: T0 + 10 * MIN }), T0 + 10 * MIN + RESULT_WAIT_MS + 1);
    // Recorded quietly: no alert for a result without numbers
    expect(r.events).toEqual([]);
    expect(r.player.pendingResult).toBeNull();
    expect(r.player.lastMatchResult.counted).toBe(false);
  });

  it("notices a new match started between two polls", () => {
    let r = step(added(), inMatch(T0 + MIN), T0 + 2 * MIN);
    // XP only moves after a match: the last one ended, this is a new one
    r = step(r.player, inMatch(T0 + 5 * MIN, { xpPercent: 50 }), T0 + 6 * MIN);
    expect(r.events).toEqual(["GAME_END", "MATCH_RESULT", "GAME_START"]);
    expect(r.player.currentGame.gameStartTime).toBe(T0 + 5 * MIN);
    expect(r.player.sessions).toHaveLength(2);
  });

  it("logs matches it never saw, without alerts", () => {
    // Lobby, then lobby again 3 hours later with RP and XP moved
    let r = step(added(), snap(), T0 + MIN);
    const later = snap({
      xpPercent: 80,
      rank: { name: "Gold", div: 2, score: 6350, season: "s1" },
    });
    r = step(r.player, later, T0 + 3 * 60 * MIN);
    expect(r.events).toEqual([]);
    expect(r.player.matchLog[0]).toMatchObject({
      kind: "unseen",
      rpChange: -50,
      startedAt: T0 + MIN,
    });
    expect(r.player.statusHistory[0].message).toBe("Итог: Вне наблюдения · −50 RP");
  });

  it("marks a result unseen when the polls around it were far apart", () => {
    let r = step(added(), inMatch(T0 + MIN), T0 + 2 * MIN);
    r = step(r.player, snap({ xpPercent: 90 }), T0 + 2 * 60 * MIN);
    expect(r.events).toEqual([]);
    expect(r.player.lastMatchResult.kind).toBe("unseen");
  });

  it("doesn't take a match the API kept open for hours for a real one", () => {
    let r = step(added(), inMatch(null), T0 + MIN);
    for (let t = T0 + 30 * MIN; t <= T0 + 4 * 60 * MIN; t += 30 * MIN) {
      r = step(r.player, inMatch(null), t);
    }
    const paid = { name: "Gold", div: 2, score: 6390, season: "s1" };
    r = step(r.player, snap({ presence: "OFFLINE", stateSince: null, rank: paid }), T0 + 4 * 60 * MIN + MIN);
    expect(r.events).toEqual([]);
    expect(r.player.status).toBe("OFFLINE");
    expect(r.player.lastMatchResult).toMatchObject({ kind: "unseen", rpChange: -10 });
  });

  it("takes XP right after a match started for the previous match's", () => {
    // RP of matches it never saw arrives first, their XP a poll later
    let r = step(added(), snap(), T0 + MIN);
    const rp = { name: "Gold", div: 2, score: 6700, season: "s1" };
    r = step(r.player, inMatch(null, { rank: rp }), T0 + 2 * 60 * MIN);
    expect(r.events).toEqual(["GAME_START"]);
    r = step(r.player, inMatch(null, { rank: rp, xpPercent: 90 }), T0 + 2 * 60 * MIN + 30_000);
    expect(r.events).toEqual([]);
    expect(r.player.sessions).toHaveLength(1);
    expect(r.player.matchLog).toHaveLength(1);
  });

  it("keeps a log of RP over time", () => {
    const rank = (score) => ({ name: "Gold", div: 2, score, season: "s1" });
    let r = step(added(), snap(), T0 + MIN);
    r = step(r.player, snap(), T0 + 2 * MIN);
    r = step(r.player, snap({ rank: rank(6450) }), T0 + 3 * MIN);
    expect(r.player.rpLog).toEqual([
      { at: T0, score: 6400, season: "s1" },
      { at: T0 + 3 * MIN, score: 6450, season: "s1" },
    ]);
  });

  it("ignores a since that is just the time of each request", () => {
    // Some players get "since = now" on every poll; a 5-minute interval
    // must not look like a new match each time
    let r = step(added(), inMatch(T0 + 2 * MIN), T0 + 2 * MIN);
    expect(r.player.currentGame.gameStartTime).toBe(T0 + 2 * MIN);
    r = step(r.player, inMatch(T0 + 7 * MIN), T0 + 7 * MIN);
    r = step(r.player, inMatch(T0 + 12 * MIN), T0 + 12 * MIN);
    expect(r.events).toEqual([]);
    expect(r.player.currentGame.gameStartTime).toBe(T0 + 2 * MIN);
    expect(r.player.sessions).toHaveLength(1);
  });

  it("trusts a since two polls agree on, and corrects the clock with it", () => {
    // 20 s old: could still be the request time, so not trusted yet
    let r = step(added(), inMatch(T0 + 40_000), T0 + MIN);
    expect(r.player.currentGame.gameStartTime).toBe(T0 + MIN);
    r = step(r.player, inMatch(T0 + 40_000), T0 + 2 * MIN);
    expect(r.player.currentGame.gameStartTime).toBe(T0 + 40_000);
    expect(r.player.sessions[0].start).toBe(T0 + 40_000);

    // A trusted since that jumps means a new match, even without XP news
    r = step(r.player, inMatch(T0 + 40_000), T0 + 14 * MIN);
    r = step(r.player, inMatch(T0 + 25 * MIN), T0 + 26 * MIN);
    expect(r.events).toEqual(["GAME_END", "GAME_START"]);
    expect(r.player.sessions).toHaveLength(2);
  });

  it("leaves late XP of a waiting result to that result", () => {
    let r = step(added(), inMatch(T0 + MIN), T0 + 2 * MIN);
    r = step(r.player, snap({ stateSince: T0 + 10 * MIN }), T0 + 11 * MIN);
    expect(r.player.pendingResult).not.toBeNull();
    // Next match; the API counts the previous one only now
    r = step(r.player, inMatch(T0 + 12 * MIN), T0 + 13 * MIN);
    expect(r.events).toEqual(["GAME_START"]);
    r = step(r.player, inMatch(T0 + 12 * MIN, { xpPercent: 70 }), T0 + 14 * MIN);
    expect(r.events).toEqual(["MATCH_RESULT"]);
    expect(r.player.status).toBe("IN_GAME");
    expect(r.player.sessions).toHaveLength(2);
  });

  it("logs going offline from the lobby", () => {
    const r = step(added(), snap({ presence: "OFFLINE", stateSince: null }), T0 + MIN);
    expect(r.player.statusHistory[0].message).toBe("Вышел из сети");
    expect(r.events).toEqual([]);
  });

  it("keeps the old name when the API sends none", () => {
    const r = step(added(), snap({ name: "" }), T0 + MIN);
    expect(r.player.name).toBe("Caustic_Fan");
  });
});
