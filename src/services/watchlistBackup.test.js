import { describe, it, expect } from "vitest";
import {
  serializeWatchlist,
  parseWatchlistBackup,
  mergeImportedPlayers,
  parseApexBackup,
  mergeImportedApexPlayers,
} from "./watchlistBackup";

const player = (gameName, overrides = {}) => ({
  id: `id-${gameName}`,
  gameName,
  tagLine: "EUW",
  region: "euw1",
  puuid: "secret-puuid",
  profileIconId: 10,
  summonerLevel: 300,
  isPinned: true,
  isTracking: true,
  isMuted: false,
  status: "IN_GAME",
  currentGame: { gameId: 1 },
  pendingResult: { matchId: "EUW1_1" },
  statusHistory: [{ timestamp: 1, message: "x" }],
  sessions: [{ matchId: "EUW1_1", start: 1000, end: 2000 }],
  ...overrides,
});

describe("serializeWatchlist + parseWatchlistBackup", () => {
  it("round-trips what the user built up and resets live state", () => {
    const text = serializeWatchlist([player("Caps")], new Date(0));
    const [restored] = parseWatchlistBackup(text);

    expect(restored).toMatchObject({
      gameName: "Caps",
      tagLine: "EUW",
      region: "euw1",
      isPinned: true,
      status: "NOT_IN_GAME",
      currentGame: null,
      pendingResult: null,
      puuid: null,
    });
    expect(restored.statusHistory).toHaveLength(1);
    expect(restored.sessions).toHaveLength(1);
    expect(restored.id).toMatch(/^player-/);
  });

  it("never exports PUUIDs", () => {
    expect(serializeWatchlist([player("Caps")])).not.toContain("secret-puuid");
  });

  it("accepts a bare array and skips invalid entries", () => {
    const text = JSON.stringify([
      { gameName: "Caps", tagLine: "EUW", region: "EUW1" },
      { gameName: "", tagLine: "EUW", region: "euw1" },
      { gameName: "NoRegion", tagLine: "EUW", region: "mars1" },
      "junk",
    ]);
    const players = parseWatchlistBackup(text);
    expect(players.map((p) => p.gameName)).toEqual(["Caps"]);
    expect(players[0].region).toBe("euw1");
  });

  it("rejects files that are not a backup", () => {
    expect(() => parseWatchlistBackup("not json")).toThrow(/JSON/);
    expect(() => parseWatchlistBackup('{"foo": 1}')).toThrow(/игроков/);
  });
});

describe("mergeImportedPlayers", () => {
  it("adds only players not already in the list (case-insensitive)", () => {
    const existing = [player("Caps")];
    const imported = [
      player("caps"),
      player("Faker", { region: "kr", tagLine: "KR1" }),
      player("Faker", { region: "kr", tagLine: "KR1" }),
    ];
    const { watchlist, added, skipped } = mergeImportedPlayers(
      existing,
      imported,
    );
    expect(added).toBe(1);
    expect(skipped).toBe(2);
    expect(watchlist.map((p) => p.gameName)).toEqual(["Caps", "Faker"]);
  });
});

describe("Apex players in the backup", () => {
  const apex = (name, overrides = {}) => ({
    id: `apex-${name}`,
    name,
    platform: "PC",
    uid: `uid-${name}`,
    level: 300,
    isPinned: true,
    status: "IN_GAME",
    currentGame: { matchKey: 1 },
    legends: { wraith: { name: "Wraith", trackers: [] } },
    sessions: [{ matchId: 1, start: 1000 }],
    rpLog: [{ at: 1000, score: 6400, season: "s1" }, { at: "bad" }],
    ...overrides,
  });

  it("round-trips the Apex list and resets live state", () => {
    const text = serializeWatchlist([], new Date(0), [apex("Hal")]);
    const [restored] = parseApexBackup(text);
    expect(restored).toMatchObject({
      name: "Hal",
      platform: "PC",
      uid: "uid-Hal",
      isPinned: true,
      status: "OFFLINE",
      currentGame: null,
    });
    expect(restored.sessions).toHaveLength(1);
    expect(restored.rpLog).toEqual([{ at: 1000, score: 6400, season: "s1" }]);
    // League players parse as before
    expect(parseWatchlistBackup(text)).toEqual([]);
  });

  it("reads older backups without Apex players as empty", () => {
    const text = serializeWatchlist([player("Caps")]);
    expect(parseApexBackup(JSON.stringify(JSON.parse(text).players))).toEqual([]);
    expect(parseApexBackup(JSON.stringify({ players: [] }))).toEqual([]);
  });

  it("skips invalid entries", () => {
    const text = JSON.stringify({
      apexPlayers: [{ name: "A", platform: "MOBILE" }, { platform: "PC" }, null],
    });
    expect(parseApexBackup(text)).toEqual([]);
  });

  it("skips players already in the list by UID or name", () => {
    const existing = [apex("Hal"), apex("Genburten", { uid: null })];
    const imported = parseApexBackup(
      serializeWatchlist([], new Date(0), [
        apex("Hal", { name: "Hal_renamed" }),
        apex("Genburten", { uid: "uid-new" }),
        apex("Verhulst"),
      ]),
    );
    const result = mergeImportedApexPlayers(existing, imported);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(2);
    expect(result.watchlist.map((p) => p.name)).toEqual([
      "Hal",
      "Genburten",
      "Verhulst",
    ]);
  });
});
