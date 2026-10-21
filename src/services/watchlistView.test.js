import { describe, it, expect } from "vitest";
import {
  filterPlayers,
  groupPlayers,
  viewApexPlayers,
  STATUS_FILTERS,
} from "./watchlistView";

const p = (id, overrides = {}) => ({
  id,
  gameName: id,
  tagLine: "EUW",
  region: "euw1",
  status: "NOT_IN_GAME",
  ...overrides,
});

const ids = (list) => list.map((x) => x.id);

describe("filterPlayers", () => {
  const list = [
    p("Caps", { isPinned: true }),
    p("Faker", { region: "kr", tagLine: "KR1", status: "IN_GAME" }),
    p("Rekkles"),
  ];

  it("filters by status", () => {
    expect(ids(filterPlayers(list, { status: "IN_GAME" }))).toEqual(["Faker"]);
    expect(ids(filterPlayers(list, { status: "NOT_IN_GAME" }))).toEqual([
      "Caps",
      "Rekkles",
    ]);
    expect(ids(filterPlayers(list, { status: "PINNED" }))).toEqual(["Caps"]);
    expect(filterPlayers(list, {})).toHaveLength(3);
  });

  it("searches name, tag and region, ignoring case and spaces", () => {
    expect(ids(filterPlayers(list, { query: " fak " }))).toEqual(["Faker"]);
    expect(ids(filterPlayers(list, { query: "kr1" }))).toEqual(["Faker"]);
    expect(ids(filterPlayers(list, { query: "EUW1" }))).toEqual([
      "Caps",
      "Rekkles",
    ]);
  });
});

describe("groupPlayers", () => {
  it("splits players in a match from the rest", () => {
    const { inGame, others } = groupPlayers([
      p("a"),
      p("b", { status: "IN_GAME", currentGame: { gameStartTime: 100 } }),
      p("c"),
    ]);
    expect(ids(inGame)).toEqual(["b"]);
    expect(ids(others)).toEqual(["a", "c"]);
  });

  it("puts pinned players first in each group", () => {
    const { inGame, others } = groupPlayers([
      p("a"),
      p("b", { isPinned: true }),
      p("c", { status: "IN_GAME", currentGame: { gameStartTime: 300 } }),
      p("d", {
        status: "IN_GAME",
        isPinned: true,
        currentGame: { gameStartTime: 100 },
      }),
    ]);
    expect(ids(inGame)).toEqual(["d", "c"]);
    expect(ids(others)).toEqual(["b", "a"]);
  });

  it("shows the newest game first, loading screens on top", () => {
    const { inGame } = groupPlayers([
      p("old", { status: "IN_GAME", currentGame: { gameStartTime: 100 } }),
      p("loading", { status: "IN_GAME", currentGame: { gameStartTime: 0 } }),
      p("new", { status: "IN_GAME", currentGame: { gameStartTime: 500 } }),
    ]);
    expect(ids(inGame)).toEqual(["loading", "new", "old"]);
  });

  it("orders the rest by recent activity and keeps list order otherwise", () => {
    const { others } = groupPlayers([
      p("never1"),
      p("lastWeek", { sessions: [{ end: 1000 }] }),
      p("never2"),
      p("justNow", { lastMatchResult: { endedAt: 9000 } }),
    ]);
    expect(ids(others)).toEqual(["justNow", "lastWeek", "never1", "never2"]);
  });
});

describe("viewApexPlayers", () => {
  const a = (id, overrides = {}) => ({
    id,
    name: id,
    platform: "PC",
    uid: `uid-${id}`,
    status: "OFFLINE",
    ...overrides,
  });
  const list = [
    a("Off"),
    a("Lobby", { status: "IN_LOBBY" }),
    a("Match", { status: "IN_GAME", platform: "PS4" }),
    a("PinnedOff", { isPinned: true }),
  ];

  it("sorts pinned, in a match, in the lobby, offline", () => {
    expect(ids(viewApexPlayers(list, {}))).toEqual([
      "PinnedOff",
      "Match",
      "Lobby",
      "Off",
    ]);
  });

  it("filters by status and searches name, platform and UID", () => {
    expect(ids(viewApexPlayers(list, { status: "IN_LOBBY" }))).toEqual(["Lobby"]);
    expect(ids(viewApexPlayers(list, { status: "OFFLINE" }))).toEqual([
      "PinnedOff",
      "Off",
    ]);
    expect(ids(viewApexPlayers(list, { query: "ps4" }))).toEqual(["Match"]);
    expect(ids(viewApexPlayers(list, { query: "uid-lob" }))).toEqual(["Lobby"]);
  });

  it("counts every player under exactly one status filter", () => {
    const [, ...statuses] = STATUS_FILTERS.apex.filter((f) => f.id !== "PINNED");
    for (const p of list) {
      expect(statuses.filter((f) => f.match(p))).toHaveLength(1);
    }
  });
});
