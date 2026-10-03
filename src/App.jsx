import React, { useState, useEffect, useRef, useCallback } from "react";
import { Navbar } from "./components/Navbar";
import { AddPlayerBar } from "./components/AddPlayerBar";
import { StatsBar } from "./components/StatsBar";
import { PlayerCard } from "./components/PlayerCard";
import { MatchDetailsModal } from "./components/MatchDetailsModal";
import { PlayerMatchHistoryModal } from "./components/PlayerMatchHistoryModal";
import { SettingsModal } from "./components/SettingsModal";
import { ToastContainer } from "./components/Toast";
import { Hero } from "./components/Hero";
import { Reveal } from "./components/Reveal";
import {
  getStoredApiKey,
  setStoredApiKey,
  getStoredProxyType,
  setStoredProxyType,
  getStoredCustomProxy,
  setStoredCustomProxy,
  getStoredPollingInterval,
  setStoredPollingInterval,
  getStoredSoundEnabled,
  getStoredChimeEnabled,
  setStoredChimeEnabled,
  setStoredSoundEnabled,
  getStoredNotificationsEnabled,
  setStoredNotificationsEnabled,
  getStoredWatchlist,
  setStoredWatchlist,
  getCachedPlayer,
  setCachedPlayer,
} from "./services/storage";
import { initDataDragon, getChampionByKey } from "./services/ddragon";
import { getQueueInfo } from "./data/queues";
import { getRegionById } from "./data/regions";
import {
  parseRiotId,
  fetchPuuidByRiotId,
  fetchSummonerByPuuid,
  checkActiveGameByPuuid,
} from "./services/riotApi";
import {
  sendDesktopNotification,
  playMatchAlertSound,
  playGameStartChime,
  stopMatchAlertSound,
  requestNotificationPermission,
  getNotificationPermission,
} from "./services/notifications";
import { ShieldAlert } from "lucide-react";

export default function App() {
  // Config & State
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [proxyType, setProxyType] = useState(getStoredProxyType);
  const [customProxy, setCustomProxy] = useState(getStoredCustomProxy);
  const [pollingInterval, setPollingInterval] = useState(
    getStoredPollingInterval,
  );
  const [soundEnabled, setSoundEnabled] = useState(getStoredSoundEnabled);
  const [chimeEnabled, setChimeEnabled] = useState(getStoredChimeEnabled);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    getStoredNotificationsEnabled,
  );

  // Watchlist State: ONLY the user's own added players, defaults to empty []
  const [watchlist, setWatchlist] = useState(() => {
    return getStoredWatchlist();
  });

  // UI & Tracking State
  const [isGlobalTracking, setIsGlobalTracking] = useState(true);
  const [secondsUntilNextCheck, setSecondsUntilNextCheck] =
    useState(pollingInterval);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [checkingPlayerIds, setCheckingPlayerIds] = useState(new Set());
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  // Modals & Views
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeMatchModalPlayer, setActiveMatchModalPlayer] = useState(null);
  const [selectedPlayerForHistory, setSelectedPlayerForHistory] =
    useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Toasts
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, title = "", duration = 4500) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, type, message, title, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Always-current view of the watchlist for async callbacks (avoids stale closures
  // and lets us run side effects outside of state updater functions)
  const watchlistRef = useRef(watchlist);
  useEffect(() => {
    watchlistRef.current = watchlist;
  }, [watchlist]);

  // Save watchlist to localStorage on change
  useEffect(() => {
    setStoredWatchlist(watchlist);
  }, [watchlist]);

  // Initialize Data Dragon
  useEffect(() => {
    initDataDragon().catch(console.warn);
  }, []);

  // Polling works off a wall-clock deadline instead of counting ticks, so it
  // stays accurate when the browser throttles a background tab.
  const nextCheckAtRef = useRef(Date.now() + pollingInterval * 1000);

  // Request notification permission if enabled
  useEffect(() => {
    if (notificationsEnabled && getNotificationPermission() === "default") {
      requestNotificationPermission();
    }
  }, [notificationsEnabled]);

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
            "Укажите Riot API Key в настройках для проверки статуса.",
            "Требуется API ключ",
          );
        }
        return;
      }

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
              apiKey,
              proxyType,
              customProxy,
            });
            currentPuuid = accountData.puuid;

            // Fetch summoner icon and level
            try {
              const summonerData = await fetchSummonerByPuuid({
                puuid: currentPuuid,
                regionId: player.region,
                apiKey,
                proxyType,
                customProxy,
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
        const spectatorResult = await checkActiveGameByPuuid({
          puuid: currentPuuid,
          regionId: player.region,
          apiKey,
          proxyType,
          customProxy,
        });

        // Player may have been deleted while the request was in flight
        const p = watchlistRef.current.find((item) => item.id === player.id);
        if (!p) return;

        const wasInGame = p.status === "IN_GAME";
        const isNowInGame = spectatorResult.isInGame;
        let history = p.statusHistory || [];

        // Transition: OFFLINE -> IN GAME
        if (!wasInGame && isNowInGame) {
          const champ = getChampionByKey(spectatorResult.championId);
          const queue = getQueueInfo(spectatorResult.queueId);

          history = [
            {
              timestamp: Date.now(),
              status: "IN_GAME",
              championId: spectatorResult.championId,
              queueId: spectatorResult.queueId,
              message: `Начал матч (${queue.name}) за ${champ.name}`,
            },
            ...history.slice(0, 19),
          ];

          // Trigger Notifications & Audio (Siren only for pinned players)
          const isPinned = Boolean(p.isPinned);
          const shouldPlaySiren = soundEnabled && isPinned;

          if (notificationsEnabled) {
            sendDesktopNotification(
              `${p.gameName} сейчас В ИГРЕ!${isPinned ? " 📌" : ""}`,
              {
                body: `Чемпион: ${champ.name} | Режим: ${queue.name}`,
              },
              shouldPlaySiren,
            );
          } else if (shouldPlaySiren) {
            playMatchAlertSound();
          }

          // Soft chime for any player; the siren already covers pinned ones
          if (chimeEnabled && !shouldPlaySiren) {
            playGameStartChime();
          }

          addToast(
            "success",
            `${p.gameName} начал матч за ${champ.name}!`,
            "Игрок в матче",
          );
        }
        // Transition: IN GAME -> NOT IN GAME
        else if (wasInGame && !isNowInGame) {
          history = [
            {
              timestamp: Date.now(),
              status: "NOT_IN_GAME",
              message: "Матч завершён",
            },
            ...history.slice(0, 19),
          ];

          addToast("info", `${p.gameName} больше не в матче.`, "Матч завершён");
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
                  currentGame: isNowInGame ? spectatorResult.gameData : null,
                  lastChecked: Date.now(),
                  statusHistory: history,
                },
          ),
        );
      } catch (err) {
        console.error(`Error checking player ${player.gameName}:`, err);

        if (err.status === 401 || err.status === 403) {
          addToast(
            "error",
            "Riot API Key истек или недействителен. Обновите его в настройках.",
            "Ошибка авторизации",
          );
        } else if (err.status === 429) {
          addToast(
            "warning",
            "Превышен лимит запросов Riot API. Опрос временно замедлен.",
            "Лимит запросов (429)",
          );
          return "RATE_LIMITED";
        } else {
          addToast(
            "error",
            err.message || "Не удалось проверить статус матча.",
            `Ошибка (${player.gameName})`,
          );
        }
      } finally {
        setCheckingPlayerIds((prev) => {
          const next = new Set(prev);
          next.delete(player.id);
          return next;
        });
      }
    },
    [
      apiKey,
      proxyType,
      customProxy,
      notificationsEnabled,
      soundEnabled,
      chimeEnabled,
      addToast,
    ],
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
      const activeList = watchlistRef.current.filter((p) => p.isTracking);
      for (const player of activeList) {
        // Stop the whole pass on 429 instead of hammering the API further
        if ((await checkPlayerStatus(player, false)) === "RATE_LIMITED") break;
        // Timers are throttled hard in background tabs, so skip the pause there
        if (!document.hidden) await new Promise((r) => setTimeout(r, 150));
      }
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshingAll(false);
    }
  }, [checkPlayerStatus]);

  const refreshAllRef = useRef(refreshAllPlayers);
  useEffect(() => {
    refreshAllRef.current = refreshAllPlayers;
  }, [refreshAllPlayers]);

  // Restart the countdown when the interval changes or tracking resumes
  useEffect(() => {
    nextCheckAtRef.current = Date.now() + pollingInterval * 1000;
    setSecondsUntilNextCheck(pollingInterval);
  }, [pollingInterval, isGlobalTracking]);

  // Ticker. A Web Worker timer is not throttled in background tabs (setInterval
  // on the page is, down to ~1/min), so checks keep running when you switch tabs.
  useEffect(() => {
    if (!isGlobalTracking) return;

    const tick = () => {
      const left = Math.ceil((nextCheckAtRef.current - Date.now()) / 1000);
      if (left <= 0) {
        nextCheckAtRef.current = Date.now() + pollingInterval * 1000;
        setSecondsUntilNextCheck(pollingInterval);
        refreshAllRef.current();
      } else {
        setSecondsUntilNextCheck(left);
      }
    };

    let worker = null;
    let fallbackTimer = null;
    try {
      const url = URL.createObjectURL(
        new Blob(["setInterval(() => postMessage(0), 1000);"], {
          type: "text/javascript",
        }),
      );
      worker = new Worker(url);
      worker.onmessage = tick;
      URL.revokeObjectURL(url);
    } catch {
      fallbackTimer = setInterval(tick, 1000);
    }

    // Catch up immediately when the tab becomes visible again
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      worker?.terminate();
      if (fallbackTimer) clearInterval(fallbackTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isGlobalTracking, pollingInterval]);

  /**
   * Add a new player to the watchlist with permanent caching
   */
  const handleAddPlayer = async ({ rawInput, regionId, isPinned = false }) => {
    setIsAddingPlayer(true);
    const region = getRegionById(regionId);

    try {
      const { gameName, tagLine } = parseRiotId(rawInput, region.defaultTag);

      // Check if already in watchlist
      const existing = watchlist.find(
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
        setIsAddingPlayer(false);
        return;
      }

      // Check cache first!
      let puuid = null;
      let profileIconId = 29;
      let summonerLevel = 1;
      let initialStatus = "NOT_IN_GAME";
      let currentGame = null;

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
          apiKey,
          proxyType,
          customProxy,
        });

        puuid = accountData.puuid;

        // Query Summoner-V4 for icon & level
        try {
          const summonerData = await fetchSummonerByPuuid({
            puuid,
            regionId,
            apiKey,
            proxyType,
            customProxy,
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
      try {
        const spectatorData = await checkActiveGameByPuuid({
          puuid,
          regionId,
          apiKey,
          proxyType,
          customProxy,
        });

        if (spectatorData.isInGame) {
          initialStatus = "IN_GAME";
          currentGame = spectatorData.gameData;
        }
      } catch (e) {
        console.warn("Initial spectator check error:", e);
      }

      const newPlayer = {
        id: `player-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        gameName,
        tagLine,
        region: regionId,
        puuid,
        profileIconId,
        summonerLevel,
        isPinned: Boolean(isPinned),
        isTracking: true,
        status: initialStatus,
        currentGame,
        lastChecked: Date.now(),
        statusHistory: [
          {
            timestamp: Date.now(),
            status: initialStatus,
            message:
              initialStatus === "IN_GAME"
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

  /**
   * Toggle Pin player to top of list
   */
  const handleTogglePin = (playerId) => {
    const player = watchlistRef.current.find((p) => p.id === playerId);
    if (!player) return;
    const nextState = !player.isPinned;

    setWatchlist((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, isPinned: nextState } : p)),
    );
    addToast(
      "info",
      nextState
        ? `Игрок ${player.gameName} закреплен вверху списка.`
        : `Игрок ${player.gameName} откреплен.`,
      "Закрепление",
    );
  };

  /**
   * Delete player from watchlist
   */
  const handleDeletePlayer = (playerId) => {
    const player = watchlist.find((p) => p.id === playerId);
    setWatchlist((prev) => prev.filter((p) => p.id !== playerId));
    if (player) {
      addToast("info", `Игрок ${player.gameName} удален из списка.`, "Удалено");
    }
  };

  /**
   * Toggle tracking pause/resume for individual player
   */
  const handleToggleTracking = (playerId) => {
    setWatchlist((prev) =>
      prev.map((p) => {
        if (p.id !== playerId) return p;
        const nextState = !p.isTracking;
        return {
          ...p,
          isTracking: nextState,
          statusHistory: [
            {
              timestamp: Date.now(),
              status: p.status,
              message: nextState
                ? "Отслеживание возобновлено"
                : "Отслеживание приостановлено",
            },
            ...(p.statusHistory || []),
          ],
        };
      }),
    );
  };

  /**
   * Save Settings
   */
  const handleSaveSettings = (newSettings) => {
    setApiKey(newSettings.apiKey);
    setStoredApiKey(newSettings.apiKey);

    setProxyType(newSettings.proxyType);
    setStoredProxyType(newSettings.proxyType);

    setCustomProxy(newSettings.customProxy);
    setStoredCustomProxy(newSettings.customProxy);

    setPollingInterval(newSettings.pollingInterval);
    setStoredPollingInterval(newSettings.pollingInterval);

    setNotificationsEnabled(newSettings.notificationsEnabled);
    setStoredNotificationsEnabled(newSettings.notificationsEnabled);

    setSoundEnabled(newSettings.soundEnabled);
    setStoredSoundEnabled(newSettings.soundEnabled);

    setChimeEnabled(newSettings.chimeEnabled);
    setStoredChimeEnabled(newSettings.chimeEnabled);

    addToast("success", "Настройки успешно сохранены.", "Сохранено");
  };

  /**
   * Reset Watchlist
   */
  const handleResetWatchlist = () => {
    if (
      window.confirm("Вы действительно хотите очистить весь список игроков?")
    ) {
      setWatchlist([]);
      addToast("info", "Список игроков очищен.", "Очищено");
    }
  };

  // Filter and sort: PINNED PLAYERS ALWAYS FIRST!
  const filteredAndSortedWatchlist = watchlist
    .filter((player) => {
      if (filterStatus === "PINNED" && !player.isPinned) return false;
      if (filterStatus === "IN_GAME" && player.status !== "IN_GAME")
        return false;
      if (filterStatus === "NOT_IN_GAME" && player.status !== "NOT_IN_GAME")
        return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = player.gameName.toLowerCase().includes(q);
        const matchTag = player.tagLine.toLowerCase().includes(q);
        const matchRegion = player.region.toLowerCase().includes(q);
        return matchName || matchTag || matchRegion;
      }
      return true;
    })
    .sort((a, b) => {
      // 1. Pinned players always on top
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // 2. Active in game players next
      if (a.status === "IN_GAME" && b.status !== "IN_GAME") return -1;
      if (a.status !== "IN_GAME" && b.status === "IN_GAME") return 1;
      return 0;
    });

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans lg:grid lg:grid-cols-[19rem_minmax(0,1fr)]">
      {/* Control rail: clock, controls, counters, filters */}
      <aside className="flex flex-col border-b lg:border-b-0 lg:border-r border-line lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <Navbar
          isGlobalTracking={isGlobalTracking}
          toggleGlobalTracking={() => setIsGlobalTracking(!isGlobalTracking)}
          secondsUntilNextCheck={secondsUntilNextCheck}
          pollingInterval={pollingInterval}
          isRefreshingAll={isRefreshingAll}
          refreshAllPlayers={refreshAllPlayers}
          chimeEnabled={chimeEnabled}
          toggleChime={() => {
            const next = !chimeEnabled;
            setChimeEnabled(next);
            setStoredChimeEnabled(next);
            if (next) playGameStartChime();
          }}
          soundEnabled={soundEnabled}
          toggleSound={() => {
            const next = !soundEnabled;
            if (!next) {
              stopMatchAlertSound();
            }
            setSoundEnabled(next);
            setStoredSoundEnabled(next);
          }}
          openSettings={() => setIsSettingsOpen(true)}
          hasApiKey={Boolean(apiKey)}
        />
        <StatsBar
          watchlist={watchlist}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </aside>

      <div className="min-w-0 flex flex-col min-h-screen">
        <Hero />

        <main className="flex-1 w-full max-w-5xl px-4 lg:px-10 py-8 space-y-10">
          {/* API Key Missing Alert */}
          {!apiKey && (
            <div
              role="alert"
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-warn/50 bg-warn/10 px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                <div className="text-sm text-ink">
                  Нужен Riot Development API Key.{" "}
                  <span className="text-ink-2">
                    Бесплатный ключ выдаёт портал разработчиков Riot.
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="btn-primary px-4 h-9 font-mono text-xs shrink-0"
              >
                указать ключ
              </button>
            </div>
          )}

          <Reveal>
            <AddPlayerBar
              onAddPlayer={handleAddPlayer}
              isAdding={isAddingPlayer}
              hasApiKey={Boolean(apiKey)}
              openSettings={() => setIsSettingsOpen(true)}
            />
          </Reveal>

          {/* Watchlist board */}
          <section aria-label="Список наблюдения">
            <div className="flex items-baseline justify-between mb-2">
              <h2 className="label">Список</h2>
              <span className="label tabular-nums">
                {filteredAndSortedWatchlist.length} / {watchlist.length}
              </span>
            </div>

            {filteredAndSortedWatchlist.length === 0 ? (
              <div className="border border-dashed border-line-strong px-6 py-14 text-center">
                <div
                  className="font-mono text-ink-2 text-sm"
                  aria-hidden="true"
                >
                  [ пусто ]
                </div>
                <div className="font-display text-xl mt-3">
                  {watchlist.length === 0
                    ? "Список игроков пуст"
                    : "Нет игроков по выбранному фильтру"}
                </div>
                <p className="text-sm text-ink-2 max-w-md mx-auto mt-2">
                  {watchlist.length === 0
                    ? "Введите Riot ID в строке выше, например Игрок#EUW, и список начнёт обновляться сам."
                    : "Измените фильтр слева или очистите поиск."}
                </p>
              </div>
            ) : (
              <div className="border-t border-line">
                {filteredAndSortedWatchlist.map((player, index) => (
                  <Reveal key={player.id} delay={Math.min(index, 8) * 60}>
                    <PlayerCard
                      player={player}
                      onCheckPlayer={(p) => checkPlayerStatus(p, true)}
                      onToggleTracking={handleToggleTracking}
                      onDeletePlayer={handleDeletePlayer}
                      onViewMatch={(p) => setActiveMatchModalPlayer(p)}
                      onTogglePin={handleTogglePin}
                      onOpenMatchHistory={(p) => setSelectedPlayerForHistory(p)}
                      isChecking={checkingPlayerIds.has(player.id)}
                    />
                  </Reveal>
                ))}
              </div>
            )}
          </section>
        </main>

        <footer className="px-4 lg:px-10 py-6 border-t border-line label flex flex-wrap justify-between gap-2">
          <span>League Spectator Tracker</span>
          <span>Riot Spectator-V5 · Match-V5</span>
        </footer>
      </div>

      {/* Match Details Modal (10-player spectator view with role sorting) */}
      <MatchDetailsModal
        isOpen={Boolean(activeMatchModalPlayer)}
        onClose={() => setActiveMatchModalPlayer(null)}
        player={activeMatchModalPlayer}
        onOpenMatchHistory={(p) => setSelectedPlayerForHistory(p)}
      />

      {/* Player Match History Modal (OP.GG style) */}
      <PlayerMatchHistoryModal
        isOpen={Boolean(selectedPlayerForHistory)}
        onClose={() => setSelectedPlayerForHistory(null)}
        player={selectedPlayerForHistory}
        apiKey={apiKey}
        proxyType={proxyType}
        customProxy={customProxy}
        onSelectOtherPlayer={(otherPlayer) => {
          setSelectedPlayerForHistory({
            ...selectedPlayerForHistory,
            gameName:
              otherPlayer.riotId?.split("#")[0] ||
              otherPlayer.riotId ||
              "Player",
            tagLine: otherPlayer.riotId?.split("#")[1] || "",
            profileIconId: otherPlayer.profileIconId || 29,
          });
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        proxyType={proxyType}
        setProxyType={setProxyType}
        customProxy={customProxy}
        setCustomProxy={setCustomProxy}
        pollingInterval={pollingInterval}
        setPollingInterval={setPollingInterval}
        notificationsEnabled={notificationsEnabled}
        setNotificationsEnabled={setNotificationsEnabled}
        chimeEnabled={chimeEnabled}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        onSave={handleSaveSettings}
        onResetWatchlist={handleResetWatchlist}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
