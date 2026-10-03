import React, { useState, useEffect } from "react";
import {
  RotateCw,
  Trash2,
  Play,
  Pause,
  History,
  ScrollText,
  Pin,
  Eye,
} from "lucide-react";
import {
  getChampionByKey,
  getChampionIconUrl,
  getProfileIconUrl,
} from "../services/ddragon";
import { getQueueInfo } from "../data/queues";
import { getRegionById } from "../data/regions";

// Square, hairline icon button used in a row's action strip
const IconButton = ({
  onClick,
  title,
  active = false,
  danger = false,
  disabled = false,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    aria-pressed={active || undefined}
    className={`inline-flex items-center justify-center gap-1 h-8 min-w-8 px-2 border font-mono text-[11px] transition-colors disabled:opacity-50 ${
      danger
        ? "border-line text-ink-2 hover:text-danger hover:border-danger/50"
        : active
          ? "border-accent/60 text-accent-ink"
          : "border-line text-ink-2 hover:text-ink hover:border-line-strong"
    }`}
  >
    {children}
  </button>
);

const formatDuration = (totalSeconds) => {
  if (totalSeconds < 0) return "00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return "никогда";
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

export const PlayerCard = ({
  player,
  onCheckPlayer,
  onToggleTracking,
  onDeletePlayer,
  onViewMatch,
  onTogglePin,
  onOpenMatchHistory,
  isChecking,
}) => {
  const [showHistory, setShowHistory] = useState(false);
  const [gameDurationSeconds, setGameDurationSeconds] = useState(0);

  const region = getRegionById(player.region);
  const isInGame = player.status === "IN_GAME";
  const currentGame = player.currentGame;
  const isPinned = Boolean(player.isPinned);

  // Live in-game stopwatch
  useEffect(() => {
    if (!isInGame || !currentGame) {
      setGameDurationSeconds(0);
      return;
    }

    const calculateSeconds = () => {
      if (currentGame.gameStartTime && currentGame.gameStartTime > 0) {
        return Math.max(
          0,
          Math.floor((Date.now() - currentGame.gameStartTime) / 1000),
        );
      }
      return currentGame.gameLength || 0;
    };

    setGameDurationSeconds(calculateSeconds());
    const interval = setInterval(() => {
      setGameDurationSeconds(calculateSeconds());
    }, 1000);

    return () => clearInterval(interval);
  }, [isInGame, currentGame]);

  // Find player's champion in active game
  let champion = null;
  let queueInfo = null;
  if (isInGame && currentGame) {
    const participant = currentGame.participants?.find(
      (p) =>
        p.puuid === player.puuid ||
        p.riotId?.toLowerCase().startsWith(player.gameName.toLowerCase()),
    );
    const champKey = participant?.championId || currentGame.championId;
    champion = getChampionByKey(champKey);
    queueInfo = getQueueInfo(currentGame.gameQueueConfigId);
  }

  const openHistory = () => onOpenMatchHistory && onOpenMatchHistory(player);

  return (
    <article
      className={`relative border-b border-line transition-colors ${
        isInGame ? "bg-success/[0.06]" : "hover:bg-surface"
      }`}
    >
      {/* Left rail: live / pinned marker */}
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 bottom-0 w-0.5 ${
          isInGame
            ? "bg-success animate-pulse"
            : isPinned
              ? "bg-accent"
              : "bg-transparent"
        }`}
      />

      <div className="grid grid-cols-[auto_minmax(0,1fr)] lg:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.3fr)_auto] items-center gap-x-4 gap-y-3 pl-5 pr-4 py-4">
        {/* Avatar */}
        <button
          type="button"
          onClick={openHistory}
          title="История матчей"
          aria-label={`История матчей: ${player.gameName}`}
          className="relative shrink-0"
        >
          <img
            src={getProfileIconUrl(player.profileIconId)}
            alt=""
            className="size-12 rounded-sm border border-line-strong object-cover bg-surface-3"
            onError={(e) => {
              e.target.src =
                "https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/29.png";
            }}
          />
          {player.summonerLevel && (
            <span className="absolute bottom-0 right-0 px-1 bg-canvas border-t border-l border-line-strong font-mono text-[10px] leading-4 text-ink">
              {player.summonerLevel}
            </span>
          )}
        </button>

        {/* Identity */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <button
              type="button"
              onClick={openHistory}
              className="font-display text-xl text-ink hover:text-accent-ink truncate max-w-full text-left transition-colors"
            >
              {player.gameName}
            </button>
            <span className="font-mono text-xs text-ink-2">
              #{player.tagLine}
            </span>
          </div>
          <div className="label mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            <span>{region.short}</span>
            {isPinned && <span className="text-accent-ink">закреплён</span>}
            {player.puuid && <span title="PUUID в локальном кэше">кэш</span>}
            {!player.isTracking && <span className="text-warn">пауза</span>}
          </div>
        </div>

        {/* Status / live match */}
        <div className="col-span-2 lg:col-span-1 min-w-0">
          {isChecking ? (
            <div className="flex items-center gap-2 font-mono text-xs text-warn">
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              опрос…
            </div>
          ) : isInGame ? (
            <div className="flex items-center gap-3 flex-wrap">
              <img
                src={getChampionIconUrl(champion?.key || champion?.id)}
                alt={champion?.name || "Champion"}
                className="size-10 rounded-sm border border-success/60 object-cover bg-surface-3"
              />
              <div className="min-w-0">
                <div className="text-sm text-ink truncate">
                  {champion?.name || "Champion"}
                </div>
                <div className={`label ${queueInfo?.color || ""}`}>
                  {queueInfo?.name || "Матч"}
                </div>
              </div>
              <div
                className="font-mono text-2xl tabular-nums text-success ml-auto lg:ml-2"
                title="Время матча"
              >
                {formatDuration(gameDurationSeconds)}
              </div>
              <button
                type="button"
                onClick={() => onViewMatch(player)}
                className="btn-ghost inline-flex items-center gap-1.5 h-8 px-3 font-mono text-xs"
              >
                <Eye className="w-3.5 h-3.5" />
                составы
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 font-mono text-xs text-ink-2">
              <span className="size-2 rounded-full border border-ink-2" />
              не в матче · проверен {formatTimestamp(player.lastChecked)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="col-span-2 lg:col-span-1 flex items-center gap-1 lg:justify-end">
          <IconButton
            onClick={() => onCheckPlayer(player)}
            disabled={isChecking}
            title="Проверить статус сейчас"
          >
            <RotateCw
              className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`}
            />
          </IconButton>
          <IconButton onClick={openHistory} title="История матчей">
            <ScrollText className="w-3.5 h-3.5" />
          </IconButton>
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
            onClick={() => setShowHistory(!showHistory)}
            active={showHistory}
            title="Лог статусов"
          >
            <History className="w-3.5 h-3.5" />
            {player.statusHistory?.length > 0 && (
              <span>{player.statusHistory.length}</span>
            )}
          </IconButton>
          <IconButton
            onClick={() => onDeletePlayer(player.id)}
            danger
            title="Удалить игрока из списка"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </IconButton>
        </div>
      </div>

      {/* Status log: terminal-style lines */}
      {showHistory && (
        <div className="pl-5 pr-4 pb-4">
          {!player.statusHistory || player.statusHistory.length === 0 ? (
            <div className="font-mono text-xs text-ink-2">
              пока нет записей
            </div>
          ) : (
            <ol className="font-mono text-xs border-l border-line-strong pl-4 space-y-1 max-h-44 overflow-y-auto">
              {player.statusHistory.map((item, idx) => (
                <li key={idx} className="flex gap-3">
                  <time className="text-ink-2 shrink-0 tabular-nums">
                    {formatTimestamp(item.timestamp)}
                  </time>
                  <span
                    className={
                      item.status === "IN_GAME" ? "text-success" : "text-ink"
                    }
                  >
                    {item.message}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </article>
  );
};
