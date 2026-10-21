import React from "react";
import {
  getRecentPlayStats,
  getWeeklyHeatmap,
  formatPlayTime,
} from "../services/activity";

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
// Spelled out in full so Tailwind keeps the classes; index 0 = no games
const HEAT_CLASSES = [
  "bg-surface-3",
  "bg-heat-1",
  "bg-heat-2",
  "bg-heat-3",
  "bg-heat-4",
];

const heatLevel = (count, max) =>
  count === 0 ? 0 : Math.max(1, Math.ceil((count / max) * 4));

const pluralGames = (n) => {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "игра";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "игры";
  return "игр";
};

const pad = (h) => String(h).padStart(2, "0");

const Stat = ({ label, value, detail }) => (
  <div>
    <div className="label">{label}</div>
    <div className="font-mono text-sm text-ink tabular-nums mt-0.5">{value}</div>
    <div className="font-mono text-[11px] text-ink-2 tabular-nums">{detail}</div>
  </div>
);

const describeStats = ({ games, wins, losses }) =>
  `${games} ${pluralGames(games)}${wins + losses > 0 ? ` · ${wins}W ${losses}L` : ""}`;

/**
 * Play time today / this week and a weekday × hour heatmap of when the
 * player starts games, from the sessions the tracker has seen.
 */
export const ActivityPanel = ({ sessions = [] }) => {
  if (sessions.length === 0) {
    return (
      <div className="font-mono text-xs text-ink-2">
        активность появится после первой замеченной игры
      </div>
    );
  }

  const { today, week } = getRecentPlayStats(sessions);
  const grid = getWeeklyHeatmap(sessions);
  const max = Math.max(...grid.flat());

  let peak = { day: 0, hour: 0, count: 0 };
  grid.forEach((row, day) =>
    row.forEach((count, hour) => {
      if (count > peak.count) peak = { day, hour, count };
    }),
  );
  const peakText = `${DAYS[peak.day]}, ${pad(peak.hour)}:00`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        <Stat
          label="сегодня"
          value={formatPlayTime(today.ms)}
          detail={describeStats(today)}
        />
        <Stat
          label="7 дней"
          value={formatPlayTime(week.ms)}
          detail={describeStats(week)}
        />
        <Stat
          label="чаще всего"
          value={peakText}
          detail={`${sessions.length} ${pluralGames(sessions.length)} в истории`}
        />
      </div>

      <figure className="max-w-xl">
        <div
          role="img"
          aria-label={`Начатые игры по дням недели и часам. Чаще всего: ${peakText}.`}
          className="grid grid-cols-[auto_repeat(24,minmax(0,1fr))] gap-[2px]"
        >
          <span />
          {HOURS.map((h) => (
            <span
              key={h}
              className="font-mono text-[9px] leading-3 text-ink-2"
            >
              {h % 6 === 0 ? pad(h) : ""}
            </span>
          ))}
          {grid.map((row, day) => (
            <React.Fragment key={DAYS[day]}>
              <span className="font-mono text-[10px] leading-3 text-ink-2 pr-1.5">
                {DAYS[day]}
              </span>
              {row.map((count, hour) => (
                <span
                  key={hour}
                  title={`${DAYS[day]} ${pad(hour)}:00–${pad((hour + 1) % 24)}:00 · ${count} ${pluralGames(count)}`}
                  // Cells appear in a diagonal wave (full motion only)
                  style={{ "--fx-delay": `${hour * 14 + day * 22}ms` }}
                  className={`fx-cell h-3 rounded-[1px] ${HEAT_CLASSES[heatLevel(count, max)]}`}
                />
              ))}
            </React.Fragment>
          ))}
        </div>
        <figcaption className="flex items-center gap-1.5 mt-2 font-mono text-[10px] text-ink-2">
          <span>меньше</span>
          {HEAT_CLASSES.map((c) => (
            <span key={c} className={`size-2.5 rounded-[1px] ${c}`} />
          ))}
          <span>больше игр</span>
        </figcaption>
      </figure>
    </div>
  );
};
