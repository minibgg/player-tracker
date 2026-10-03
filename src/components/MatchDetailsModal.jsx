import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Clock,
  Swords,
  Shield,
  TreePine,
  Zap,
  Crosshair,
  Heart,
  ArrowUpDown,
  ScrollText,
} from "lucide-react";
import { getChampionByKey, getChampionIconUrl } from "../services/ddragon";
import { getSpellIconUrl } from "../data/spells";
import { getQueueInfo } from "../data/queues";
import { orderTeamByRoles } from "../services/roleDetection";

const ROLE_ICONS = {
  TOP: Shield,
  JUNGLE: TreePine,
  MID: Zap,
  ADC: Crosshair,
  SUPPORT: Heart,
};

// Hooks live in the inner component so they are never called conditionally
export const MatchDetailsModal = (props) => {
  const { isOpen, player } = props;
  if (!isOpen || !player || !player.currentGame) return null;
  return <MatchDetailsContent {...props} />;
};

const MatchDetailsContent = ({ onClose, player, onOpenMatchHistory }) => {
  const game = player.currentGame;
  const queueInfo = getQueueInfo(game.gameQueueConfigId);

  // Stopwatch
  const [liveSeconds, setLiveSeconds] = useState(0);

  useEffect(() => {
    const calc = () => {
      if (game.gameStartTime && game.gameStartTime > 0) {
        return Math.max(
          0,
          Math.floor((Date.now() - game.gameStartTime) / 1000),
        );
      }
      return game.gameLength || 0;
    };

    setLiveSeconds(calc());
    const timer = setInterval(() => {
      setLiveSeconds(calc());
    }, 1000);

    return () => clearInterval(timer);
  }, [game]);

  const formatDuration = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  // Sort participants by standard League role order: Top -> Jungle -> Mid -> ADC -> Support
  const blueTeamRaw = useMemo(() => {
    return game.participants?.filter((p) => p.teamId === 100) || [];
  }, [game]);

  const redTeamRaw = useMemo(() => {
    return game.participants?.filter((p) => p.teamId === 200) || [];
  }, [game]);

  const blueTeam = useMemo(() => {
    return orderTeamByRoles(blueTeamRaw);
  }, [blueTeamRaw]);

  const redTeam = useMemo(() => {
    return orderTeamByRoles(redTeamRaw);
  }, [redTeamRaw]);

  const handleParticipantClick = (participant) => {
    if (!onOpenMatchHistory) return;

    let gameName = participant.riotId || participant.summonerName || "Player";
    let tagLine = "";
    if (gameName.includes("#")) {
      const parts = gameName.split("#");
      gameName = parts[0];
      tagLine = parts[1];
    }

    onOpenMatchHistory({
      puuid: participant.puuid,
      gameName,
      tagLine,
      region: player.region,
      profileIconId: participant.profileIconId || 29,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-scrim/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-surface border border-line shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="relative p-5 sm:p-6 bg-surface border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-surface-3 border border-info/40 text-info">
              <Swords className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-lg sm:text-xl font-medium text-ink">
                  ACTIVE MATCH SPECTATOR
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-success/10 border border-success text-success">
                  В РЕАЛЬНОМ ВРЕМЕНИ
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-ink-2 mt-1 flex-wrap">
                <span className={`font-semibold ${queueInfo.color}`}>
                  {queueInfo.name}
                </span>
                <span>•</span>
                <span className="font-mono text-success flex items-center gap-1 font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDuration(liveSeconds)}
                </span>
                <span>•</span>
                <span className="text-ink-2 flex items-center gap-1">
                  <ArrowUpDown className="w-3 h-3 text-accent-ink" />
                  Сортировка: Топ → Лес → Мид → АДК → Саппорт
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink border border-line transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two Teams Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Blue Team (Team 100) */}
            <div className="rounded-xl border border-team-blue/30 bg-surface-2/50 p-4 shadow-md">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-team-blue/20">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-team-blue shadow-sm " />
                  <span className="font-bold text-team-blue text-sm tracking-wide">
                    СИНЯЯ КОМАНДА (BLUE)
                  </span>
                </div>
                <span className="text-xs text-ink-2">
                  {blueTeam.length} Игроков
                </span>
              </div>

              <div className="space-y-2.5">
                {blueTeam.map((p, idx) => (
                  <TeamParticipantRow
                    key={idx}
                    participant={p}
                    isTrackedPlayer={
                      p.puuid === player.puuid ||
                      p.riotId
                        ?.toLowerCase()
                        .startsWith(player.gameName.toLowerCase())
                    }
                    onOpenHistory={() => handleParticipantClick(p)}
                  />
                ))}
              </div>
            </div>

            {/* Red Team (Team 200) */}
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-4 shadow-md">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-danger/20">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-danger shadow-sm " />
                  <span className="font-bold text-danger text-sm tracking-wide">
                    КРАСНАЯ КОМАНДА (RED)
                  </span>
                </div>
                <span className="text-xs text-ink-2">
                  {redTeam.length} Игроков
                </span>
              </div>

              <div className="space-y-2.5">
                {redTeam.map((p, idx) => (
                  <TeamParticipantRow
                    key={idx}
                    participant={p}
                    isTrackedPlayer={
                      p.puuid === player.puuid ||
                      p.riotId
                        ?.toLowerCase()
                        .startsWith(player.gameName.toLowerCase())
                    }
                    onOpenHistory={() => handleParticipantClick(p)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Banned Champions section if available */}
          {game.bannedChampions && game.bannedChampions.length > 0 && (
            <div className="p-4 rounded-xl bg-surface border border-line">
              <div className="text-xs font-semibold text-ink-2 mb-2">
                Забаненные чемпионы
              </div>
              <div className="flex items-center flex-wrap gap-2">
                {game.bannedChampions.map((b, idx) => {
                  const champ = getChampionByKey(b.championId);
                  return (
                    <div key={idx} className="relative group">
                      <img
                        src={getChampionIconUrl(b.championId)}
                        alt={champ.name}
                        title={`Забанен: ${champ.name}`}
                        className="w-8 h-8 rounded border border-line-strong grayscale opacity-70 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-full h-0.5 bg-danger rotate-45 transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-canvas border-t border-line flex items-center justify-between text-xs text-ink-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>
              Нажмите на любого игрока в составе, чтобы посмотреть его историю
              матчей
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink border border-line transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

const TeamParticipantRow = ({
  participant,
  isTrackedPlayer,
  onOpenHistory,
}) => {
  const champ = getChampionByKey(participant.championId);
  const spell1Url = getSpellIconUrl(participant.spell1Id);
  const spell2Url = getSpellIconUrl(participant.spell2Id);
  const role = participant.assignedRole;

  const RoleIcon = role ? ROLE_ICONS[role.id] : Shield;

  return (
    <div
      onClick={onOpenHistory}
      title="Нажмите, чтобы открыть историю матчей игрока"
      className={`flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer group ${
        isTrackedPlayer
          ? "bg-surface-3 border border-accent shadow-sm  ring-1 ring-accent/40 hover:bg-surface-3"
          : "bg-surface/80 border border-line/60 hover:border-line-strong hover:bg-surface-3"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Role Badge (TOP, JGL, MID, ADC, SUP) */}
        {role && (
          <div
            title={role.name}
            className={`flex flex-col items-center justify-center w-8 h-9 rounded border font-mono font-bold text-[10px] shrink-0 ${role.color}`}
          >
            <RoleIcon className="w-3.5 h-3.5 mb-0.5 shrink-0" />
            <span className="leading-none text-[9px]">{role.short}</span>
          </div>
        )}

        {/* Champion Icon */}
        <div className="relative">
          <img
            src={getChampionIconUrl(participant.championId)}
            alt={champ.name}
            className={`w-9 h-9 rounded-md object-cover bg-surface-3 transition-transform group-hover:scale-105 ${
              isTrackedPlayer
                ? "border-2 border-accent"
                : "border border-line"
            }`}
          />
        </div>

        {/* Summoner Spells */}
        <div className="flex flex-col gap-0.5">
          {spell1Url && (
            <img
              src={spell1Url}
              alt="Spell 1"
              className="w-4 h-4 rounded border border-line"
            />
          )}
          {spell2Url && (
            <img
              src={spell2Url}
              alt="Spell 2"
              className="w-4 h-4 rounded border border-line"
            />
          )}
        </div>

        {/* Summoner Name / Tag & Champion */}
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-xs font-semibold group-hover:text-info transition-colors ${
                isTrackedPlayer ? "text-accent-ink font-bold" : "text-ink"
              }`}
            >
              {participant.riotId ||
                participant.summonerName ||
                `Player #${participant.championId}`}
            </span>
            {isTrackedPlayer && (
              <span className="px-1.5 py-0.2 bg-accent text-accent-fg font-bold text-[9px] rounded uppercase tracking-wider">
                Цель
              </span>
            )}
          </div>
          <div className="text-[11px] text-ink-2 flex items-center gap-1.5">
            <span>{champ.name}</span>
            {role && (
              <span className="text-ink-2 text-[10px]">({role.name})</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {participant.bot && (
          <span className="text-[10px] text-ink-2 px-1.5 py-0.5 bg-surface-3 rounded">
            БОТ
          </span>
        )}
        <ScrollText className="w-3.5 h-3.5 text-ink-2 group-hover:text-info opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};
