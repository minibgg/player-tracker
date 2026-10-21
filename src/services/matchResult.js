// Helpers for the result of a player's last finished match (Match-V5)
import { getChampionByKey } from "./ddragon";

// Match-V5 id of a game seen in Spectator-V5, e.g. "EUW1_7123456789"
export const getMatchId = (game) =>
  game?.platformId && game?.gameId ? `${game.platformId}_${game.gameId}` : null;

export const getOutcomeLabel = (result) => {
  if (result.remake) return "Ремейк";
  if (result.placement) return `${result.placement} место`;
  return result.win ? "Победа" : "Поражение";
};

// "Победа · Ahri 8/2/11 · 32 мин · +18 LP"
export const formatMatchResult = (result) => {
  const champ = getChampionByKey(result.championId);
  const parts = [
    getOutcomeLabel(result),
    `${champ.name} ${result.kills}/${result.deaths}/${result.assists}`,
    `${Math.round(result.duration / 60)} мин`,
  ];
  if (result.lpChange) parts.push(result.lpChange);
  return parts.join(" · ");
};
