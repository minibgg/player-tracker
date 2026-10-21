import React from "react";
import { Search, X } from "lucide-react";
import { STATUS_FILTERS } from "../services/watchlistView";


// Remounts on every change, so the new value rolls in like a departures board
const AnimatedNumber = ({ value }) => (
  <span key={value} className="fx-roll inline-block">
    {value}
  </span>
);

// filters: the active game's STATUS_FILTERS
export const StatsBar = ({
  watchlist,
  filters = STATUS_FILTERS.lol,
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
}) => {
  const counts = Object.fromEntries(
    filters.map((f) => [f.id, watchlist.filter(f.match).length]),
  );
  const inGameCount = watchlist.filter((p) => p.status === "IN_GAME").length;

  return (
    <section
      aria-label="Сводка и фильтры"
      className="px-4 lg:px-6 py-4 lg:py-5 space-y-4 lg:space-y-6 border-t border-line flex-1"
    >
      {/* Big numerals */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div
            className={`font-display text-4xl lg:text-6xl leading-none tabular-nums ${
              inGameCount > 0 ? "text-success" : "text-ink-2"
            }`}
          >
            <AnimatedNumber value={inGameCount} />
          </div>
          <div className="label mt-2">в игре</div>
        </div>
        <div>
          <div className="font-display text-4xl lg:text-6xl leading-none tabular-nums text-ink">
            <AnimatedNumber value={watchlist.length} />
          </div>
          <div className="label mt-2">отслеживается</div>
        </div>
      </div>

      {/* Filters: a row of chips on phones, a list in the rail */}
      <div
        role="group"
        aria-label="Фильтр по статусу"
        className="no-scrollbar flex gap-1.5 overflow-x-auto -mx-4 px-4 lg:block lg:mx-0 lg:px-0"
      >
        {filters.map((f) => {
          const active = filterStatus === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilterStatus(f.id)}
              className={`fx-press shrink-0 inline-flex items-center gap-2 h-8 px-3 border font-mono text-xs uppercase tracking-wider transition-colors lg:flex lg:w-full lg:justify-between lg:h-auto lg:px-0 lg:py-2.5 lg:border-0 lg:border-b lg:border-line ${
                active
                  ? "text-ink border-accent"
                  : "text-ink-2 border-line hover:text-ink"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={`hidden lg:inline ${active ? "text-accent-ink" : "text-transparent"}`}
                  aria-hidden="true"
                >
                  ›
                </span>
                {f.label}
              </span>
              <span className="tabular-nums text-ink-2 lg:text-inherit">{counts[f.id]}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="w-3.5 h-3.5 text-ink-2 absolute left-0 top-3 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="поиск по списку"
          aria-label="Поиск по списку игроков"
          className="w-full bg-transparent border-b border-line-strong pl-6 pr-6 py-2 font-mono text-xs text-ink placeholder-ink-2 rounded-none"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            aria-label="Очистить поиск"
            className="absolute right-0 top-2.5 text-ink-2 hover:text-ink"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </section>
  );
};
