// Play-time stats built from the games the tracker has seen a player in.
// A session is { matchId, start, end, queueId, championId, win }.

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MAX_SESSIONS = 200;
const SESSION_TTL_MS = 60 * DAY_MS;
// Caps sessions whose end was never seen (e.g. the tracker was closed)
const MAX_GAME_MS = 90 * 60 * 1000;

export const startSession = (sessions = [], session, now = Date.now()) => {
  if (sessions.some((s) => s.matchId === session.matchId)) return sessions;
  return [{ end: null, win: null, ...session }, ...sessions]
    .filter((s) => now - s.start < SESSION_TTL_MS)
    .slice(0, MAX_SESSIONS);
};

// Merges `patch` ({ end }, or exact { start, end, win } from Match-V5)
export const updateSession = (sessions = [], matchId, patch) =>
  sessions.map((s) => (s.matchId === matchId ? { ...s, ...patch } : s));

const sessionEnd = (s, now) =>
  Math.min(s.end ?? now, s.start + MAX_GAME_MS, now);

export const startOfDay = (timestamp) => {
  const d = new Date(timestamp);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/**
 * Time in game and games started within [from, now).
 * Returns { ms, games, wins, losses }.
 */
export const getPlayStats = (sessions = [], from, now = Date.now()) => {
  const stats = { ms: 0, games: 0, wins: 0, losses: 0 };
  for (const s of sessions) {
    const overlap = sessionEnd(s, now) - Math.max(s.start, from);
    if (overlap > 0) stats.ms += overlap;
    if (s.start >= from && s.start < now) {
      stats.games++;
      if (s.win === true) stats.wins++;
      if (s.win === false) stats.losses++;
    }
  }
  return stats;
};

export const getRecentPlayStats = (sessions, now = Date.now()) => ({
  today: getPlayStats(sessions, startOfDay(now), now),
  week: getPlayStats(sessions, startOfDay(now) - 6 * DAY_MS, now),
});

/**
 * Games started per weekday and hour: grid[day][hour], Monday first.
 */
export const getWeeklyHeatmap = (sessions = []) => {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const s of sessions) {
    const d = new Date(s.start);
    grid[(d.getDay() + 6) % 7][d.getHours()]++;
  }
  return grid;
};

export const formatPlayTime = (ms) => {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} мин`;
  return minutes === 0 ? `${hours} ч` : `${hours} ч ${minutes} мин`;
};
