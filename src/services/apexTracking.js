// How the Apex tracker reacts to a fresh snapshot of a player: going online,
// a match starting or ending, and the result of a finished match.
import { startSession, updateSession } from "./activity";
import {
  getMatchResult,
  isSameMatch,
  isUnseen,
  formatApexResult,
} from "./apexMatch";
import { isRanked } from "../data/apexRanks";

// The API usually counts a match within a poll or two of its end
export const RESULT_WAIT_MS = 5 * 60 * 1000;
// A longer gap between polls (tracker closed, computer asleep) may hide
// whole matches
const STALE_GAP_MS = 15 * 60 * 1000;
const HISTORY_LIMIT = 20;
const MATCH_LOG_LIMIT = 100;
const RP_LOG_LIMIT = 300;

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

// The API's "in this state since" is the real start of the state for some
// players and just the time of the request for others. A value well in the
// past can't be the request time; two polls agreeing on it prove it's real.
const PAST_SINCE_MS = 30 * 1000;
const SINCE_TOLERANCE_MS = 5 * 1000;
const MAX_MATCH_MS = 2 * 60 * 60 * 1000;

const pastSinceOf = (snap, now) =>
  snap.stateSince &&
  snap.stateSince < now - PAST_SINCE_MS &&
  snap.stateSince > now - MAX_MATCH_MS
    ? snap.stateSince
    : null;

const newMatch = (snap, now) => {
  const start = pastSinceOf(snap, now) ?? now;
  return {
    matchKey: start,
    // Read by useGameClock for the live stopwatch
    gameStartTime: start,
    since: snap.stateSince,
    sinceReliable: false,
    legend: snap.legend,
  };
};

// RP over time, oldest first: a point whenever the score moves
const pushRp = (rpLog = [], rank, now) => {
  if (!isRanked(rank)) return rpLog;
  const last = rpLog[rpLog.length - 1];
  if (last && last.score === rank.score && last.season === rank.season) {
    return rpLog;
  }
  return [...rpLog, { at: now, score: rank.score, season: rank.season }].slice(
    -RP_LOG_LIMIT,
  );
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
    rpLog: pushRp([], snap.rank, now),
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
  // Finished one match and started the next between two polls: account XP
  // only moves after a match (unless it belongs to a result still waiting),
  // and a trusted "since" only moves when the state starts over
  const xpMoved =
    p.xpPercent !== undefined &&
    (snap.level !== p.level || snap.xpPercent !== p.xpPercent);
  const sinceJumped =
    Boolean(currentGame?.sinceReliable && snap.stateSince) &&
    snap.stateSince > currentGame.since &&
    !isSameMatch(currentGame.since, snap.stateSince);
  const switchedGame =
    wasInGame && isNowInGame && ((xpMoved && !pendingResult) || sinceJumped);
  const gameEnded = (wasInGame && !isNowInGame) || switchedGame;

  // Unseen matches are logged but never alert: they're old news
  const finishPending = (result) => {
    history = pushHistory(history, {
      timestamp: now,
      status: snap.presence,
      message: `Итог: ${formatApexResult(result)}`,
    });
    if (result.win !== null && !isUnseen(result)) {
      sessions = updateSession(sessions, result.matchKey, { win: result.win });
    }
    lastMatchResult = result;
    matchLog = [result, ...matchLog].slice(0, MATCH_LOG_LIMIT);
    pendingResult = null;
    if (result.counted && !isUnseen(result)) {
      events.push({ type: "MATCH_RESULT", player: p, result });
    }
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
    // Back in the lobby since (or the next match since) = when the match
    // ended for the player, if the API's value fits
    const leftAt = snap.stateSince;
    const endedAt =
      leftAt && leftAt > game.gameStartTime && leftAt <= now ? leftAt : now;
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
      // Polls too far apart: later matches may be mixed into this result
      ...(p.lastChecked && now - p.lastChecked > STALE_GAP_MS
        ? { kind: "unseen" }
        : {}),
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

  // Matches the tracker never saw (it was closed, or a short one fit between
  // two polls) still move XP and RP
  let loggedUnseen = false;
  if (
    !wasInGame &&
    !p.pendingResult &&
    p.lastChecked &&
    p.xpPercent !== undefined
  ) {
    const result = getMatchResult(
      {
        kind: "unseen",
        matchKey: now,
        legend: null,
        startedAt: p.lastChecked,
        endedAt: now,
        baseline: baselineOf(p),
      },
      snap,
    );
    if (result.counted) {
      finishPending(result);
      loggedUnseen = true;
    }
  }

  if ((!wasInGame && isNowInGame) || switchedGame) {
    currentGame = newMatch(snap, now);
    // RP from before this match, unless an unseen one moved it since
    matchBaseline = {
      rank: (!wasInGame && !loggedUnseen && p.rank) || snap.rank,
    };
    history = pushHistory(history, {
      timestamp: now,
      status: "IN_GAME",
      message: snap.legend ? `Начал матч за ${snap.legend}` : "Начал матч",
    });
    sessions = startMatchSession(sessions, currentGame, now);
    events.push({ type: "GAME_START", player: p, legend: snap.legend });
  } else if (isNowInGame && currentGame) {
    // Two polls agreeing on "since" make it the real start of the match
    const confirmed =
      !currentGame.sinceReliable &&
      Boolean(snap.stateSince && currentGame.since) &&
      Math.abs(snap.stateSince - currentGame.since) < SINCE_TOLERANCE_MS &&
      snap.stateSince <= now;
    if (confirmed) {
      sessions = updateSession(sessions, currentGame.matchKey, {
        start: snap.stateSince,
      });
    }
    currentGame = {
      ...currentGame,
      // The legend is picked once the match has started
      legend: snap.legend || currentGame.legend,
      since: snap.stateSince,
      sinceReliable: currentGame.sinceReliable || confirmed,
      gameStartTime: confirmed ? snap.stateSince : currentGame.gameStartTime,
    };
  } else if (isNowInGame) {
    currentGame = newMatch(snap, now);
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
      rpLog: pushRp(p.rpLog, snap.rank, now),
      statusHistory: history,
      sessions,
      lastChecked: now,
    },
    events,
  };
};
