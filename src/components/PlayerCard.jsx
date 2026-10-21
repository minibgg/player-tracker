import React, { useState } from "react";
import {
  RotateCw,
  Trash2,
  Play,
  Pause,
  History,
  ScrollText,
  Pin,
  Eye,
  Bell,
  BellOff,
} from "lucide-react";
import { ActivityPanel } from "./ActivityPanel";
import { useGameClock } from "../hooks/useGameClock";
import {
  getChampionByKey,
  getChampionIconUrl,
  getProfileIconUrl,
} from "../services/ddragon";
import { getQueueInfo } from "../data/queues";
import { getRegionById } from "../data/regions";
import { formatRank, formatRankDetails } from "../data/ranks";
import { getOutcomeLabel } from "../services/matchResult";
import { IconButton, Divider, StatusLog } from "./RowParts";
import {
  formatDuration,
  formatTimestamp,
  formatTimeAgo,
} from "../services/timeFormat";

// One line with the outcome of the player's last finished match
const LastMatchResult = ({ result }) => {
  const champion = getChampionByKey(result.championId);
  const outcomeColor = result.remake
    ? "text-ink-2"
    : result.win
      ? "text-success"
      : "text-danger";

  return (
    <div className="flex items-center gap-2 text-xs min-w-0">
      <img
        src={getChampionIconUrl(result.championId)}
        alt=""
        className="size-5 rounded-sm border border-line object-cover bg-surface-3 shrink-0"
      />
      <span className={`font-mono uppercase shrink-0 ${outcomeColor}`}>
        {getOutcomeLabel(result)}
      </span>
      <span className="text-ink truncate">
        {champion.name} {result.kills}/{result.deaths}/{result.assists}
      </span>
      {result.lpChange && (
        <span className="font-mono text-ink shrink-0">{result.lpChange}</span>
      )}
      <span className="font-mono text-ink-2 shrink-0">
        {formatTimeAgo(result.endedAt)}
      </span>
    </div>
  );
};

export const PlayerCard = ({
  player,
  onCheckPlayer,
  onToggleTracking,
  onDeletePlayer,
  onViewMatch,
  onTogglePin,
  onToggleMute,
  onOpenMatchHistory,
  isChecking,
}) => {
  const [showHistory, setShowHistory] = useState(false);

  const region = getRegionById(player.region);
  const isInGame = player.status === "IN_GAME";
  const currentGame = player.currentGame;
  const isPinned = Boolean(player.isPinned);

  // Solo/Duo first; fall back to Flex for players who only play that
  const soloRank = player.ranks?.solo;
  const flexRank = player.ranks?.flex;
  const shownRank = soloRank || flexRank;
  const rankTitle = [
    soloRank && `Solo/Duo: ${formatRankDetails(soloRank)}`,
    flexRank && `Flex: ${formatRankDetails(flexRank)}`,
  ]
    .filter(Boolean)
    .join("\n");

  const gameDurationSeconds = useGameClock(isInGame ? currentGame : null);

  // Celebrate changes that happen while the page is open, not on every load:
  // compare against what the row showed when it mounted
  const [mountGameId] = useState(() => currentGame?.gameId ?? null);
  const [mountResultId] = useState(
    () => player.lastMatchResult?.matchId ?? null,
  );
  const wentLive =
    isInGame && currentGame?.gameId != null && currentGame.gameId !== mountGameId;
  const freshResult =
    player.lastMatchResult != null &&
    player.lastMatchResult.matchId !== mountResultId;

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
      className={`relative overflow-hidden border-b border-line transition-colors ${
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

      {/* One sweep of light when the player starts a game */}
      {wentLive && (
        <span
          key={currentGame.gameId}
          aria-hidden="true"
          className="fx-sweep absolute inset-0 bg-gradient-to-r from-transparent via-success/30 to-transparent"
        />
      )}

      {/* Phones: stacked. Tablet / narrow desktop: identity over status, actions
          on the right. Wide desktop: one line of four columns. */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_minmax(0,1fr)_auto] xl:grid-cols-[auto_minmax(0,1.1fr)_minmax(0,1.3fr)_auto] items-center gap-x-4 gap-y-3 pl-5 pr-4 py-4">
        {/* Avatar */}
        <button
          type="button"
          onClick={openHistory}
          title="История матчей"
          aria-label={`История матчей: ${player.gameName}`}
          className="relative shrink-0 md:row-span-2 md:self-start xl:row-span-1 xl:self-center"
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
            {shownRank ? (
              <span className="text-ink" title={rankTitle}>
                {!soloRank && "flex "}
                {formatRank(shownRank)}
              </span>
            ) : (
              player.ranks && <span>без ранга</span>
            )}
            {isPinned && <span className="text-accent-ink">закреплён</span>}
            {!player.isTracking && <span className="text-warn">пауза</span>}
            {player.isMuted && <span>без уведомлений</span>}
          </div>
        </div>

        {/* Status / live match */}
        <div className="col-span-2 md:col-span-1 md:col-start-2 xl:col-start-3 xl:row-start-1 min-w-0">
          {/* No "checking…" swap here: it made every row flicker once a
              minute. The spinning refresh button shows a check in flight. */}
          {isInGame ? (
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={getChampionIconUrl(champion?.key || champion?.id)}
                alt={champion?.name || "Чемпион"}
                key={currentGame?.gameId}
                className={`size-10 rounded-sm border border-success/60 object-cover bg-surface-3 shrink-0 ${wentLive ? "fx-pop" : ""}`}
              />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-ink truncate">
                  {champion?.name || "Чемпион"}
                </div>
                <div className={`label truncate ${queueInfo?.color || ""}`}>
                  {queueInfo?.name || "Матч"}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div
                  className="flex items-center justify-end gap-2 font-mono text-2xl leading-none tabular-nums text-success"
                  title="Время матча"
                >
                  <span
                    aria-hidden="true"
                    className="size-1.5 rounded-full bg-success animate-pulse"
                  />
                  {formatDuration(gameDurationSeconds)}
                </div>
                <button
                  type="button"
                  onClick={() => onViewMatch(player)}
                  className="inline-flex items-center gap-1 mt-1.5 font-mono text-[11px] text-ink-2 hover:text-accent-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  составы
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 font-mono text-xs text-ink-2">
                <span className="size-2 rounded-full border border-ink-2" />
                не в матче · {player.lastChecked ? `проверен ${formatTimestamp(player.lastChecked)}` : "ещё не проверялся"}
              </div>
              {player.pendingResult ? (
                <div className="font-mono text-xs text-ink-2">
                  итог матча загружается…
                </div>
              ) : (
                player.lastMatchResult && (
                  <div
                    key={player.lastMatchResult.matchId}
                    className={freshResult ? "fx-slide-in" : ""}
                  >
                    <LastMatchResult result={player.lastMatchResult} />
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="col-span-2 md:col-span-1 md:col-start-3 md:row-start-1 md:row-span-2 xl:col-start-4 xl:row-span-1 flex items-center gap-0.5 -ml-1.5 md:ml-0 md:justify-end">
          {/* Look: check now, activity + log, match history */}
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
          <IconButton onClick={openHistory} title="История матчей">
            <ScrollText className="w-3.5 h-3.5" />
          </IconButton>
          <Divider />
          {/* Tracking state: pin, mute, pause */}
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

      {/* Status log: terminal-style lines */}
      {showHistory && (
        <div className="fx-expand pl-5 pr-4 pb-4 space-y-4">
          <ActivityPanel sessions={player.sessions} />
          <StatusLog history={player.statusHistory} />
        </div>
      )}
    </article>
  );
};
