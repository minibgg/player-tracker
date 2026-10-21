import React, { useRef } from "react";

const GAMES = [
  { id: "lol", label: "League", name: "League of Legends" },
  { id: "apex", label: "Apex", name: "Apex Legends" },
];

/**
 * Switch between the League and Apex boards. Both keep polling in the
 * background, so each tab shows how many of its players are in a match.
 * liveCounts: { lol, apex }
 */
export const GameTabs = ({ activeGame, onChange, liveCounts }) => {
  const tabRefs = useRef({});

  // Arrow keys move between tabs, as in any tablist
  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const index = GAMES.findIndex((g) => g.id === activeGame);
    const next = GAMES[(index + step + GAMES.length) % GAMES.length];
    onChange(next.id);
    tabRefs.current[next.id]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label="Игра"
      className="grid grid-cols-2 border-b border-line"
      onKeyDown={onKeyDown}
    >
      {GAMES.map((game) => {
        const active = game.id === activeGame;
        const live = liveCounts[game.id] || 0;
        return (
          <button
            key={game.id}
            ref={(el) => {
              tabRefs.current[game.id] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${game.id}`}
            aria-selected={active}
            aria-controls="game-panel"
            tabIndex={active ? 0 : -1}
            title={game.name}
            onClick={() => onChange(game.id)}
            className={`fx-press relative flex items-center justify-between gap-2 h-12 px-4 lg:px-6 font-mono text-xs uppercase tracking-wider transition-colors first:border-r border-line ${
              active
                ? "text-ink bg-surface"
                : "text-ink-2 hover:text-ink hover:bg-surface"
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={active ? "text-accent-ink" : "text-transparent"}
              >
                ›
              </span>
              {game.label}
            </span>
            <span
              className={`flex items-center gap-1.5 tabular-nums ${
                live > 0 ? "text-success" : "text-ink-2"
              }`}
              aria-label={`в игре: ${live}`}
            >
              {live > 0 && (
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-success animate-pulse"
                />
              )}
              {live}
            </span>
            {active && (
              <span
                aria-hidden="true"
                className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent"
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
