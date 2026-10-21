import React, { useState } from "react";
import {
  RotateCw,
  Trash2,
  Play,
  Pause,
  History,
  ScrollText,
  Pin,
  Bell,
  BellOff,
} from "lucide-react";
import { ActivityPanel } from "../ActivityPanel";
import { IconButton, Divider, StatusLog } from "../RowParts";
import { LegendIcon } from "./LegendIcon";
import { useGameClock } from "../../hooks/useGameClock";
import { getApexPlatform, PRESENCE } from "../../data/apexPlatforms";
import {
  formatApexRank,
  formatRpChange,
  isRanked,
} from "../../data/apexRanks";
import {
  getApexOutcomeLabel,
  formatKills,
  formatDamage,
} from "../../services/apexMatch";
import {
  formatDuration,
  formatTimestamp,
  formatTimeAgo,
} from "../../services/timeFormat";

// One line with what the tracker saw of the player's last match
const LastApexResult = ({ result }) => {
  const outcomeColor =
    result.win === true
      ? "text-success"
      : result.counted
        ? "text-ink"
        : "text-ink-2";
  const details = [
    result.legend,
    result.kills != null && formatKills(result.kills),
    result.damage != null && formatDamage(result.damage),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-2 text-xs min-w-0">
      <LegendIcon legend={result.legend} className="size-5 border-line" />
      <span className={`font-mono uppercase shrink-0 ${outcomeColor}`}>
        {getApexOutcomeLabel(result)}
      </span>
      <span className="text-ink truncate">{details}</span>
      {result.rpChange != null && (
        <span className="font-mono text-ink shrink-0">
          {formatRpChange(result.rpChange)}
        </span>
      )}
      <span className="font-mono text-ink-2 shrink-0">
        {formatTimeAgo(result.endedAt)}
      </span>
    </div>
  );
};

export const ApexPlayerCard = ({
  player,
  onCheckPlayer,
  onToggleTracking,
  onDeletePlayer,
  onTogglePin,
  onToggleMute,
  onOpenProfile,
  isChecking,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  const platform = getApexPlatform(player.platform);
  const isInGame = player.status === "IN_GAME";
  const currentGame = player.currentGame;
  const isPinned = Boolean(player.isPinned);
  const presence = PRESENCE[player.status] || PRESENCE.OFFLINE;

  const gameDurationSeconds = useGameClock(isInGame ? currentGame : null);

  // Celebrate changes that happen while the page is open, not on every load
  const [mountMatchKey] = useState(() => currentGame?.matchKey ?? null);
  const [mountResultKey] = useState(
    () => player.lastMatchResult?.matchKey ?? null,
  );
  const wentLive =
    isInGame &&
    currentGame?.matchKey != null &&
    currentGame.matchKey !== mountMatchKey;
  const freshResult =
    player.lastMatchResult != null &&
    player.lastMatchResult.matchKey !== mountResultKey;

  const openProfile = () => onOpenProfile(player);

  return (
    <article
      className={`relative overflow-hidden border-b border-line transition-colors ${
        isInGame ? "bg-success/[0.06]" : "hover:bg-surface"
      }`}
    >
      {/* Left rail: live / online / pinned marker */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 bottom-0 w-0.5 ${
          isInGame
            ? "bg-success animate-pulse"
            : player.status === "IN_LOBBY"
              ? "bg-info/70"
              : isPinned
                ? "bg-accent"
                : "bg-transparent"
        }`}
      />

      {wentLive && (
        <span
          key={currentGame.matchKey}
          aria-hidden="true"
          className="fx-sweep absolute inset-0 bg-gradient-to-r from-transparent via-success/30 to-transparent"
        />
      )}

      {/* Same grid as the League rows */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_minmax(0,1fr)_auto] xl:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.3fr)_auto] items-center gap-x-4 gap-y-3 pl-5 pr-4 py-4">
        {/* Avatar: the legend the player has picked */}
        <button
          type="button"
          onClick={openProfile}
          title="Профиль и матчи"
          aria-label={`Профиль: ${player.name}`}
          className="relative shrink-0 md:row-span-2 md:self-start xl:row-span-1 xl:self-center"
        >
          <LegendIcon
            legend={player.legend}
            className="size-12 border-line-strong text-xl"
          />
          {player.level > 0 && (
            <span className="absolute bottom-0 right-0 px-1 bg-canvas border-t border-l border-line-strong font-mono text-[10px] leading-4 text-ink">
              {player.level}
            </span>
          )}
        </button>

        {/* Identity */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <button
              type="button"
              onClick={openProfile}
              className="font-display text-xl text-ink hover:text-accent-ink truncate max-w-full text-left transition-colors"
            >
              {player.name}
            </button>
            <span className="font-mono text-xs text-ink-2">
              {platform.short}
            </span>
          </div>
          <div className="label mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {isRanked(player.rank) ? (
              <span className="text-ink" title={player.rank.season || ""}>
                {formatApexRank(player.rank)}
              </span>
            ) : (
              player.rank && <span>без ранга</span>
            )}
            {player.isBanned && <span className="text-danger">бан</span>}
            {isPinned && <span className="text-accent-ink">закреплён</span>}
            {!player.isTracking && <span className="text-warn">пауза</span>}
            {player.isMuted && <span>без уведомлений</span>}
          </div>
        </div>

        {/* Status / live match */}
        <div className="col-span-2 md:col-span-1 md:col-start-2 xl:col-start-3 xl:row-start-1 min-w-0">
          {isInGame ? (
            <div className="flex items-center gap-3 min-w-0">
              <span
                key={currentGame?.matchKey}
                className={wentLive ? "fx-pop inline-flex" : "inline-flex"}
              >
                <LegendIcon
                  legend={currentGame?.legend}
                  className="size-10 border-success/60 text-lg"
                />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-ink truncate">
                  {currentGame?.legend || "Выбор легенды"}
                </div>
                <div className="label truncate text-success">матч идёт</div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className="flex items-center justify-end gap-2 font-mono text-2xl leading-none tabular-nums text-success"
                  title="Время в матче"
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-success animate-pulse"
                  />
                  {formatDuration(gameDurationSeconds)}
                </div>
                <button
                  type="button"
                  onClick={openProfile}
                  className="inline-flex items-center gap-1 mt-1.5 font-mono text-[11px] text-ink-2 hover:text-accent-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent transition-colors"
                >
                  <ScrollText className="w-3 h-3" />
                  профиль
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 font-mono text-xs text-ink-2 min-w-0">
                <span className={`size-2 rounded-full shrink-0 ${presence.dot}`} />
                <span className="truncate">
                  <span
                    className={player.status === "IN_LOBBY" ? "text-info" : ""}
                  >
                    {presence.label}
                  </span>
                  {player.status === "IN_LOBBY" && player.legend
                    ? ` · ${player.legend}`
                    : ""}
                  {" · "}
                  {player.lastChecked
                    ? `проверен ${formatTimestamp(player.lastChecked)}`
                    : "ещё не проверялся"}
                </span>
              </div>
              {player.pendingResult ? (
                <div className="font-mono text-xs text-ink-2">
                  итог матча считается…
                </div>
              ) : (
                player.lastMatchResult && (
                  <div
                    key={player.lastMatchResult.matchKey}
                    className={freshResult ? "fx-slide-in" : ""}
                  >
                    <LastApexResult result={player.lastMatchResult} />
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="col-span-2 md:col-span-1 md:col-start-3 md:row-start-1 md:row-span-2 xl:col-start-4 xl:row-span-1 flex items-center gap-0.5 -ml-1.5 md:ml-0 md:justify-end">
          <IconButton
            onClick={() => onCheckPlayer(player)}
            disabled={isChecking}
            title="Проверить статус сейчас"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`}
            />
          </IconButton>
          <IconButton
            onClick={() => setShowHistory(!showHistory)}
            active={showHistory}
            title="Активность и лог статусов"
          >
            <History className="w-3.5 h-3.5" />
          </IconButton>
          <IconButton onClick={openProfile} title="Профиль и матчи">
            <ScrollText className="w-3.5 h-3.5" />
          </IconButton>
          <Divider />
          <IconButton
            onClick={() => onToggleTracking(player.id)}
            title={
              player.isTracking
                ? "Приостановить отслеживание"
                : "Возобновить отслеживание"
            }
          >
            {player.isTracking ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5 text-warn" />
            )}
          </IconButton>
          <IconButton
            onClick={() => onTogglePin(player.id)}
            active={isPinned}
            title={isPinned ? "Открепить игрока" : "Закрепить вверху списка"}
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? "fill-accent" : ""}`} />
          </IconButton>
          <IconButton
            onClick={() => onToggleMute(player.id)}
            active={player.isMuted}
            title={
              player.isMuted
                ? "Включить уведомления об этом игроке"
                : "Без уведомлений: только тосты и лог"
            }
          >
            {player.isMuted ? (
              <BellOff className="w-3.5 h-3.5" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
          </IconButton>
          <Divider />
          <IconButton
            onClick={() => onDeletePlayer(player.id)}
            danger
            title="Удалить игрока из списка"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>

      {showHistory && (
        <div className="fx-expand pl-5 pr-4 pb-4 space-y-4">
          <ActivityPanel sessions={player.sessions} />
          <StatusLog history={player.statusHistory} />
        </div>
      )}
    </article>
  );
};
