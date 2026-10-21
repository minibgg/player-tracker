import { useState } from "react";
import { usePlayerList } from "./usePlayerList";
import {
  getStoredWatchlist,
  setStoredWatchlist,
  getCachedPlayer,
  setCachedPlayer,
} from "../services/storage";
import { getRegionById } from "../data/regions";
import {
  parseRiotId,
  fetchPuuidByRiotId,
  fetchSummonerByPuuid,
  checkActiveGameByPuuid,
  fetchRanksByPuuid,
} from "../services/riotApi";
import { getMatchId } from "../services/matchResult";
import { startSession } from "../services/activity";
import {
  createPlayerId,
  parseWatchlistBackup,
  mergeImportedPlayers,
} from "../services/watchlistBackup";

const getName = (p) => p.gameName;

/**
 * The user's League watchlist (persisted to localStorage) and the actions on
 * it; the shared ones (pin, mute, delete…) come from usePlayerList.
 */
export const useWatchlist = ({ apiKey, proxyType, customProxy, addToast }) => {
  const list = usePlayerList({
    load: getStoredWatchlist,
    save: setStoredWatchlist,
    addToast,
    getName,
  });
  const { setWatchlist, watchlistRef } = list;
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  /**
   * Add a new player to the watchlist with permanent caching
   */
  const addPlayer = async ({ rawInput, regionId, isPinned = false }) => {
    setIsAddingPlayer(true);
    const region = getRegionById(regionId);
    const api = { apiKey, proxyType, customProxy };

    try {
      const { gameName, tagLine } = parseRiotId(rawInput, region.defaultTag);

      const existing = watchlistRef.current.find(
        (p) =>
          p.gameName.toLowerCase() === gameName.toLowerCase() &&
          p.tagLine.toLowerCase() === tagLine.toLowerCase() &&
          p.region.toLowerCase() === regionId.toLowerCase(),
      );
      if (existing) {
        addToast(
          "info",
          `${gameName}#${tagLine} уже есть в вашем списке.`,
          "Уже добавлен",
        );
        return;
      }

      // Check cache first!
      let puuid = null;
      let profileIconId = 29;
      let summonerLevel = 1;

      const cached = getCachedPlayer(regionId, gameName, tagLine);
      if (cached && cached.puuid) {
        puuid = cached.puuid;
        profileIconId = cached.profileIconId || 29;
        summonerLevel = cached.summonerLevel || 1;
      } else {
        // Query Riot Account-V1
        const accountData = await fetchPuuidByRiotId({
          gameName,
          tagLine,
          regionId,
          ...api,
        });
        puuid = accountData.puuid;

        // Query Summoner-V4 for icon & level
        try {
          const summonerData = await fetchSummonerByPuuid({
            puuid,
            regionId,
            ...api,
          });
          profileIconId = summonerData.profileIconId || 29;
          summonerLevel = summonerData.summonerLevel || 1;
        } catch {
          // Proceed with defaults
        }

        // Cache permanently in localStorage
        setCachedPlayer(regionId, gameName, tagLine, {
          puuid,
          profileIconId,
          summonerLevel,
          gameName,
          tagLine,
          region: regionId,
        });
      }

      // Check active game immediately
      const now = Date.now();
      let status = "NOT_IN_GAME";
      let currentGame = null;
      let sessions = [];
      try {
        const spectator = await checkActiveGameByPuuid({
          puuid,
          regionId,
          ...api,
        });
        if (spectator.isInGame) {
          status = "IN_GAME";
          currentGame = spectator.gameData;
          const matchId = getMatchId(spectator.gameData);
          if (matchId) {
            sessions = startSession(
              [],
              {
                matchId,
                start: spectator.gameStartTime || now,
                queueId: spectator.queueId,
                championId: spectator.championId,
              },
              now,
            );
          }
        }
      } catch (e) {
        console.warn("Initial spectator check error:", e);
      }

      // Rank is optional; a failed lookup is retried on the next poll
      let ranks = null;
      let ranksFetchedAt = 0;
      try {
        ranks = await fetchRanksByPuuid({ puuid, regionId, ...api });
        ranksFetchedAt = Date.now();
      } catch (e) {
        console.warn("Initial rank lookup error:", e);
      }

      const newPlayer = {
        id: createPlayerId(),
        gameName,
        tagLine,
        region: regionId,
        puuid,
        profileIconId,
        summonerLevel,
        ranks,
        ranksFetchedAt,
        isPinned: Boolean(isPinned),
        isTracking: true,
        isMuted: false,
        status,
        currentGame,
        lastChecked: now,
        sessions,
        statusHistory: [
          {
            timestamp: now,
            status,
            message:
              status === "IN_GAME"
                ? "Добавлен (в матче)"
                : "Добавлен в список отслеживания",
          },
        ],
      };

      setWatchlist((prev) => [newPlayer, ...prev]);
      addToast(
        "success",
        `${gameName}#${tagLine} добавлен и закэширован.${isPinned ? " (Закреплен вверху)" : ""}`,
        "Игрок сохранен",
      );
    } catch (err) {
      console.error("Failed to add player:", err);
      addToast(
        "error",
        err.message || "Не удалось найти игрока. Проверьте имя, тег и регион.",
        "Ошибка поиска",
      );
    } finally {
      setIsAddingPlayer(false);
    }
  };

  const importPlayers = (fileText) => {
    try {
      const imported = parseWatchlistBackup(fileText);
      const { watchlist: merged, added, skipped } = mergeImportedPlayers(
        watchlistRef.current,
        imported,
      );
      setWatchlist(merged);
      addToast(
        added > 0 ? "success" : "info",
        `Добавлено игроков: ${added}${skipped > 0 ? `, уже были в списке: ${skipped}` : ""}.`,
        "Импорт списка",
      );
    } catch (err) {
      addToast("error", err.message, "Импорт не удался");
    }
  };

  return {
    ...list,
    isAddingPlayer,
    addPlayer,
    importPlayers,
  };
};
