// Ranked tiers (League-V4) and helpers for showing rank and LP changes

const TIER_ORDER = [
  "IRON",
  "BRONZE",
  "SILVER",
  "GOLD",
  "PLATINUM",
  "EMERALD",
  "DIAMOND",
  "MASTER",
  "GRANDMASTER",
  "CHALLENGER",
];
const DIVISION_ORDER = ["IV", "III", "II", "I"];
const APEX_TIERS = new Set(["MASTER", "GRANDMASTER", "CHALLENGER"]);

// Queue id -> key in player.ranks
export const RANKED_QUEUE_KEYS = { 420: "solo", 440: "flex" };

// "GOLD II", or just "MASTER" for apex tiers that have no divisions
export const formatTier = (entry) =>
  APEX_TIERS.has(entry.tier) ? entry.tier : `${entry.tier} ${entry.rank}`;

export const formatRank = (entry) => `${formatTier(entry)} · ${entry.lp} LP`;

export const formatRankDetails = (entry) => {
  const games = entry.wins + entry.losses;
  const winRate = games > 0 ? Math.round((entry.wins / games) * 100) : 0;
  return `${formatRank(entry)} · ${entry.wins}W ${entry.losses}L (${winRate}%)`;
};

const ladderPosition = (entry) =>
  TIER_ORDER.indexOf(entry.tier) * 4 +
  (APEX_TIERS.has(entry.tier) ? 0 : DIVISION_ORDER.indexOf(entry.rank));

/**
 * LP gained or lost between two snapshots of the same queue: "+18 LP",
 * "−15 LP", "повышение: GOLD I". Null when it can't be told (e.g. Riot has
 * not counted the game yet).
 */
export const getLpChange = (before, after) => {
  if (!after) return null;
  if (!before) return `получен ранг: ${formatTier(after)}`;
  if (after.wins + after.losses === before.wins + before.losses) return null;

  const sameDivision =
    before.tier === after.tier && before.rank === after.rank;
  // Apex tiers share one LP scale, so the raw difference stays meaningful
  const bothApex = APEX_TIERS.has(before.tier) && APEX_TIERS.has(after.tier);
  if (sameDivision || bothApex) {
    const diff = after.lp - before.lp;
    return `${diff >= 0 ? "+" : "−"}${Math.abs(diff)} LP`;
  }

  return ladderPosition(after) > ladderPosition(before)
    ? `повышение: ${formatTier(after)}`
    : `понижение: ${formatTier(after)}`;
};
