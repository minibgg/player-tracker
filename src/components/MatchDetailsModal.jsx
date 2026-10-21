import React, { useEffect, useMemo } from "react";
import { X, ScrollText } from "lucide-react";
import { getChampionByKey, getChampionIconUrl } from "../services/ddragon";
import { getSpellIconUrl } from "../data/spells";
import { getQueueInfo } from "../data/queues";
import { orderTeamByRoles } from "../services/roleDetection";
import { useGameClock } from "../hooks/useGameClock";

// Hooks live in the inner component so they are never called conditionally
export const MatchDetailsModal = (props) => {
  const { isOpen, player } = props;
  if (!isOpen || !player || !player.currentGame) return null;
  return <MatchDetailsContent {...props} />;
};

const formatDuration = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const MatchDetailsContent = ({ onClose, player, onOpenMatchHistory }) => {
  const game = player.currentGame;
  const queueInfo = getQueueInfo(game.gameQueueConfigId);

  const liveSeconds = useGameClock(game);

  // Escape closes the modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Sort participants by standard League role order: Top -> Jungle -> Mid -> ADC -> Support
  const blueTeam = useMemo(
    () =>
      orderTeamByRoles(
        game.participants?.filter((p) => p.teamId === 100) || [],
      ),
    [game],
  );

  const redTeam = useMemo(
    () =>
      orderTeamByRoles(
        game.participants?.filter((p) => p.teamId === 200) || [],
      ),
    [game],
  );

  const isTracked = (p) =>
    p.puuid === player.puuid ||
    p.riotId?.toLowerCase().startsWith(player.gameName.toLowerCase());

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

  const teams = [
    { id: 100, name: "Синяя команда", color: "text-team-blue", dot: "bg-team-blue", players: blueTeam },
    { id: 200, name: "Красная команда", color: "text-danger", dot: "bg-danger", players: redTeam },
  ];

  return (
    <div
      className="fx-fade fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-scrim/80"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="match-title"
        className="fx-modal w-full max-w-4xl max-h-[92vh] flex flex-col bg-surface border border-line-strong"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 sm:px-6 py-5 border-b border-line flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="label flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-success animate-pulse"
              />
              <span className="text-success">матч идёт</span>
              <span>·</span>
              <span className={queueInfo.color}>{queueInfo.name}</span>
            </div>
            <h2
              id="match-title"
              className="font-display text-xl sm:text-2xl text-ink mt-1"
            >
              Составы команд
            </h2>
          </div>
          <div className="flex items-start gap-4 shrink-0">
            <div className="text-right">
              <div className="font-mono text-xl sm:text-2xl leading-none tabular-nums text-success">
                {formatDuration(liveSeconds)}
              </div>
              <div className="label mt-1">время матча</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="p-2 -mr-2 -mt-1 text-ink-2 hover:text-ink transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="px-5 sm:px-6 py-5 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
            {teams.map((team) => (
              <section key={team.id} aria-label={team.name}>
                <div className="flex items-center justify-between pb-2 border-b border-line-strong">
                  <span className={`label flex items-center gap-2 ${team.color}`}>
                    <span
                      aria-hidden="true"
                      className={`size-2 rounded-full ${team.dot}`}
                    />
                    {team.name}
                  </span>
                  <span className="label">{team.players.length} игроков</span>
                </div>
                <div>
                  {team.players.map((p, idx) => (
                    <TeamParticipantRow
                      key={p.puuid || idx}
                      participant={p}
                      isTrackedPlayer={isTracked(p)}
                      onOpenHistory={() => handleParticipantClick(p)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {game.bannedChampions && game.bannedChampions.length > 0 && (
            <section aria-label="Баны">
              <div className="label mb-2">Баны</div>
              <div className="flex items-center flex-wrap gap-1.5">
                {game.bannedChampions.map((b, idx) => {
                  const champ = getChampionByKey(b.championId);
                  return (
                    <div key={idx} className="relative group">
                      <img
                        src={getChampionIconUrl(b.championId)}
                        alt={champ.name}
                        title={`Бан: ${champ.name}`}
                        className="size-8 rounded-sm border border-line-strong grayscale opacity-60 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-full h-px bg-danger rotate-45" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <footer className="px-5 sm:px-6 py-4 bg-canvas border-t border-line flex items-center justify-end sm:justify-between gap-4">
          <span className="hidden sm:inline font-mono text-[11px] text-ink-2">
            роли определены по чемпионам и заклинаниям · клик по игроку
            открывает его историю
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

const TeamParticipantRow = ({
  participant,
  isTrackedPlayer,
  onOpenHistory,
}) => {
  const champ = getChampionByKey(participant.championId);
  const spell1Url = getSpellIconUrl(participant.spell1Id);
  const spell2Url = getSpellIconUrl(participant.spell2Id);
  const role = participant.assignedRole;

  return (
    <button
      type="button"
      onClick={onOpenHistory}
      title="Открыть историю матчей игрока"
      className={`relative group flex w-full items-center gap-3 py-2 pl-3 pr-2 border-b border-line text-left transition-colors hover:bg-surface-2 ${
        isTrackedPlayer ? "bg-accent/[0.06]" : ""
      }`}
    >
      {isTrackedPlayer && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-accent"
        />
      )}

      <span
        title={role?.name}
        className="w-8 shrink-0 font-mono text-[10px] text-ink-2"
      >
        {role?.short || "—"}
      </span>

      <img
        src={getChampionIconUrl(participant.championId)}
        alt={champ.name}
        className={`size-9 rounded-sm object-cover bg-surface-3 shrink-0 border ${
          isTrackedPlayer ? "border-accent" : "border-line-strong"
        }`}
      />

      <span className="flex flex-col gap-0.5 shrink-0">
        {spell1Url && (
          <img
            src={spell1Url}
            alt=""
            className="size-4 rounded-sm border border-line"
          />
        )}
        {spell2Url && (
          <img
            src={spell2Url}
            alt=""
            className="size-4 rounded-sm border border-line"
          />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span
            className={`text-sm truncate transition-colors ${
              isTrackedPlayer
                ? "text-accent-ink"
                : "text-ink group-hover:text-accent-ink"
            }`}
          >
            {participant.riotId ||
              participant.summonerName ||
              `Player #${participant.championId}`}
          </span>
          {isTrackedPlayer && (
            <span className="label text-accent-ink shrink-0">цель</span>
          )}
          {participant.bot && <span className="label shrink-0">бот</span>}
        </span>
        <span className="block font-mono text-[11px] text-ink-2 truncate">
          {champ.name}
        </span>
      </span>

      <ScrollText
        aria-hidden="true"
        className="w-3.5 h-3.5 text-ink-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
      />
    </button>
  );
};
