import React, { useState } from "react";
import { LegendIcon } from "./LegendIcon";
import { formatApexTier, formatRpChange, formatScore, isRanked } from "../../data/apexRanks";
import { getApexHistoryStats } from "../../services/apexMatch";
import { startOfDay } from "../../services/activity";

const DAY_MS = 24 * 60 * 60 * 1000;
const PERIODS = [
  { id: "today", label: "сегодня", days: 1 },
  { id: "week", label: "7 дней", days: 7 },
];

/**
 * Who of the tracked players gained the most RP over the period, with their
 * matches, wins and kills. Built from the tracker's own match history.
 */
export const ApexLeaderboard = ({ watchlist, onOpenProfile }) => {
  const [periodId, setPeriodId] = useState("week");
  if (watchlist.length < 2) return null;

  // Days follow the latest check, so "today" turns over with the polls
  const reference = Math.max(...watchlist.map((p) => p.lastChecked || 0));
  const period = PERIODS.find((p) => p.id === periodId);
  const from = startOfDay(reference) - (period.days - 1) * DAY_MS;

  const rows = watchlist
    .map((player) => ({
      player,
      stats: getApexHistoryStats(player.matchLog, from, Infinity),
    }))
    .sort(
      (a, b) =>
        b.stats.rp - a.stats.rp ||
        (b.player.rank?.score || 0) - (a.player.rank?.score || 0),
    );

  return (
    <section aria-label="Таблица лидеров">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="label">Таблица лидеров</h2>
        <div role="radiogroup" aria-label="Период" className="flex gap-3">
          {PERIODS.map((p) => {
            const active = p.id === periodId;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setPeriodId(p.id)}
                className={`label transition-colors ${
                  active
                    ? "text-ink underline decoration-accent underline-offset-4"
                    : "hover:text-ink"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border border-line bg-surface overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="text-left text-ink-2">
              <th className="py-2 pl-4 pr-2 font-normal w-8">#</th>
              <th className="py-2 pr-3 font-normal">игрок</th>
              <th className="py-2 pr-3 font-normal text-right">RP</th>
              <th className="py-2 pr-3 font-normal text-right">матчи</th>
              <th className="py-2 pr-3 font-normal text-right">победы</th>
              <th className="py-2 pr-3 font-normal text-right">убийства</th>
              <th className="py-2 pr-4 font-normal text-right">ранг</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ player, stats }, index) => (
              <tr key={player.id} className="border-t border-line">
                <td
                  className={`py-2 pl-4 pr-2 tabular-nums ${
                    index === 0 && stats.rp > 0 ? "text-accent-ink" : "text-ink-2"
                  }`}
                >
                  {index + 1}
                </td>
                <td className="py-2 pr-3">
                  <button
                    type="button"
                    onClick={() => onOpenProfile(player)}
                    className="flex items-center gap-2 min-w-0 text-ink hover:text-accent-ink transition-colors"
                  >
                    <LegendIcon
                      legend={player.legend}
                      className="size-6 border-line text-xs"
                    />
                    <span className="truncate max-w-[12rem] font-sans text-sm">
                      {player.name}
                    </span>
                  </button>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap text-ink">
                  {stats.rp ? formatRpChange(stats.rp) : "0"}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{stats.matches}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{stats.wins}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{stats.kills}</td>
                <td className="py-2 pr-4 text-right whitespace-nowrap text-ink-2">
                  {isRanked(player.rank)
                    ? `${formatApexTier(player.rank)} · ${formatScore(player.rank.score)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 font-mono text-[11px] text-ink-2">
        RP считаются по истории трекера, включая изменения вне наблюдения;
        матчи, победы и убийства только по замеченным матчам.
      </p>
    </section>
  );
};
