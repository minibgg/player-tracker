// Apex Legends ranked tiers (global.rank of the bridge API) and helpers for
// showing rank and RP changes

const NO_DIVISION_TIERS = new Set(["Master", "Apex Predator"]);
const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };

const formatScore = (score) => Math.round(score).toLocaleString("ru-RU");

// "Gold II", "Master", "Apex Predator #45"
export const formatApexTier = (rank) => {
  if (rank.name === "Apex Predator" && rank.ladderPos > 0) {
    return `Apex Predator #${rank.ladderPos}`;
  }
  if (NO_DIVISION_TIERS.has(rank.name) || !ROMAN[rank.div]) return rank.name;
  return `${rank.name} ${ROMAN[rank.div]}`;
};

export const isRanked = (rank) =>
  Boolean(rank?.name) && rank.name !== "Unranked";

export const formatApexRank = (rank) =>
  `${formatApexTier(rank)} · ${formatScore(rank.score)} RP`;

export const formatRpChange = (diff) =>
  `${diff >= 0 ? "+" : "−"}${formatScore(Math.abs(diff))} RP`;

/**
 * RP gained or lost between two snapshots: { rp, tierChange }.
 * rp is null when nothing moved (a pubs match) or the seasons differ;
 * tierChange is "повышение: Gold I" / "понижение: Silver IV" or null.
 */
export const getRpChange = (before, after) => {
  if (!isRanked(before) || !isRanked(after)) return { rp: null, tierChange: null };
  if (before.season && after.season && before.season !== after.season) {
    return { rp: null, tierChange: null };
  }
  const diff = after.score - before.score;
  if (!diff) return { rp: null, tierChange: null };
  const tierMoved = before.name !== after.name || before.div !== after.div;
  return {
    rp: diff,
    tierChange: tierMoved
      ? `${diff > 0 ? "повышение" : "понижение"}: ${formatApexTier(after)}`
      : null,
  };
};
