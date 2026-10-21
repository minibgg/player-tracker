// What the board shows: filtering, and grouping into "in game" / the rest

export const filterPlayers = (watchlist, { status = "ALL", query = "" }) => {
  const q = query.toLowerCase().trim();
  return watchlist.filter((p) => {
    if (status === "PINNED" && !p.isPinned) return false;
    if (status === "IN_GAME" && p.status !== "IN_GAME") return false;
    if (status === "NOT_IN_GAME" && p.status === "IN_GAME") return false;
    if (!q) return true;
    return [p.gameName, p.tagLine, p.region].some((v) =>
      String(v || "").toLowerCase().includes(q),
    );
  });
};

// gameStartTime is 0 during the loading screen: that game is the newest
const gameStart = (p) => {
  const start = p.currentGame?.gameStartTime;
  return start > 0 ? start : Number.MAX_SAFE_INTEGER;
};

const lastActivity = (p) =>
  p.lastMatchResult?.endedAt || p.sessions?.[0]?.end || 0;

// Pinned first, then `compare`; Array#sort is stable, so ties keep list order
const pinnedFirst = (compare) => (a, b) =>
  Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) || compare(a, b);

/**
 * { inGame, others }: players in a match (newest game first) and everyone
 * else (most recently active first, never-seen players in list order).
 */
export const groupPlayers = (players) => ({
  inGame: players
    .filter((p) => p.status === "IN_GAME")
    .sort(pinnedFirst((a, b) => gameStart(b) - gameStart(a))),
  others: players
    .filter((p) => p.status !== "IN_GAME")
    .sort(pinnedFirst((a, b) => lastActivity(b) - lastActivity(a))),
});

// Status filters of each game's board, shared by the rail counters and the list
export const STATUS_FILTERS = {
  lol: [
    { id: "ALL", label: "Все", match: () => true },
    { id: "IN_GAME", label: "В игре", match: (p) => p.status === "IN_GAME" },
    { id: "NOT_IN_GAME", label: "Не в игре", match: (p) => p.status === "NOT_IN_GAME" },
    { id: "PINNED", label: "Закреплённые", match: (p) => Boolean(p.isPinned) },
  ],
  apex: [
    { id: "ALL", label: "Все", match: () => true },
    { id: "IN_GAME", label: "В матче", match: (p) => p.status === "IN_GAME" },
    { id: "IN_LOBBY", label: "В лобби", match: (p) => p.status === "IN_LOBBY" },
    { id: "OFFLINE", label: "Не в сети", match: (p) => p.status !== "IN_GAME" && p.status !== "IN_LOBBY" },
    { id: "PINNED", label: "Закреплённые", match: (p) => Boolean(p.isPinned) },
  ],
};

const APEX_STATUS_ORDER = { IN_GAME: 0, IN_LOBBY: 1 };

/**
 * The Apex board: filtered by status and a name/platform search, then
 * pinned first, in a match, in the lobby, offline (stable within a group).
 */
export const viewApexPlayers = (watchlist, { status = "ALL", query = "" }) => {
  const filter =
    STATUS_FILTERS.apex.find((f) => f.id === status) || STATUS_FILTERS.apex[0];
  const q = query.toLowerCase().trim();
  return watchlist
    .filter(filter.match)
    .filter(
      (p) =>
        !q ||
        [p.name, p.platform, p.uid].some((v) =>
          String(v || "").toLowerCase().includes(q),
        ),
    )
    .sort(
      pinnedFirst(
        (a, b) =>
          (APEX_STATUS_ORDER[a.status] ?? 2) - (APEX_STATUS_ORDER[b.status] ?? 2),
      ),
    );
};
