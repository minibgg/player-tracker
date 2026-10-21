// Apex Legends ranked tiers (global.rank of the bridge API) and helpers for
// showing rank and RP changes

const NO_DIVISION_TIERS = new Set(["Master", "Apex Predator"]);
const ROMAN = { 1: "I", 2: "II", 3: "III", 4: "IV" };

export const formatScore = (score) =>
  Math.round(score).toLocaleString("ru-RU");

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

// Division floors of Season 30 Split 2 (apexranked.com), lowest first.
// Floors change between seasons, so getRankProgress only trusts this table
// for a player whose API-reported tier it reproduces.
const LADDER = [
  ["Rookie", [0, 250, 500, 750]],
  ["Bronze", [1000, 1500, 2000, 2500]],
  ["Silver", [3000, 3500, 4000, 4750]],
  ["Gold", [5500, 6250, 7000, 7750]],
  ["Platinum", [8500, 9250, 10000, 11000]],
  ["Diamond", [12000, 13000, 14000, 15000]],
].flatMap(([name, floors]) =>
  floors.map((floor, i) => ({ name, div: 4 - i, floor })),
);
export const MASTER_FLOOR = 16000;

/**
 * Progress to the next division: { next, left, fraction } ("Diamond II",
 * RP still needed, 0..1 of the current division done). Null for Master and
 * above, unranked players, and whenever the table disagrees with the API
 * (a new season moved the floors): no number beats a wrong one.
 */
export const getRankProgress = (rank) => {
  if (!isRanked(rank) || NO_DIVISION_TIERS.has(rank.name)) return null;
  const index = LADDER.findLastIndex((d) => rank.score >= d.floor);
  const current = LADDER[index];
  if (!current || current.name !== rank.name || current.div !== rank.div) {
    return null;
  }
  const next = LADDER[index + 1] || { name: "Master", div: 0, floor: MASTER_FLOOR };
  return {
    next: formatApexTier(next),
    left: next.floor - rank.score,
    fraction: (rank.score - current.floor) / (next.floor - current.floor),
  };
};
