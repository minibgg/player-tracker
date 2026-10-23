import { useState, useEffect, useRef, useCallback } from "react";
import { getCachedPlayer, setCachedPlayer } from "../services/storage";
import { getChampionByKey } from "../services/ddragon";
import { getQueueInfo } from "../data/queues";
import {
  fetchPuuidByRiotId,
  fetchSummonerByPuuid,
  checkActiveGameByPuuid,
  fetchRanksByPuuid,
  fetchMatchResult,
  fetchLatestMatchId,
} from "../services/riotApi";
import { getMatchId, formatMatchResult } from "../services/matchResult";
import { RANKED_QUEUE_KEYS, getLpChange } from "../data/ranks";
import { startSession, updateSession } from "../services/activity";

// Match-V5 publishes a finished game a few minutes after it ends
const MATCH_RESULT_RETRY_MS = 60 * 1000;
const MATCH_RESULT_TIMEOUT_MS = 20 * 60 * 1000;
const RANKS_REFRESH_MS = 30 * 60 * 1000;
// How often to look for games played while the tracker wasn't watching
const MATCH_SYNC_MS = 30 * 60 * 1000;
const HISTORY_LIMIT = 20;

const pushHistory = (history, entry) =>
  [entry, ...history].slice(0, HISTORY_LIMIT);

/**
 * Checks tracked players in Spectator-V5 (usePollTicker calls
 * refreshAllPlayers on the poll interval), detects game starts/ends,
 * resolves match results and keeps ranks fresh.
 * onEvent receives GAME_START / GAME_END / MATCH_RESULT events;
 * onAuthStatus(ok) reports whether Riot accepted the API key.
 *
 * checkPlayerStatus resolves to "STOP" when the rest of a pass would fail the
 * same way (bad key, rate limit, no connection), so "Check all" can bail out.
 */
export const usePlayerPolling = ({
  watchlistRef,
  setWatchlist,
  apiKey,
  proxyType,
  customProxy,
  addToast,
  onEvent,
  onAuthStatus,
}) => {
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [checkingPlayerIds, setCheckingPlayerIds] = useState(new Set());
  // Two checks of one player at once would both see the old state and
  // announce the same change twice, so the later one is skipped
  const inFlightRef = useRef(new Set());

  // Events go through a ref so new alert settings don't recreate the pollers
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  const onAuthStatusRef = useRef(onAuthStatus);
  useEffect(() => {
    onAuthStatusRef.current = onAuthStatus;
  }, [onAuthStatus]);

  /**
   * Check status of an individual player
   */
  const checkPlayerStatus = useCallback(
    async (player, isManual = false) => {
      if (!player.isTracking && !isManual) return;

      if (!apiKey) {
        if (isManual) {
          addToast(
            "warning",
            "Укажите API-ключ Riot в настройках, чтобы проверять статус.",
            "Нужен ключ",
          );
        }
        return;
      }

      const api = { apiKey, proxyType, customProxy };
      const emit = (event) => onEventRef.current?.(event);
      if (inFlightRef.current.has(player.id)) return;
      inFlightRef.current.add(player.id);
      setCheckingPlayerIds((prev) => new Set(prev).add(player.id));

      try {
        // 1. Resolve PUUID (Check cache first to save API calls)
        let currentPuuid = player.puuid;
        let profileIconId = player.profileIconId || 29;
        let summonerLevel = player.summonerLevel || 1;

        if (!currentPuuid) {
          const cached = getCachedPlayer(
            player.region,
            player.gameName,
            player.tagLine,
          );
          if (cached && cached.puuid) {
            currentPuuid = cached.puuid;
            profileIconId = cached.profileIconId || profileIconId;
            summonerLevel = cached.summonerLevel || summonerLevel;
          } else {
            // Query Account-V1
            const accountData = await fetchPuuidByRiotId({
              gameName: player.gameName,
              tagLine: player.tagLine,
              regionId: player.region,
              ...api,
            });
            currentPuuid = accountData.puuid;

            // Fetch summoner icon and level
            try {
              const summonerData = await fetchSummonerByPuuid({
                puuid: currentPuuid,
                regionId: player.region,
                ...api,
              });
              profileIconId = summonerData.profileIconId || 29;
              summonerLevel = summonerData.summonerLevel || 1;
            } catch {
              // Non-blocking
            }

            // Save to permanent player cache
            setCachedPlayer(player.region, player.gameName, player.tagLine, {
              puuid: currentPuuid,
              profileIconId,
              summonerLevel,
              gameName: player.gameName,
              tagLine: player.tagLine,
              region: player.region,
            });
          }
        }

        // 2. Check Spectator-V5
        const spectator = await checkActiveGameByPuuid({
          puuid: currentPuuid,
          regionId: player.region,
          ...api,
        });
        onAuthStatusRef.current?.(true);

        // Player may have been deleted while the request was in flight
        const p = watchlistRef.current.find((item) => item.id === player.id);
        if (!p) return;

        const now = Date.now();
        let history = p.statusHistory || [];
        let sessions = p.sessions || [];
        let pendingResult = p.pendingResult || null;
        let lastMatchResult = p.lastMatchResult || null;
        let ranks = p.ranks || null;
        let ranksFetchedAt = p.ranksFetchedAt || 0;
        let lastMatchSyncAt = p.lastMatchSyncAt || 0;
        let rateLimited = false;

        const wasInGame = p.status === "IN_GAME";
        const isNowInGame = spectator.isInGame;
        const previousMatchId = wasInGame ? getMatchId(p.currentGame) : null;
        const currentMatchId = isNowInGame
          ? getMatchId(spectator.gameData)
          : null;
        // Finished one game and started the next between two polls
        const switchedGame =
          wasInGame &&
          isNowInGame &&
          Boolean(previousMatchId && currentMatchId) &&
          previousMatchId !== currentMatchId;

        // Transition: IN GAME -> NOT IN GAME
        if ((wasInGame && !isNowInGame) || switchedGame) {
          history = pushHistory(history, {
            timestamp: now,
            status: "NOT_IN_GAME",
            message: "Матч завершён",
          });
          if (previousMatchId) {
            sessions = updateSession(sessions, previousMatchId, { end: now });
            // Look the result up on later polls, once Match-V5 has it
            pendingResult = {
              matchId: previousMatchId,
              endedAt: now,
              lastAttemptAt: now,
            };
          }
          emit({ type: "GAME_END", player: p });
        }

        // Transition: OFFLINE -> IN GAME
        if ((!wasInGame && isNowInGame) || switchedGame) {
          const champ = getChampionByKey(spectator.championId);
          const queue = getQueueInfo(spectator.queueId);
          history = pushHistory(history, {
            timestamp: now,
            status: "IN_GAME",
            championId: spectator.championId,
            queueId: spectator.queueId,
            message: `Начал матч (${queue.name}) за ${champ.name}`,
          });
          if (currentMatchId) {
            sessions = startSession(
              sessions,
              {
                matchId: currentMatchId,
                // gameStartTime stays 0 during the loading screen
                start: spectator.gameStartTime || now,
                queueId: spectator.queueId,
                championId: spectator.championId,
              },
              now,
            );
          }
          emit({
            type: "GAME_START",
            player: p,
            championId: spectator.championId,
            queueId: spectator.queueId,
          });
        }

        // 3. Result of the last finished match
        if (
          pendingResult &&
          now - pendingResult.lastAttemptAt >= MATCH_RESULT_RETRY_MS
        ) {
          try {
            const result = await fetchMatchResult({
              matchId: pendingResult.matchId,
              puuid: currentPuuid,
              regionId: player.region,
              ...api,
            });

            if (result) {
              // Ranked: compare LP against the pre-game snapshot
              const rankKey = RANKED_QUEUE_KEYS[result.queueId];
              if (rankKey) {
                try {
                  const freshRanks = await fetchRanksByPuuid({
                    puuid: currentPuuid,
                    regionId: player.region,
                    ...api,
                  });
                  result.lpChange = getLpChange(
                    ranks?.[rankKey],
                    freshRanks[rankKey],
                  );
                  ranks = freshRanks;
                  ranksFetchedAt = now;
                } catch {
                  // The result is still worth showing without the LP change
                }
              }

              history = pushHistory(history, {
                timestamp: now,
                status: "NOT_IN_GAME",
                message: formatMatchResult(result),
              });
              // Match-V5 has the exact start/end, unlike polling
              sessions = updateSession(sessions, result.matchId, {
                ...(result.startedAt ? { start: result.startedAt } : {}),
                end: result.endedAt,
                win: result.remake ? null : result.win,
              });
              lastMatchResult = result;
              pendingResult = null;
              emit({ type: "MATCH_RESULT", player: p, result });
            } else {
              pendingResult = { ...pendingResult, lastAttemptAt: now };
            }
          } catch (err) {
            if (err.status === 429) rateLimited = true;
            pendingResult = { ...pendingResult, lastAttemptAt: now };
          }

          // Some games (e.g. customs) never show up in Match-V5
          if (
            pendingResult &&
            now - pendingResult.endedAt > MATCH_RESULT_TIMEOUT_MS
          ) {
            pendingResult = null;
          }
        }

        // 3b. Games the polls never saw (app closed, game shorter than the
        // interval) leave lastMatchResult stale, so ask Match-V5 for the
        // newest match now and then. No LP change, log entry or alert here:
        // the game is already old news.
        if (
          !isNowInGame &&
          !pendingResult &&
          !rateLimited &&
          (isManual || now - lastMatchSyncAt > MATCH_SYNC_MS)
        ) {
          try {
            const latestId = await fetchLatestMatchId({
              puuid: currentPuuid,
              regionId: player.region,
              ...api,
            });
            if (latestId && latestId !== lastMatchResult?.matchId) {
              const result = await fetchMatchResult({
                matchId: latestId,
                puuid: currentPuuid,
                regionId: player.region,
                ...api,
              });
              if (result && result.endedAt > (lastMatchResult?.endedAt || 0)) {
                lastMatchResult = result;
                // LP moved during the missed games: take a fresh baseline
                ranksFetchedAt = 0;
              }
            }
            lastMatchSyncAt = now;
          } catch (err) {
            if (err.status === 429) rateLimited = true;
            // Don't retry a failing endpoint on every poll
            else lastMatchSyncAt = now;
          }
        }

        // 4. Rank. Never refreshed between a game's end and its result, so the
        // LP change above always has a pre-game baseline.
        const ranksStale =
          !ranksFetchedAt ||
          (!isNowInGame && now - ranksFetchedAt > RANKS_REFRESH_MS);
        if (!pendingResult && ranksStale && !rateLimited) {
          try {
            ranks = await fetchRanksByPuuid({
              puuid: currentPuuid,
              regionId: player.region,
              ...api,
            });
            ranksFetchedAt = now;
          } catch (err) {
            if (err.status === 429) rateLimited = true;
            // Don't retry a failing endpoint on every poll
            else ranksFetchedAt = now;
          }
        }

        setWatchlist((prevList) =>
          prevList.map((item) =>
            item.id !== player.id
              ? item
              : {
                  ...item,
                  puuid: currentPuuid,
                  profileIconId,
                  summonerLevel,
                  status: isNowInGame ? "IN_GAME" : "NOT_IN_GAME",
                  currentGame: isNowInGame ? spectator.gameData : null,
                  lastChecked: now,
                  statusHistory: history,
                  sessions,
                  pendingResult,
                  lastMatchResult,
                  lastMatchSyncAt,
                  ranks,
                  ranksFetchedAt,
                },
          ),
        );

        // Lets "Check All" stop the pass instead of hammering the API further
        if (rateLimited) return "STOP";
      } catch (err) {
        console.error(`Error checking player ${player.gameName}:`, err);

        if (err.status === 401 || err.status === 403) {
          onAuthStatusRef.current?.(false);
          addToast(
            "error",
            "API-ключ Riot истёк или недействителен. Обновите его в настройках.",
            "Ключ отклонён",
          );
          return "STOP";
        } else if (err.status === 429) {
          addToast(
            "warning",
            "Превышен лимит запросов Riot API. Остальные игроки проверятся в следующем цикле.",
            "Лимит запросов",
          );
          return "STOP";
        } else if (err.status === 0) {
          addToast("error", err.message, "Нет связи");
          return "STOP";
        } else {
          addToast(
            "error",
            err.message || "Не удалось проверить статус матча.",
            `Ошибка (${player.gameName})`,
          );
        }
      } finally {
        inFlightRef.current.delete(player.id);
        setCheckingPlayerIds((prev) => {
          const next = new Set(prev);
          next.delete(player.id);
          return next;
        });
      }
    },
    [apiKey, proxyType, customProxy, addToast, watchlistRef, setWatchlist],
  );

  /**
   * Check the given players one by one: every tracked player on a poll, or
   * just the ones imported or resumed between polls
   */
  const checkPlayers = useCallback(
    async (players) => {
      for (const player of players) {
        // Stop the whole pass when every remaining check would fail the same way
        if ((await checkPlayerStatus(player, false)) === "STOP") break;
        // Timers are throttled hard in background tabs, so skip the pause there
        if (!document.hidden) await new Promise((r) => setTimeout(r, 150));
      }
    },
    [checkPlayerStatus],
  );

  /**
   * Check all players currently in watchlist
   */
  const isRefreshingRef = useRef(false);
  const refreshAllPlayers = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshingAll(true);

    try {
      await checkPlayers(watchlistRef.current.filter((p) => p.isTracking));
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshingAll(false);
    }
  }, [checkPlayers, watchlistRef]);

  return {
    checkPlayerStatus,
    checkPlayers,
    refreshAllPlayers,
    isRefreshingAll,
    checkingPlayerIds,
  };
};
