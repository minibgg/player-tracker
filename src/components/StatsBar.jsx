import React from "react";
import { Search, X } from "lucide-react";

const FILTERS = [
  { id: "ALL", label: "Все" },
  { id: "IN_GAME", label: "В игре" },
  { id: "NOT_IN_GAME", label: "Не в игре" },
  { id: "PINNED", label: "Закреплённые" },
];

export const StatsBar = ({
  watchlist,
  filterStatus,
  setFilterStatus,
  searchQuery,
  setSearchQuery,
}) => {
  const counts = {
    ALL: watchlist.length,
    IN_GAME: watchlist.filter((p) => p.status === "IN_GAME").length,
    NOT_IN_GAME: watchlist.filter((p) => p.status === "NOT_IN_GAME").length,
    PINNED: watchlist.filter((p) => p.isPinned).length,
  };

  return (
    <section
      aria-label="Сводка и фильтры"
      className="px-5 lg:px-6 py-5 space-y-6 border-t border-line flex-1"
    >
      {/* Big numerals */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div
            className={`font-display text-6xl leading-none tabular-nums ${
              counts.IN_GAME > 0 ? "text-success" : "text-ink-2"
            }`}
          >
            {counts.IN_GAME}
          </div>
          <div className="label mt-2">в игре</div>
        </div>
        <div>
          <div className="font-display text-6xl leading-none tabular-nums text-ink">
            {counts.ALL}
          </div>
          <div className="label mt-2">отслеживается</div>
        </div>
      </div>

      {/* Filters */}
      <div role="group" aria-label="Фильтр по статусу">
        {FILTERS.map((f) => {
          const active = filterStatus === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={active}
              onClick={() => setFilterStatus(f.id)}
              className={`flex w-full items-center justify-between py-2.5 border-b border-line font-mono text-xs uppercase tracking-wider transition-colors ${
                active ? "text-ink" : "text-ink-2 hover:text-ink"
              }`}
            >
              <span className="flex items-center gap-2">
                <span
                  className={active ? "text-accent-ink" : "text-transparent"}
                  aria-hidden="true"
                >
                  ›
                </span>
                {f.label}
              </span>
              <span className="tabular-nums">{counts[f.id]}</span>
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
