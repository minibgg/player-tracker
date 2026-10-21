import React, { useEffect, useRef, useState } from "react";
import { formatRpChange } from "../../data/apexRanks";
import { formatTimestamp } from "../../services/timeFormat";

const HEIGHT = 150;
const PAD = { top: 14, right: 14, bottom: 22, left: 58 };
const TOOLTIP_W = 168;

const formatScore = (n) => Math.round(n).toLocaleString("ru-RU");

const useElementWidth = () => {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width];
};

/**
 * RP over the current season as a step line: RP only moves when a match is
 * counted, so the value holds flat between changes. One series, so no
 * legend: the label above names it. Hover or arrow keys read each change.
 * rpLog: [{ at, score, season }], oldest first.
 */
export const RpChart = ({ rpLog = [], now }) => {
  const [ref, width] = useElementWidth();
  const [active, setActive] = useState(null);

  const season = rpLog[rpLog.length - 1]?.season;
  const points = rpLog.filter((p) => p.season === season);

  // The measured wrapper stays mounted, so the chart appears with the
  // first change without a remount
  if (points.length < 2) {
    return (
      <figure ref={ref}>
        <p className="text-xs text-ink-2">
          График появится, когда трекер увидит хотя бы одно изменение RP.
        </p>
      </figure>
    );
  }

  const t0 = points[0].at;
  const t1 = Math.max(now, points[points.length - 1].at);
  const scores = points.map((p) => p.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  // Some air above and below; a flat line still gets a visible band
  const span = Math.max(max - min, 50);
  const lo = min - span * 0.12;
  const hi = max + span * 0.12;

  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (t) => PAD.left + ((t - t0) / Math.max(1, t1 - t0)) * plotW;
  const y = (v) => PAD.top + ((hi - v) / (hi - lo)) * plotH;

  const path =
    `M${x(points[0].at)},${y(points[0].score)}` +
    points
      .slice(1)
      .map((p) => `H${x(p.at)}V${y(p.score)}`)
      .join("") +
    `H${x(t1)}`;

  const gridValues = min === max ? [min] : [max, (min + max) / 2, min];
  const last = points[points.length - 1];
  const activePoint = active !== null ? points[active] : null;
  const delta = (i) => (i > 0 ? points[i].score - points[i - 1].score : null);

  // The crosshair snaps to the nearest change
  const onPointerMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - box.left;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.at) - mx) < Math.abs(x(points[best].at) - mx)) best = i;
    });
    setActive(best);
  };

  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    setActive((i) =>
      Math.min(points.length - 1, Math.max(0, (i ?? points.length - 1) + step)),
    );
  };

  return (
    <figure ref={ref} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          tabIndex={0}
          aria-label={`RP за сезон: от ${formatScore(points[0].score)} до ${formatScore(last.score)}, изменений: ${points.length - 1}. Стрелки влево и вправо читают изменения.`}
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKeyDown}
          onBlur={() => setActive(null)}
          className="block touch-none focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        >
          {gridValues.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(v)}
                y2={y(v)}
                className="stroke-line"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y(v)}
                dy="0.32em"
                textAnchor="end"
                className="fill-ink-2 font-mono text-[10px]"
              >
                {formatScore(v)}
              </text>
            </g>
          ))}

          <text
            x={PAD.left}
            y={HEIGHT - 6}
            className="fill-ink-2 font-mono text-[10px]"
          >
            {formatTimestamp(t0)}
          </text>
          <text
            x={width - PAD.right}
            y={HEIGHT - 6}
            textAnchor="end"
            className="fill-ink-2 font-mono text-[10px]"
          >
            сейчас
          </text>

          <path
            d={path}
            fill="none"
            className="stroke-accent"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {activePoint && (
            <>
              <line
                x1={x(activePoint.at)}
                x2={x(activePoint.at)}
                y1={PAD.top}
                y2={HEIGHT - PAD.bottom}
                className="stroke-line-strong"
                strokeWidth="1"
              />
              <circle
                cx={x(activePoint.at)}
                cy={y(activePoint.score)}
                r="4"
                className="fill-accent stroke-surface"
                strokeWidth="2"
              />
            </>
          )}

          {/* Where the season stands now */}
          <circle
            cx={x(t1)}
            cy={y(last.score)}
            r="4"
            className="fill-accent stroke-surface"
            strokeWidth="2"
          />
        </svg>
      )}

      {activePoint && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 px-2.5 py-1.5 border border-line-strong bg-canvas font-mono text-[11px] text-ink"
          style={{
            width: TOOLTIP_W,
            left: Math.min(
              Math.max(0, x(activePoint.at) - TOOLTIP_W / 2),
              Math.max(0, width - TOOLTIP_W),
            ),
          }}
        >
          <div className="text-ink-2">{formatTimestamp(activePoint.at)}</div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="tabular-nums">{formatScore(activePoint.score)} RP</span>
            {delta(active) !== null && (
              <span className="tabular-nums text-ink-2">
                {formatRpChange(delta(active))}
              </span>
            )}
          </div>
        </div>
      )}
    </figure>
  );
};
