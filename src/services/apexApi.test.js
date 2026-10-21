import { describe, it, expect } from "vitest";
import {
  parseBridgeResponse,
  getPresence,
  toApexError,
  legendKey,
} from "./apexApi";

const bridge = (overrides = {}) => ({
  global: {
    name: "Caustic_Fan",
    uid: 1004465473127,
    platform: "PC",
    level: "512",
    toNextLevelPercent: 37,
    bans: { isActive: false, remainingSeconds: 0 },
    rank: {
      rankName: "Gold",
      rankDiv: 2,
      rankScore: "6450",
      rankImg: "https://example.com/gold2.png",
      rankedSeason: "season26_split_1",
      ladderPosPlatform: -1,
    },
  },
  realtime: {
    lobbyState: "open",
    isOnline: 1,
    isInGame: 1,
    selectedLegend: "Mad Maggie",
    currentState: "inMatch",
    currentStateSinceTimestamp: 1760000000,
  },
  legends: {
    selected: {
      LegendName: "Mad Maggie",
      data: [{ name: "BR Kills", value: 120, key: "kills" }],
      ImgAssets: { icon: "maggie.png", banner: "maggie.jpg" },
    },
    all: {
      MadMaggie: {
        data: [{ name: "BR Kills", value: 100, key: "kills" }],
        ImgAssets: { icon: "maggie.png", banner: "maggie.jpg" },
      },
      Wraith: { ImgAssets: { icon: "wraith.png", banner: "wraith.jpg" } },
      Bangalore: {
        data: [
          { name: "BR Wins", value: "17", key: "wins" },
          { name: "broken", value: "n/a", key: "x" },
        ],
      },
    },
  },
  ...overrides,
});

describe("parseBridgeResponse", () => {
  it("normalizes identity, rank and state", () => {
    const snap = parseBridgeResponse(bridge());
    expect(snap).toMatchObject({
      uid: "1004465473127",
      name: "Caustic_Fan",
      level: 512,
      xpPercent: 37,
      isBanned: false,
      presence: "IN_GAME",
      stateSince: 1760000000 * 1000,
      legend: "Mad Maggie",
      rank: { name: "Gold", div: 2, score: 6450, season: "season26_split_1" },
    });
  });

  it("prefers the live trackers of the selected legend", () => {
    const { legends } = parseBridgeResponse(bridge());
    expect(legends.madmaggie.trackers).toEqual([
      { key: "kills", name: "BR Kills", value: 120 },
    ]);
    // Non-numeric tracker values are dropped
    expect(legends.bangalore.trackers).toEqual([
      { key: "wins", name: "BR Wins", value: 17 },
    ]);
    expect(legends.wraith).toBeUndefined();
  });

  it("collects legend icons", () => {
    const { legendAssets } = parseBridgeResponse(bridge());
    expect(legendAssets.wraith).toEqual({
      name: "Wraith",
      icon: "wraith.png",
      banner: "wraith.jpg",
    });
    expect(legendAssets.bangalore).toBeUndefined();
  });

  it("copes with a missing realtime block and rank", () => {
    const data = bridge({ realtime: undefined });
    delete data.global.rank;
    const snap = parseBridgeResponse(data);
    expect(snap.presence).toBe("OFFLINE");
    expect(snap.stateSince).toBeNull();
    expect(snap.rank).toBeNull();
    expect(snap.legend).toBe("Mad Maggie");
  });

  it("throws on a response without a player", () => {
    expect(() => parseBridgeResponse({})).toThrow();
  });
});

describe("getPresence", () => {
  it("reads currentState first, then the online flags", () => {
    expect(getPresence({ currentState: "inMatch" })).toBe("IN_GAME");
    expect(getPresence({ currentState: "inLobby" })).toBe("IN_LOBBY");
    expect(getPresence({ currentState: "offline" })).toBe("OFFLINE");
    expect(getPresence({ isInGame: 1 })).toBe("IN_GAME");
    expect(getPresence({ isOnline: "1" })).toBe("IN_LOBBY");
    expect(getPresence()).toBe("OFFLINE");
  });
});

describe("toApexError", () => {
  it("recognizes a bad key by status or by message", () => {
    expect(toApexError(401).code).toBe("INVALID_KEY");
    // The map rotation answers a bad key with 404 and a plain-text message
    expect(toApexError(404, "API key doesn't exist !").code).toBe("INVALID_KEY");
  });

  it("maps the other failures", () => {
    expect(toApexError(404).status).toBe(404);
    expect(toApexError(200, "Player not found. Try again?").status).toBe(404);
    expect(toApexError(429).status).toBe(429);
    expect(toApexError(502).code).toBe("SERVER_ERROR");
    expect(toApexError(405).code).toBe("TRY_AGAIN");
    expect(toApexError(400, "Slow down").status).toBe(400);
  });
});

describe("legendKey", () => {
  it("ignores case, spaces and punctuation", () => {
    expect(legendKey("Mad Maggie")).toBe(legendKey("MadMaggie"));
    expect(legendKey("Alter")).toBe("alter");
    expect(legendKey(null)).toBe("");
  });
});
