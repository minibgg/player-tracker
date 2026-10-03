import React, { useState, useEffect } from "react";
import {
  X,
  RotateCw,
  Swords,
  Trophy,
  Skull,
  Clock,
  Calendar,
  Coins,
  Flame,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { fetchMatchHistory, getItemIconUrl } from "../services/matchHistory";
import {
  getChampionByKey,
  getChampionIconUrl,
  getProfileIconUrl,
} from "../services/ddragon";
import { getSpellIconUrl } from "../data/spells";
import { getQueueInfo } from "../data/queues";
import { getRegionById } from "../data/regions";

export const PlayerMatchHistoryModal = ({
  isOpen,
  onClose,
  player,
  apiKey,
  proxyType,
  customProxy,
  onSelectOtherPlayer,
}) => {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCached, setIsCached] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!isOpen || !player) return;

    let isMounted = true;
    setIsLoading(true);
    setLoadError("");

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
        if (isMounted) {
          setMatches(res.matches || []);
          setIsCached(Boolean(res.isCached));
          setIsMock(Boolean(res.isMock));
          setLoadError(res.error || "");
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, player, apiKey, proxyType, customProxy]);

  if (!isOpen || !player) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-scrim/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-surface border border-line shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-5 sm:p-6 bg-surface border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative">
              <img
                src={getProfileIconUrl(player.profileIconId)}
                alt={player.gameName}
                className="w-14 h-14 rounded-xl border-2 border-accent object-cover bg-surface-3"
                onError={(e) => {
                  e.target.src =
                    "https://ddragon.leagueoflegends.com/cdn/14.24.1/img/profileicon/29.png";
                }}
              />
              {player.summonerLevel && (
                <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 bg-surface border border-line-strong rounded text-[10px] font-bold text-accent-ink">
                  {player.summonerLevel}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-lg sm:text-xl font-medium text-ink">
                  {player.gameName}
                </h2>
                <span className="text-sm font-semibold text-ink-2">
                  #{player.tagLine}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-surface border border-line text-ink">
                  {region.flag} {region.short}
                </span>
              </div>
              <p className="text-xs text-ink-2 mt-0.5">
                История последних матчей (Riot Match-V5)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink border border-line transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Statistics Bar */}
        {matches.length > 0 && (
          <div className="p-4 bg-canvas border-b border-line flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4 sm:gap-6">
              {/* Winrate */}
              <div>
                <div className="text-[11px] text-ink-2">
                  Винрейт ({totalGames} игр)
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span
                    className={`text-base font-bold ${winRate >= 50 ? "text-info" : "text-danger"}`}
                  >
                    {winRate}%
                  </span>
                  <span className="text-ink-2 text-[11px]">
                    ({wins}В {losses}П)
                  </span>
                </div>
              </div>

              {/* KDA */}
              <div className="border-l border-line pl-4 sm:pl-6">
                <div className="text-[11px] text-ink-2">Средний KDA</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-bold text-ink">
                    {avgKills} /{" "}
                    <span className="text-danger">{avgDeaths}</span> /{" "}
                    {avgAssists}
                  </span>
                  <span className="text-warn font-semibold font-mono text-[11px]">
                    {avgKda}:1
                  </span>
                </div>
              </div>
            </div>

            {/* Cache badge */}
            <div className="flex items-center gap-2">
              {isCached && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-surface border border-info/40 text-info">
                  ⚡ Из кэша (быстро)
                </span>
              )}
              {loadError && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded bg-danger/10 border border-danger/40 text-danger"
                  title={loadError}
                >
                  ⚠️ {loadError}
                </span>
              )}
              {isMock && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded bg-warn/10 border border-warn/40 text-warn"
                  title="API ключ не указан — показаны реалистичные матчи"
                >
                  ⚠️ Демо-история матчей
                </span>
              )}
            </div>
          </div>
        )}

        {/* Matches Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1">
          {isLoading ? (
            <div className="py-16 text-center text-ink-2 space-y-3">
              <RotateCw className="w-8 h-8 animate-spin mx-auto text-accent-ink" />
              <div className="text-sm font-semibold">
                Загрузка истории матчей...
              </div>
            </div>
          ) : matches.length === 0 ? (
            <div className="py-16 text-center text-ink-2 space-y-2">
              <Trophy className="w-8 h-8 mx-auto text-ink-2" />
              <div className="text-sm font-semibold">Матчи не найдены</div>
              <p className="text-xs text-ink-2">
                У данного игрока нет недавних игр в выбранном регионе.
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

        {/* Footer */}
        <div className="p-4 bg-canvas border-t border-line flex items-center justify-between text-xs text-ink-2">
          <span>
            Нажмите на любого игрока в матче, чтобы открыть его историю
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink border border-line transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

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
    <div
      className={`rounded-xl border p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 transition-all ${
        isWin
          ? "bg-team-blue/10 border-team-blue/40 hover:border-team-blue"
          : "bg-danger/10 border-danger/40 hover:border-danger"
      }`}
    >
      {/* 1. Status & Queue Info */}
      <div className="flex md:flex-col items-center md:items-start justify-between md:justify-center min-w-[100px] border-b md:border-b-0 md:border-r border-line pb-2 md:pb-0 md:pr-3">
        <div className="flex items-center gap-1.5">
          <span
            className={`font-bold text-xs uppercase tracking-wider ${isWin ? "text-team-blue" : "text-danger"}`}
          >
            {isWin ? "Победа" : "Поражение"}
          </span>
        </div>
        <div className={`text-[11px] font-medium mt-0.5 ${queue.color}`}>
          {queue.name}
        </div>
        <div className="text-[10px] text-ink-2 flex items-center gap-1 mt-0.5">
          <span>{formatRelativeTime(match.gameCreation)}</span>
          <span>•</span>
          <span>{formatDuration(match.gameDuration)}</span>
        </div>
      </div>

      {/* 2. Champion, Spells & Level */}
      <div className="flex items-center gap-3">
        {/* Champion Avatar */}
        <div className="relative">
          <img
            src={getChampionIconUrl(match.championId)}
            alt={champ.name}
            className={`w-12 h-12 rounded-lg border-2 object-cover bg-surface-3 ${
              isWin ? "border-team-blue" : "border-danger"
            }`}
          />
          {match.champLevel && (
            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-surface border border-line-strong rounded text-[9px] font-bold text-ink">
              {match.champLevel}
            </span>
          )}
        </div>

        {/* Spells */}
        <div className="flex flex-col gap-1">
          {spell1 && (
            <img
              src={spell1}
              alt="Spell"
              className="w-5 h-5 rounded border border-line"
            />
          )}
          {spell2 && (
            <img
              src={spell2}
              alt="Spell"
              className="w-5 h-5 rounded border border-line"
            />
          )}
        </div>

        {/* KDA & CS */}
        <div className="min-w-[110px]">
          <div className="font-bold text-sm text-ink">
            {match.kills} /{" "}
            <span className="text-danger">{match.deaths}</span> /{" "}
            {match.assists}
          </div>
          <div className="text-[11px] text-ink-2">
            <span className="text-warn font-semibold">{match.kda}:1</span>{" "}
            KDA
          </div>
          <div className="text-[10px] text-ink-2">
            {match.cs} CS ({match.csPerMin}/мин)
          </div>
        </div>
      </div>

      {/* 3. Items Grid */}
      <div className="flex items-center gap-1 flex-wrap">
        {match.items?.map((itemId, i) => {
          const itemUrl = getItemIconUrl(itemId);
          return (
            <div
              key={i}
              className={`w-7 h-7 rounded border flex items-center justify-center bg-surface-3 ${
                i === 6 ? "rounded-full border-warn/40" : "border-line"
              }`}
            >
              {itemUrl ? (
                <img
                  src={itemUrl}
                  alt="Item"
                  className="w-full h-full object-cover rounded"
                />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-surface-3" />
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Mini Teams Rosters (Allies vs Enemies) */}
      <div className="grid grid-cols-2 gap-2 text-[10px] border-t md:border-t-0 md:border-l border-line pt-2 md:pt-0 md:pl-3 min-w-[200px]">
        {/* Allies */}
        <div className="space-y-0.5">
          {match.allies?.slice(0, 5).map((ally, aIdx) => (
            <div
              key={aIdx}
              onClick={() => onSelectOtherPlayer && onSelectOtherPlayer(ally)}
              className={`flex items-center gap-1 cursor-pointer hover:text-ink transition-colors truncate ${
                ally.isTarget ? "text-accent-ink font-bold" : "text-ink-2"
              }`}
            >
              <img
                src={getChampionIconUrl(ally.championId)}
                alt=""
                className="w-3.5 h-3.5 rounded-sm object-cover bg-surface-3 shrink-0"
              />
              <span className="truncate">{ally.riotId || "Player"}</span>
            </div>
          ))}
        </div>

        {/* Enemies */}
        <div className="space-y-0.5">
          {match.enemies?.slice(0, 5).map((enemy, eIdx) => (
            <div
              key={eIdx}
              onClick={() => onSelectOtherPlayer && onSelectOtherPlayer(enemy)}
              className="flex items-center gap-1 text-ink-2 hover:text-ink transition-colors cursor-pointer truncate"
            >
              <img
                src={getChampionIconUrl(enemy.championId)}
                alt=""
                className="w-3.5 h-3.5 rounded-sm object-cover bg-surface-3 shrink-0"
              />
              <span className="truncate">{enemy.riotId || "Enemy"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
