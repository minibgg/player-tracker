import React from "react";
import {
  getRankProgress,
  formatScore,
  isRanked,
  MASTER_FLOOR,
} from "../../data/apexRanks";

// A meter: the unfilled track is a lighter step of the fill's own hue
const Meter = ({ fraction, children }) => (
  <div className="mt-2">
    <div className="h-1 bg-accent/20" aria-hidden="true">
      <div
        className="h-full bg-accent"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%` }}
      />
    </div>
    <div className="font-mono text-[11px] text-ink-2 mt-1">{children}</div>
  </div>
);

/**
 * How far the player is from the next division, or from Apex Predator once
 * in Master. predatorCut: usePredatorCut() result, may be null.
 */
export const RankProgress = ({ rank, platform, predatorCut }) => {
  if (!isRanked(rank)) return null;

  const progress = getRankProgress(rank);
  if (progress) {
    return (
      <Meter fraction={progress.fraction}>
        до {progress.next}: {formatScore(progress.left)} RP
      </Meter>
    );
  }

  const cut = predatorCut?.[platform];
  if (rank.name === "Master" && cut?.isFull && cut.rp > rank.score) {
    return (
      <Meter fraction={(rank.score - MASTER_FLOOR) / (cut.rp - MASTER_FLOOR)}>
        до Predator: {formatScore(cut.rp - rank.score)} RP
      </Meter>
    );
  }
  return null;
};
