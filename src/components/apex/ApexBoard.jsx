import React, { useState } from "react";
import { ShieldAlert } from "lucide-react";
import { Reveal } from "../Reveal";
import { ApexFirstRunGuide, NoMatchesState } from "../EmptyState";
import { ApexAddPlayerBar } from "./ApexAddPlayerBar";
import { ApexPlayerCard } from "./ApexPlayerCard";
import { ApexProfileModal } from "./ApexProfileModal";
import { ApexMapRotation } from "./ApexMapRotation";
import { ApexLeaderboard } from "./ApexLeaderboard";

/**
 * The Apex Legends tab: key warning, map rotation, add bar and the list.
 * Its watchlist and polling live in App, so they keep running while the
 * League tab is open.
 */
export const ApexBoard = ({
  apiKey,
  isKeyRejected,
  openSettings,
  watchlist,
  players,
  isAddingPlayer,
  onAddPlayer,
  onCheckPlayer,
  checkingPlayerIds,
  onToggleTracking,
  onDeletePlayer,
  onTogglePin,
  onToggleMute,
  onResetFilter,
  listRef,
}) => {
  // By id, so the open profile follows every poll
  const [profileId, setProfileId] = useState(null);
  const profilePlayer = watchlist.find((p) => p.id === profileId) || null;

  return (
    <>
      {(isKeyRejected || !apiKey) && watchlist.length > 0 && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-warn/50 bg-warn/10 px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-warn shrink-0 mt-0.5" />
            <div className="text-sm text-ink">
              {apiKey
                ? "Apex Legends API отклонил ключ."
                : "Нужен API-ключ Apex Legends Status."}{" "}
              <span className="text-ink-2">
                {apiKey
                  ? "Проверьте ключ на portal.apexlegendsapi.com. Автоопрос Apex ждёт новый ключ."
                  : "Без него список Apex не обновляется. Ключ бесплатный."}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={openSettings}
            className="btn-primary px-4 h-9 font-mono text-xs shrink-0"
          >
            {apiKey ? "обновить ключ" : "указать ключ"}
          </button>
        </div>
      )}

      <Reveal>
        <ApexMapRotation apiKey={isKeyRejected ? "" : apiKey} />
      </Reveal>

      <Reveal>
        <ApexAddPlayerBar
          onAddPlayer={onAddPlayer}
          isAdding={isAddingPlayer}
          hasApiKey={Boolean(apiKey)}
          openSettings={openSettings}
        />
      </Reveal>

      <section
        id="watchlist"
        tabIndex={-1}
        aria-label="Список наблюдения Apex"
        className="focus:outline-none"
      >
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="label">Список</h2>
          <span className="label tabular-nums">
            {players.length} / {watchlist.length}
          </span>
        </div>

        {watchlist.length === 0 ? (
          <ApexFirstRunGuide
            hasApiKey={Boolean(apiKey)}
            openSettings={openSettings}
            focusAddInput={() =>
              document.getElementById("apex-name-input")?.focus()
            }
          />
        ) : players.length === 0 ? (
          <NoMatchesState onReset={onResetFilter} />
        ) : (
          <div ref={listRef} className="relative border-t border-line">
            {players.map((player, index) => (
              <Reveal
                key={player.id}
                data-flip-id={player.id}
                delay={Math.min(index, 8) * 60}
              >
                <ApexPlayerCard
                  player={player}
                  onCheckPlayer={(p) => onCheckPlayer(p)}
                  onToggleTracking={onToggleTracking}
                  onDeletePlayer={onDeletePlayer}
                  onTogglePin={onTogglePin}
                  onToggleMute={onToggleMute}
                  onOpenProfile={(p) => setProfileId(p.id)}
                  isChecking={checkingPlayerIds.has(player.id)}
                />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <Reveal>
        <ApexLeaderboard
          watchlist={watchlist}
          onOpenProfile={(p) => setProfileId(p.id)}
        />
      </Reveal>

      <ApexProfileModal
        player={profilePlayer}
        apiKey={isKeyRejected ? "" : apiKey}
        onClose={() => setProfileId(null)}
        onRefresh={onCheckPlayer}
        isChecking={profilePlayer ? checkingPlayerIds.has(profilePlayer.id) : false}
      />
    </>
  );
};
