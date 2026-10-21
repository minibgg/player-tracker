import React, { useState, useEffect } from "react";
import { X, RotateCw, Trophy, AlertTriangle } from "lucide-react";
import { fetchMatchHistory, getItemIconUrl } from "../services/matchHistory";
import {
  getChampionByKey,
  getChampionIconUrl,
  getProfileIconUrl,
} from "../services/ddragon";
import { getSpellIconUrl } from "../data/spells";
import { getQueueInfo } from "../data/queues";
import { getRegionById } from "../data/regions";

// Hooks live in the inner component; keying it by player resets the state
// when the user jumps to another player from a roster
export const PlayerMatchHistoryModal = (props) => {
  const { isOpen, player } = props;
  if (!isOpen || !player) return null;
  return (
    <PlayerMatchHistoryContent
      key={`${player.region}:${player.gameName}#${player.tagLine}`}
      {...props}
    />
  );
};

const PlayerMatchHistoryContent = ({
  onClose,
  player,
  apiKey,
  proxyType,
  customProxy,
  onSelectOtherPlayer,
}) => {
  // null while the first request is in flight
  const [history, setHistory] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetchMatchHistory({
      puuid: player.puuid,
      gameName: player.gameName,
      tagLine: player.tagLine,
      regionId: player.region,
      apiKey,
      proxyType,
      customProxy,
      count: 10,
    })
      .then((res) => {
        if (isMounted) setHistory(res);
      })
      .catch(() => {
        if (isMounted) {
          setHistory({ matches: [], error: "Не удалось загрузить историю." });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [player, apiKey, proxyType, customProxy]);

  // Escape closes the modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isLoading = history === null;
  const matches = history?.matches || [];
  const isCached = Boolean(history?.isCached);
  const isMock = Boolean(history?.isMock);
  const loadError = history?.error || "";

  const region = getRegionById(player.region);

  // Compute stats
  const totalGames = matches.length;
  const wins = matches.filter((m) => m.win).length;
  const losses = totalGames - wins;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

  const totalKills = matches.reduce((acc, m) => acc + (m.kills || 0), 0);
  const totalDeaths = matches.reduce((acc, m) => acc + (m.deaths || 0), 0);
  const totalAssists = matches.reduce((acc, m) => acc + (m.assists || 0), 0);
  const avgKills = totalGames > 0 ? (totalKills / totalGames).toFixed(1) : 0;
  const avgDeaths = totalGames > 0 ? (totalDeaths / totalGames).toFixed(1) : 0;
  const avgAssists =
    totalGames > 0 ? (totalAssists / totalGames).toFixed(1) : 0;
  const avgKda =
    totalDeaths === 0
      ? "Perfect"
      : ((totalKills + totalAssists) / Math.max(1, totalDeaths)).toFixed(2);

  const formatRelativeTime = (timestamp) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return "Только что";
    if (hours < 24) return `${hours} ч. назад`;
    const days = Math.floor(hours / 24);
    return `${days} дн. назад`;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}м ${String(secs).padStart(2, "0")}с`;
  };

  return (
    <div
      className="fx-fade fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-scrim/80"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-title"
        className="fx-modal w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface border border-line-strong"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 sm:px-6 py-5 border-b border-line flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative shrink-0">
              <img
                src={getProfileIconUrl(player.profileIconId)}
                alt=""
                className="size-14 rounded-sm border border-line-strong object-cover bg-surface-3"
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
            </div>
            <div className="min-w-0">
              <div className="label">История матчей · {region.short}</div>
              <h2
                id="history-title"
                className="font-display text-xl sm:text-2xl text-ink mt-1 truncate"
              >
                {player.gameName}
                {player.tagLine && (
                  <span className="font-mono text-sm text-ink-2 ml-2">
                    #{player.tagLine}
                  </span>
                )}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="p-2 -mr-2 text-ink-2 hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {matches.length > 0 && (
          <div className="px-5 sm:px-6 py-4 border-b border-line flex flex-wrap items-end justify-between gap-4">
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <div>
                <div className="label">Винрейт · {totalGames} игр</div>
                <div className="font-mono text-sm mt-0.5 tabular-nums">
                  <span
                    className={winRate >= 50 ? "text-success" : "text-danger"}
                  >
                    {winRate}%
                  </span>
                  <span className="text-ink-2">
                    {" "}
                    · {wins}W {losses}L
                  </span>
                </div>
              </div>
              <div>
                <div className="label">Средний K/D/A</div>
                <div className="font-mono text-sm mt-0.5 tabular-nums text-ink">
                  {avgKills} / <span className="text-danger">{avgDeaths}</span>{" "}
                  / {avgAssists}
                  <span className="text-ink-2"> · KDA {formatKda(avgKda)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {isCached && <span className="label">из кэша</span>}
              {isMock && (
                <span
                  className="label text-warn"
                  title="API ключ не указан — показаны примерные матчи"
                >
                  демо-данные
                </span>
              )}
              {loadError && (
                <span className="label text-danger" title={loadError}>
                  ошибка загрузки
                </span>
              )}
            </div>
          </div>
        )}

        <div className="px-5 sm:px-6 py-2 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="py-16 text-center text-ink-2 space-y-3">
              <RotateCw className="w-6 h-6 animate-spin mx-auto text-accent-ink" />
              <div className="font-mono text-xs">загрузка истории…</div>
            </div>
          ) : matches.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              {loadError ? (
                <AlertTriangle className="w-6 h-6 mx-auto text-danger" />
              ) : (
                <Trophy className="w-6 h-6 mx-auto text-ink-2" />
              )}
              <div className="font-display text-xl text-ink">
                {loadError ? "Историю не удалось загрузить" : "Матчей пока нет"}
              </div>
              <p className="text-sm text-ink-2 max-w-sm mx-auto">
                {loadError || "У игрока нет недавних игр в этом регионе."}
              </p>
            </div>
          ) : (
            matches.map((match, idx) => (
              <MatchHistoryRow
                key={match.matchId || idx}
                match={match}
                formatRelativeTime={formatRelativeTime}
                formatDuration={formatDuration}
                onSelectOtherPlayer={onSelectOtherPlayer}
              />
            ))
          )}
        </div>

        <footer className="px-5 sm:px-6 py-4 bg-canvas border-t border-line flex items-center justify-end sm:justify-between gap-4">
          <span className="hidden sm:inline font-mono text-[11px] text-ink-2">
            клик по игроку в составе открывает его историю
          </span>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost h-9 px-4 font-mono text-xs shrink-0"
          >
            закрыть
          </button>
        </footer>
      </div>
    </div>
  );
};

// A game without deaths has no finite KDA
const formatKda = (kda) => (kda === "Perfect" ? "∞" : kda);

const RosterName = ({ entry, highlight, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect && onSelect(entry)}
    className={`flex w-full items-center gap-1.5 text-left truncate transition-colors hover:text-accent-ink ${
      highlight ? "text-accent-ink" : "text-ink-2"
    }`}
  >
    <img
      src={getChampionIconUrl(entry.championId)}
      alt=""
      className="size-3.5 rounded-sm object-cover bg-surface-3 shrink-0"
    />
    <span className="truncate">{entry.riotId || "Player"}</span>
  </button>
);

const MatchHistoryRow = ({
  match,
  formatRelativeTime,
  formatDuration,
  onSelectOtherPlayer,
}) => {
  const champ = getChampionByKey(match.championId);
  const queue = getQueueInfo(match.queueId);
  const spell1 = getSpellIconUrl(match.spell1Id);
  const spell2 = getSpellIconUrl(match.spell2Id);

  const isWin = match.win;

  return (
    <article
      className={`relative flex flex-col md:flex-row md:items-center gap-3 md:gap-5 py-4 pl-4 border-b border-line ${
        isWin ? "bg-success/[0.04]" : "bg-danger/[0.04]"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 bottom-0 w-0.5 ${isWin ? "bg-success" : "bg-danger"}`}
      />

      {/* Result and queue */}
      <div className="md:w-32 shrink-0">
        <div className={`label ${isWin ? "text-success" : "text-danger"}`}>
          {isWin ? "Победа" : "Поражение"}
        </div>
        <div className={`text-xs mt-0.5 ${queue.color}`}>{queue.name}</div>
        <div className="font-mono text-[11px] text-ink-2 mt-0.5">
          {formatRelativeTime(match.gameCreation)} ·{" "}
          {formatDuration(match.gameDuration)}
        </div>
      </div>

      {/* Champion, spells, K/D/A */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="relative">
          <img
            src={getChampionIconUrl(match.championId)}
            alt={champ.name}
            className="size-12 rounded-sm border border-line-strong object-cover bg-surface-3"
          />
          {match.champLevel && (
            <span className="absolute bottom-0 right-0 px-1 bg-canvas border-t border-l border-line-strong font-mono text-[9px] leading-[14px] text-ink">
              {match.champLevel}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {spell1 && (
            <img
              src={spell1}
              alt=""
              className="size-5 rounded-sm border border-line"
            />
          )}
          {spell2 && (
            <img
              src={spell2}
              alt=""
              className="size-5 rounded-sm border border-line"
            />
          )}
        </div>
        <div className="min-w-[7rem] font-mono">
          <div className="text-sm text-ink tabular-nums">
            {match.kills} / <span className="text-danger">{match.deaths}</span>{" "}
            / {match.assists}
          </div>
          <div className="text-[11px] text-ink-2">KDA {formatKda(match.kda)}</div>
          <div className="text-[11px] text-ink-2">
            {match.cs} CS · {match.csPerMin}/мин
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="flex items-center gap-1 flex-wrap md:flex-nowrap shrink-0">
        {match.items?.map((itemId, i) => {
          const itemUrl = getItemIconUrl(itemId);
          return (
            <div
              key={i}
              className={`size-7 border bg-surface-3 overflow-hidden ${
                i === 6
                  ? "rounded-full border-line-strong"
                  : "rounded-sm border-line"
              }`}
            >
              {itemUrl && (
                <img
                  src={itemUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mini rosters */}
      <div className="grid grid-cols-2 gap-x-3 text-[11px] md:ml-auto md:w-48 min-w-0 pr-2">
        <div className="space-y-0.5 min-w-0">
          {match.allies?.slice(0, 5).map((ally, i) => (
            <RosterName
              key={i}
              entry={ally}
              highlight={ally.isTarget}
              onSelect={onSelectOtherPlayer}
            />
          ))}
        </div>
        <div className="space-y-0.5 min-w-0">
          {match.enemies?.slice(0, 5).map((enemy, i) => (
            <RosterName
              key={i}
              entry={enemy}
              onSelect={onSelectOtherPlayer}
            />
          ))}
        </div>
      </div>
    </article>
  );
};
