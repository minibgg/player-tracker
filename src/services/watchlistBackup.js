// Export / import of the watchlist as a JSON file
import { REGIONS } from "../data/regions";
import { APEX_PLATFORMS } from "../data/apexPlatforms";

const BACKUP_VERSION = 1;

export const createPlayerId = () =>
  `player-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

// Carries what the user built up (list, pins, mutes, history, stats) and
// drops live state. PUUIDs are left out: they are encrypted per API key, so
// they're resolved again from the Riot ID on the other side. Apex UIDs are
// the same for every key and are kept.
export const serializeWatchlist = (
  watchlist,
  now = new Date(),
  apexWatchlist = [],
) =>
  JSON.stringify(
    {
      app: "player-tracker",
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      players: watchlist.map((p) => ({
        gameName: p.gameName,
        tagLine: p.tagLine,
        region: p.region,
        profileIconId: p.profileIconId,
        summonerLevel: p.summonerLevel,
        isPinned: Boolean(p.isPinned),
        isTracking: p.isTracking !== false,
        isMuted: Boolean(p.isMuted),
        ranks: p.ranks || null,
        lastMatchResult: p.lastMatchResult || null,
        statusHistory: p.statusHistory || [],
        sessions: p.sessions || [],
      })),
      apexPlayers: apexWatchlist.map((p) => ({
        name: p.name,
        platform: p.platform,
        uid: p.uid,
        level: p.level,
        isPinned: Boolean(p.isPinned),
        isTracking: p.isTracking !== false,
        isMuted: Boolean(p.isMuted),
        rank: p.rank || null,
        lastMatchResult: p.lastMatchResult || null,
        matchLog: p.matchLog || [],
        rpLog: p.rpLog || [],
        statusHistory: p.statusHistory || [],
        sessions: p.sessions || [],
      })),
    },
    null,
    2,
  );

const isNonEmptyString = (v) => typeof v === "string" && v.trim() !== "";
const isObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

const isValidEntry = (p) =>
  isObject(p) &&
  isNonEmptyString(p.gameName) &&
  isNonEmptyString(p.tagLine) &&
  isNonEmptyString(p.region) &&
  REGIONS.some((r) => r.id === p.region.toLowerCase());

const toPlayer = (p) => ({
  id: createPlayerId(),
  gameName: p.gameName.trim(),
  tagLine: p.tagLine.trim(),
  region: p.region.toLowerCase(),
  puuid: null,
  profileIconId: Number(p.profileIconId) || 29,
  summonerLevel: Number(p.summonerLevel) || 1,
  isPinned: Boolean(p.isPinned),
  isTracking: p.isTracking !== false,
  isMuted: Boolean(p.isMuted),
  status: "NOT_IN_GAME",
  currentGame: null,
  lastChecked: null,
  ranks: isObject(p.ranks) ? p.ranks : null,
  ranksFetchedAt: 0,
  pendingResult: null,
  lastMatchResult: isObject(p.lastMatchResult) ? p.lastMatchResult : null,
  statusHistory: Array.isArray(p.statusHistory)
    ? p.statusHistory.filter(isObject).slice(0, 20)
    : [],
  sessions: Array.isArray(p.sessions)
    ? p.sessions.filter((s) => isObject(s) && Number.isFinite(s.start))
    : [],
});

/**
 * Parses a backup file (or a bare array of players). Invalid entries are
 * skipped; throws when the file isn't a backup at all.
 */
export const parseWatchlistBackup = (text) => {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Файл не является корректным JSON.");
  }
  const list = Array.isArray(data) ? data : data?.players;
  if (!Array.isArray(list)) {
    throw new Error("В файле нет списка игроков.");
  }
  return list.filter(isValidEntry).map(toPlayer);
};

const playerKey = (p) =>
  `${p.region}::${p.gameName}#${p.tagLine}`.toLowerCase();

// Appends imported players that aren't in the list yet (newPlayers)
export const mergeImportedPlayers = (existing, imported) => {
  const seen = new Set(existing.map(playerKey));
  const added = [];
  for (const p of imported) {
    const key = playerKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    added.push(p);
  }
  return {
    watchlist: [...existing, ...added],
    newPlayers: added,
    added: added.length,
    skipped: imported.length - added.length,
  };
};

const isValidApexEntry = (p) =>
  isObject(p) &&
  (isNonEmptyString(p.name) || isNonEmptyString(p.uid)) &&
  APEX_PLATFORMS.some((pl) => pl.id === String(p.platform || "").toUpperCase());

const toApexPlayer = (p) => ({
  id: createPlayerId(),
  name: String(p.name || p.uid).trim(),
  platform: String(p.platform).toUpperCase(),
  uid: isNonEmptyString(p.uid) ? p.uid.trim() : null,
  level: Number(p.level) || 0,
  isPinned: Boolean(p.isPinned),
  isTracking: p.isTracking !== false,
  isMuted: Boolean(p.isMuted),
  status: "OFFLINE",
  currentGame: null,
  matchBaseline: null,
  pendingResult: null,
  lastChecked: null,
  rank: isObject(p.rank) ? p.rank : null,
  lastMatchResult: isObject(p.lastMatchResult) ? p.lastMatchResult : null,
  matchLog: Array.isArray(p.matchLog)
    ? p.matchLog.filter(isObject).slice(0, 100)
    : [],
  rpLog: Array.isArray(p.rpLog)
    ? p.rpLog
        .filter((e) => isObject(e) && Number.isFinite(e.at) && Number.isFinite(e.score))
        .slice(-300)
    : [],
  statusHistory: Array.isArray(p.statusHistory)
    ? p.statusHistory.filter(isObject).slice(0, 20)
    : [],
  sessions: Array.isArray(p.sessions)
    ? p.sessions.filter((s) => isObject(s) && Number.isFinite(s.start))
    : [],
});

/**
 * Apex players of a backup file; [] for backups made before the Apex tab.
 * Throws only when the file isn't JSON.
 */
export const parseApexBackup = (text) => {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Файл не является корректным JSON.");
  }
  const list = Array.isArray(data?.apexPlayers) ? data.apexPlayers : [];
  return list.filter(isValidApexEntry).map(toApexPlayer);
};

const apexPlayerKey = (p) =>
  `${p.platform}::${p.uid || p.name}`.toLowerCase();

export const mergeImportedApexPlayers = (existing, imported) => {
  // An existing player matches by UID or, before the first lookup, by name
  const seen = new Set(
    existing.flatMap((p) => [
      apexPlayerKey(p),
      `${p.platform}::${p.name}`.toLowerCase(),
    ]),
  );
  const added = [];
  for (const p of imported) {
    const keys = [apexPlayerKey(p), `${p.platform}::${p.name}`.toLowerCase()];
    if (keys.some((k) => seen.has(k))) continue;
    keys.forEach((k) => seen.add(k));
    added.push(p);
  }
  return {
    watchlist: [...existing, ...added],
    newPlayers: added,
    added: added.length,
    skipped: imported.length - added.length,
  };
};
