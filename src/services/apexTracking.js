// How the Apex tracker reacts to a fresh snapshot of a player: going online,
// a match starting or ending, and the result of a finished match.
import { startSession, updateSession } from "./activity";
import { getMatchResult, isSameMatch, formatApexResult } from "./apexMatch";

// The API usually counts a match within a poll or two of its end
export const RESULT_WAIT_MS = 5 * 60 * 1000;
const HISTORY_LIMIT = 20;
const MATCH_LOG_LIMIT = 20;

const pushHistory = (history, entry) =>
  [entry, ...history].slice(0, HISTORY_LIMIT);

// What every poll stores about the player
const snapshotFields = (snap) => ({
  uid: snap.uid,
  level: snap.level,
  xpPercent: snap.xpPercent,
  isBanned: snap.isBanned,
  rank: snap.rank,
  legend: snap.legend,
  legends: snap.legends,
  status: snap.presence,
  stateSince: snap.stateSince,
});

// The numbers a result is measured against
const baselineOf = (p) => ({
  rank: p.rank,
  level: p.level,
  xpPercent: p.xpPercent,
  legends: p.legends,
});

// The API's "in this state since", when it is usable
const exactStartOf = (snap, now) =>
  snap.stateSince && snap.stateSince <= now ? snap.stateSince : null;

const newMatch = (snap, now) => {
  const exact = exactStartOf(snap, now);
  const start = exact ?? now;
  return {
    matchKey: start,
    // Read by useGameClock for the live stopwatch
    gameStartTime: start,
    exactStart: exact !== null,
    legend: snap.legend,
  };
};

const startMatchSession = (sessions, game, now) =>
  startSession(
    sessions,
    { matchId: game.matchKey, start: game.gameStartTime, legend: game.legend },
    now,
  );

const ADDED_MESSAGES = {
  IN_GAME: "Добавлен (в матче)",
  IN_LOBBY: "Добавлен (в сети)",
  OFFLINE: "Добавлен в список отслеживания",
};

export const createApexPlayer = (
  snap,
  { id, platform, isPinned = false },
  now = Date.now(),
) => {
  const currentGame = snap.presence === "IN_GAME" ? newMatch(snap, now) : null;
  return {
    id,
    platform,
    name: snap.name,
    ...snapshotFields(snap),
    isPinned: Boolean(isPinned),
    isTracking: true,
    isMuted: false,
    currentGame,
    matchBaseline: currentGame ? { rank: snap.rank } : null,
    pendingResult: null,
    lastMatchResult: null,
    matchLog: [],
    lastChecked: now,
    sessions: currentGame ? startMatchSession([], currentGame, now) : [],
    statusHistory: [
      { timestamp: now, status: snap.presence, message: ADDED_MESSAGES[snap.presence] },
    ],
  };
};

/**
 * Applies a snapshot (parseBridgeResponse) to a player.
 * Returns { patch, events }: the fields to merge into the player and the
 * ONLINE / GAME_START / GAME_END / MATCH_RESULT events to announce.
 */
export const applyApexSnapshot = (p, snap, now = Date.now()) => {
  const events = [];
  let history = p.statusHistory || [];
  let sessions = p.sessions || [];
  let pendingResult = p.pendingResult || null;
  let lastMatchResult = p.lastMatchResult || null;
  let matchLog = p.matchLog || [];
  let matchBaseline = p.matchBaseline || null;
  let currentGame = p.currentGame || null;

  const wasInGame = p.status === "IN_GAME";
  const isNowInGame = snap.presence === "IN_GAME";
  const exactStart = exactStartOf(snap, now);
  // Finished one match and started the next between two polls
  const switchedGame =
    wasInGame &&
    isNowInGame &&
    Boolean(currentGame?.exactStart && exactStart) &&
    !isSameMatch(currentGame.matchKey, exactStart);
  const gameEnded = (wasInGame && !isNowInGame) || switchedGame;

  const finishPending = (result) => {
    history = pushHistory(history, {
      timestamp: now,
      status: snap.presence,
      message: `Итог: ${formatApexResult(result)}`,
    });
    if (result.win !== null) {
      sessions = updateSession(sessions, result.matchKey, { win: result.win });
    }
    lastMatchResult = result;
    matchLog = [result, ...matchLog].slice(0, MATCH_LOG_LIMIT);
    pendingResult = null;
    if (result.counted) events.push({ type: "MATCH_RESULT", player: p, result });
  };

  // A result still waiting when the next match ends: measure it against the
  // last poll, before this match's numbers got mixed in
  if (pendingResult && gameEnded) {
    finishPending(getMatchResult(pendingResult, baselineOf(p)));
  }

  if (p.status === "OFFLINE" && snap.presence === "IN_LOBBY") {
    history = pushHistory(history, {
      timestamp: now,
      status: "IN_LOBBY",
      message: "Появился в сети",
    });
    events.push({ type: "ONLINE", player: p });
  }
  if (p.status === "IN_LOBBY" && snap.presence === "OFFLINE") {
    history = pushHistory(history, {
      timestamp: now,
      status: "OFFLINE",
      message: "Вышел из сети",
    });
  }

  if (gameEnded) {
    const game = currentGame || {
      matchKey: now,
      gameStartTime: p.lastChecked || now,
      legend: p.legend,
    };
    // Back in the lobby since = when the match ended for the player
    const leftAt = switchedGame ? exactStart : isNowInGame ? null : exactStart;
    const endedAt = leftAt && leftAt > game.gameStartTime ? leftAt : now;
    history = pushHistory(history, {
      timestamp: now,
      status: snap.presence,
      message: "Матч завершён",
    });
    sessions = updateSession(sessions, game.matchKey, {
      end: endedAt,
      legend: game.legend,
    });
    pendingResult = {
      matchKey: game.matchKey,
      legend: game.legend,
      startedAt: game.gameStartTime,
      endedAt,
      // RP from before the match: ranked may take an entry cost at the start
      baseline: { ...baselineOf(p), rank: matchBaseline?.rank ?? p.rank },
    };
    matchBaseline = null;
    currentGame = null;
    events.push({ type: "GAME_END", player: p });
  }

  // Before a new match starts, so the result is announced first
  if (pendingResult) {
    const result = getMatchResult(pendingResult, snap);
    if (result.counted || now - pendingResult.endedAt > RESULT_WAIT_MS) {
      finishPending(result);
    }
  }

  if ((!wasInGame && isNowInGame) || switchedGame) {
    currentGame = newMatch(snap, now);
    matchBaseline = { rank: (!wasInGame && p.rank) || snap.rank };
    history = pushHistory(history, {
      timestamp: now,
      status: "IN_GAME",
      message: snap.legend ? `Начал матч за ${snap.legend}` : "Начал матч",
    });
    sessions = startMatchSession(sessions, currentGame, now);
    events.push({ type: "GAME_START", player: p, legend: snap.legend });
  } else if (isNowInGame) {
    // The legend is picked once the match has started
    currentGame = currentGame
      ? { ...currentGame, legend: snap.legend || currentGame.legend }
      : newMatch(snap, now);
  }

  return {
    patch: {
      ...snapshotFields(snap),
      name: snap.name || p.name,
      currentGame: isNowInGame ? currentGame : null,
      matchBaseline: isNowInGame ? matchBaseline : null,
      pendingResult,
      lastMatchResult,
      matchLog,
      statusHistory: history,
      sessions,
      lastChecked: now,
    },
    events,
  };
};
