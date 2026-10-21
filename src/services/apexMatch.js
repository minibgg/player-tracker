// Result of a finished Apex match. The API has no match history for new
// keys, so the result is the difference between two snapshots of the player:
// one taken before the match was counted, one after. Kills, damage and wins
// come from the legend's banner trackers, so only the trackers the player
// shows on the banner can be told.
import { legendKey } from "./apexApi";
import { getRpChange, formatRpChange } from "../data/apexRanks";

// Two polls of the same match may report a start a few seconds apart
const SAME_MATCH_MS = 90 * 1000;

export const isSameMatch = (startA, startB) =>
  Math.abs(startA - startB) < SAME_MATCH_MS;

// "kills", "br_kills", "kills_season_19", "specialEvent_kills"; "kd" and
// "shotgun_kills" are not the match total
const TRACKER_KIND = /^(?:br_|specialevent_)?(kills|damage|wins)(?:_season_\d+)?$/;

export const getTrackerKind = (tracker) => {
  const byKey = String(tracker.key || "").toLowerCase().match(TRACKER_KIND);
  if (byKey) return byKey[1];
  const byName = String(tracker.name || "")
    .toLowerCase()
    .match(/^(?:br |season \d+ )?(kills|damage|wins)$/);
  return byName ? byName[1] : null;
};

const hasKind = (trackers, kind) =>
  trackers.some((t) => getTrackerKind(t) === kind);

// Positive change of each tracker present in both lists
const getTrackerChanges = (before = [], after = []) =>
  after
    .map((t) => {
      const old = before.find((b) => b.key === t.key);
      return old ? { ...t, delta: t.value - old.value } : null;
    })
    .filter((t) => t && t.delta > 0);

/**
 * pending:  { matchKey, legend, startedAt, endedAt, baseline }
 * baseline: { rank, level, xpPercent, legends } from before the match counted
 * snapshot: the latest parseBridgeResponse() result
 *
 * counted is false while the API still shows pre-match numbers (no XP,
 * tracker or RP change yet).
 */
export const getMatchResult = (pending, snapshot) => {
  const { baseline = {} } = pending;
  const key = legendKey(pending.legend);
  const legendBefore = baseline.legends?.[key]?.trackers || [];
  const legendAfter = snapshot.legends?.[key]?.trackers || [];
  const changes = getTrackerChanges(legendBefore, legendAfter);
  const { rp, tierChange } = getRpChange(baseline.rank, snapshot.rank);

  const xpMoved =
    snapshot.level !== baseline.level ||
    snapshot.xpPercent !== baseline.xpPercent;
  const counted = xpMoved || changes.length > 0 || rp !== null;

  const byKind = (kind) => {
    const deltas = changes
      .filter((t) => getTrackerKind(t) === kind)
      .map((t) => t.delta);
    return deltas.length > 0 ? Math.max(...deltas) : null;
  };
  // A tracker that didn't move still says something once the match counted
  const countedKind = (kind) =>
    byKind(kind) ?? (counted && hasKind(legendAfter, kind) ? 0 : null);
  const wins = countedKind("wins");

  return {
    matchKey: pending.matchKey,
    legend: pending.legend || null,
    startedAt: pending.startedAt,
    endedAt: pending.endedAt,
    duration: Math.max(0, Math.round((pending.endedAt - pending.startedAt) / 1000)),
    counted,
    // Only known when the banner shows a wins tracker
    win: wins === null ? null : wins > 0,
    kills: countedKind("kills"),
    damage: countedKind("damage"),
    others: changes
      .filter((t) => !getTrackerKind(t))
      .map((t) => ({ name: t.name, delta: t.delta })),
    rpChange: rp,
    tierChange,
  };
};

const plural = (n, one, few, many) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

export const formatKills = (n) =>
  `${n} ${plural(n, "убийство", "убийства", "убийств")}`;

export const formatDamage = (n) => `${n.toLocaleString("ru-RU")} урона`;

export const getApexOutcomeLabel = (result) => {
  if (!result.counted) return "Без итога";
  if (result.win === true) return "Победа";
  if (result.win === false) return "Не топ-1";
  return "Матч";
};

// "Победа · Wraith · 5 убийств · 1 204 урона · 18 мин · +45 RP"
export const formatApexResult = (result) => {
  const parts = result.counted ? [getApexOutcomeLabel(result)] : [];
  if (result.legend) parts.push(result.legend);
  if (result.kills != null) parts.push(formatKills(result.kills));
  if (result.damage != null) parts.push(formatDamage(result.damage));
  parts.push(`${Math.max(1, Math.round(result.duration / 60))} мин`);
  if (result.rpChange != null) parts.push(formatRpChange(result.rpChange));
  if (result.tierChange) parts.push(result.tierChange);
  if (!result.counted) parts.push("статистика не обновилась");
  return parts.join(" · ");
};
