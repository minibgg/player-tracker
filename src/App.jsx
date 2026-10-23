import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
import { FirstRunGuide, NoMatchesState } from "./components/EmptyState";
import { GameTabs } from "./components/GameTabs";
import { ApexBoard } from "./components/apex/ApexBoard";
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
  getStoredAlertRules,
  setStoredAlertRules,
  getStoredWebhooks,
  setStoredWebhooks,
  getStoredMotionPref,
  setStoredMotionPref,
  getStoredHeroScene,
  setStoredHeroScene,
  getStoredApexApiKey,
  setStoredApexApiKey,
  getStoredActiveGame,
  setStoredActiveGame,
} from "./services/storage";
import { initDataDragon } from "./services/ddragon";
import {
  playGameStartChime,
  stopMatchAlertSound,
  requestNotificationPermission,
  getNotificationPermission,
} from "./services/notifications";
import { announceTrackerEvent, announceApexEvent } from "./services/alerts";
import {
  resolveMotion,
  applyMotion,
  systemReducesMotion,
} from "./services/motion";
import { nextHeroScene } from "./components/hero/scenes";
import { serializeWatchlist } from "./services/watchlistBackup";
import { STATUS_FILTERS, viewApexPlayers } from "./services/watchlistView";
import { useToasts } from "./hooks/useToasts";
import { useWatchlist } from "./hooks/useWatchlist";
import { usePlayerPolling } from "./hooks/usePlayerPolling";
import { useApexWatchlist } from "./hooks/useApexWatchlist";
import { useApexPolling } from "./hooks/useApexPolling";
import { usePollTicker } from "./hooks/usePollTicker";
import { useFlipList } from "./hooks/useFlipList";
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
  const [alertRules, setAlertRules] = useState(getStoredAlertRules);
  const [webhooks, setWebhooks] = useState(getStoredWebhooks);
  const [motionPref, setMotionPref] = useState(getStoredMotionPref);
  const [heroScene, setHeroScene] = useState(getStoredHeroScene);
  const [apexApiKey, setApexApiKey] = useState(getStoredApexApiKey);
  // Which board is shown; both games are polled either way
  const [activeGame, setActiveGame] = useState(getStoredActiveGame);
  const isApex = activeGame === "apex";

  // "Auto" motion follows the OS "reduce motion" switch, live
  const [osReducesMotion, setOsReducesMotion] = useState(systemReducesMotion);
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return undefined;
    const onChange = (e) => setOsReducesMotion(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  const motionLevel = resolveMotion(motionPref, osReducesMotion);
  useEffect(() => {
    applyMotion(motionLevel);
  }, [motionLevel]);

  const [isGlobalTracking, setIsGlobalTracking] = useState(true);
  // Riot answered 401/403: auto-polling waits for a new key instead of
  // failing (and toasting) every cycle
  const [isApiKeyRejected, setIsApiKeyRejected] = useState(false);
  const handleAuthStatus = useCallback(
    (ok) => setIsApiKeyRejected(!ok),
    [],
  );
  const [isApexKeyRejected, setIsApexKeyRejected] = useState(false);
  const handleApexAuthStatus = useCallback(
    (ok) => setIsApexKeyRejected(!ok),
    [],
  );

  // Modals & Views
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeMatchModalPlayer, setActiveMatchModalPlayer] = useState(null);
  const [selectedPlayerForHistory, setSelectedPlayerForHistory] =
    useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Filters differ per game, so a switch starts from the full list
  const switchGame = (game) => {
    if (game === activeGame) return;
    setActiveGame(game);
    setStoredActiveGame(game);
    setFilterStatus("ALL");
    setSearchQuery("");
  };

  const { toasts, addToast, removeToast } = useToasts();

  // Rows glide to their new places when the list re-sorts
  const listRef = useRef(null);
  useFlipList(listRef);

  // Watchlist State: ONLY the user's own added players, defaults to empty []
  const {
    watchlist,
    setWatchlist,
    watchlistRef,
    isAddingPlayer,
    addPlayer,
    togglePin,
    toggleMute,
    deletePlayer,
    toggleTracking,
    importPlayers,
    clearWatchlist,
  } = useWatchlist({ apiKey, proxyType, customProxy, addToast });

  const alertSettings = useMemo(
    () => ({
      notificationsEnabled,
      soundEnabled,
      chimeEnabled,
      alertRules,
      webhooks,
    }),
    [notificationsEnabled, soundEnabled, chimeEnabled, alertRules, webhooks],
  );
  const handleTrackerEvent = useCallback(
    (event) => announceTrackerEvent(event, alertSettings, addToast),
    [alertSettings, addToast],
  );
  const handleApexEvent = useCallback(
    (event) => announceApexEvent(event, alertSettings, addToast),
    [alertSettings, addToast],
  );

  const {
    checkPlayerStatus,
    refreshAllPlayers,
    isRefreshingAll,
    checkingPlayerIds,
  } = usePlayerPolling({
    watchlistRef,
    setWatchlist,
    apiKey,
    proxyType,
    customProxy,
    addToast,
    onEvent: handleTrackerEvent,
    onAuthStatus: handleAuthStatus,
  });

  const apex = useApexWatchlist({ apiKey: apexApiKey, addToast });
  const apexPolling = useApexPolling({
    watchlistRef: apex.watchlistRef,
    setWatchlist: apex.setWatchlist,
    apiKey: apexApiKey,
    addToast,
    onEvent: handleApexEvent,
    onAuthStatus: handleApexAuthStatus,
  });

  // One clock for both games; a game whose key was rejected waits for a new one
  const secondsUntilNextCheck = usePollTicker({
    pollingInterval,
    isEnabled: isGlobalTracking,
    onTick: () => {
      // Game-start messages name the champion, so the first League pass
      // waits for Data Dragon instead of logging "Champion #N"
      if (!isApiKeyRejected) initDataDragon().then(() => refreshAllPlayers());
      if (!isApexKeyRejected) apexPolling.refreshAllPlayers();
    },
  });

  // Initialize Data Dragon
  useEffect(() => {
    initDataDragon().catch(console.warn);
  }, []);

  // Request notification permission if enabled
  useEffect(() => {
    if (notificationsEnabled && getNotificationPermission() === "default") {
      requestNotificationPermission();
    }
  }, [notificationsEnabled]);

  /**
   * Save Settings
   */
  const handleSaveSettings = (newSettings) => {
    // Saving gives the key another try; a bad key gets flagged again on the next check
    setIsApiKeyRejected(false);
    setApiKey(newSettings.apiKey);
    setStoredApiKey(newSettings.apiKey);

    setIsApexKeyRejected(false);
    setApexApiKey(newSettings.apexApiKey);
    setStoredApexApiKey(newSettings.apexApiKey);

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

    setAlertRules(newSettings.alertRules);
    setStoredAlertRules(newSettings.alertRules);

    setWebhooks(newSettings.webhooks);
    setStoredWebhooks(newSettings.webhooks);

    setMotionPref(newSettings.motionPref);
    setStoredMotionPref(newSettings.motionPref);

    setHeroScene(newSettings.heroScene);
    setStoredHeroScene(newSettings.heroScene);

    addToast("success", "Настройки успешно сохранены.", "Сохранено");
  };


  // Downloads the watchlist as a JSON file
  const handleExportWatchlist = () => {
    const blob = new Blob(
      [serializeWatchlist(watchlist, new Date(), apex.watchlist)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `player-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
    addToast(
      "success",
      `Сохранено игроков: ${watchlist.length + apex.watchlist.length}.`,
      "Экспорт списка",
    );
  };

  // One backup file carries both lists
  const handleImportWatchlist = (fileText) => {
    importPlayers(fileText);
    apex.importPlayers(fileText);
  };

  // Filter and sort: PINNED PLAYERS ALWAYS FIRST!
  const statusFilter =
    STATUS_FILTERS.lol.find((f) => f.id === filterStatus) ||
    STATUS_FILTERS.lol[0];
  const filteredAndSortedWatchlist = watchlist
    .filter((player) => {
      if (!statusFilter.match(player)) return false;

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

  const apexPlayers = viewApexPlayers(apex.watchlist, {
    status: filterStatus,
    query: searchQuery,
  });

  // The rail shows the active game: its clock state, list and "check all"
  const activeList = isApex ? apex.watchlist : watchlist;
  const activeKey = isApex ? apexApiKey : apiKey;
  const activeRefreshAll = isApex
    ? apexPolling.refreshAllPlayers
    : refreshAllPlayers;
  const isActiveRefreshing = isApex
    ? apexPolling.isRefreshingAll
    : isRefreshingAll;

  // Why automatic checks aren't running right now, if they aren't
  const trackedCount = activeList.filter((p) => p.isTracking).length;
  const pollIdleReason = (() => {
    if (!activeKey) return "нужен API-ключ";
    if (isApex && isApexKeyRejected) return "ключ Apex отклонён";
    if (!isApex && isApiKeyRejected) return "ключ отклонён Riot";
    if (activeList.length === 0) return "список пуст";
    if (trackedCount === 0) return "все игроки на паузе";
    if (!isGlobalTracking) return "автоопрос на паузе";
    return null;
  })();

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans lg:grid lg:grid-cols-[19rem_minmax(0,1fr)]">
      {/* Keyboard users can jump past the control rail */}
      <a
        href="#watchlist"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-fg font-mono text-xs"
      >
        к списку игроков
      </a>
      {/* Control rail: clock, controls, counters, filters */}
      <aside className="flex flex-col border-b lg:border-b-0 lg:border-r border-line lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <GameTabs
          activeGame={activeGame}
          onChange={switchGame}
          liveCounts={{
            lol: watchlist.filter((p) => p.status === "IN_GAME").length,
            apex: apex.watchlist.filter((p) => p.status === "IN_GAME").length,
          }}
        />
        <Navbar
          gameLabel={isApex ? "Apex" : "LoL"}
          isGlobalTracking={isGlobalTracking}
          toggleGlobalTracking={() => setIsGlobalTracking(!isGlobalTracking)}
          secondsUntilNextCheck={secondsUntilNextCheck}
          pollingInterval={pollingInterval}
          isRefreshingAll={isActiveRefreshing}
          refreshAllPlayers={activeRefreshAll}
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
          hasApiKey={Boolean(activeKey)}
          idleReason={pollIdleReason}
          canCheckNow={Boolean(activeKey) && trackedCount > 0}
        />
        <StatsBar
          watchlist={activeList}
          filters={STATUS_FILTERS[activeGame]}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </aside>

      <div className="min-w-0 flex flex-col min-h-screen">
        <Hero
          scene={heroScene}
          onCycleScene={() => {
            const next = nextHeroScene(heroScene);
            setHeroScene(next);
            setStoredHeroScene(next);
          }}
          subtitle={
            isApex
              ? "Живой список игроков Apex Legends: уведомление, когда игрок появляется в сети и заходит в матч."
              : "Живой список аккаунтов League of Legends: уведомление в момент, когда матч начинается."
          }
        />
        {/* The hero (and its h1) is hidden on phones */}
        <h1 className="sr-only sm:hidden">Кто сейчас в игре</h1>

        <main
          id="game-panel"
          role="tabpanel"
          aria-labelledby={`tab-${activeGame}`}
          className="flex-1 w-full max-w-6xl px-4 lg:px-10 py-8 space-y-10"
        >
          {isApex ? (
            <ApexBoard
              apiKey={apexApiKey}
              isKeyRejected={isApexKeyRejected}
              openSettings={() => setIsSettingsOpen(true)}
              watchlist={apex.watchlist}
              players={apexPlayers}
              isAddingPlayer={apex.isAddingPlayer}
              onAddPlayer={apex.addPlayer}
              onCheckPlayer={(p) => apexPolling.checkPlayerStatus(p, true)}
              checkingPlayerIds={apexPolling.checkingPlayerIds}
              onToggleTracking={apex.toggleTracking}
              onDeletePlayer={apex.deletePlayer}
              onTogglePin={apex.togglePin}
              onToggleMute={apex.toggleMute}
              onResetFilter={() => {
                setFilterStatus("ALL");
                setSearchQuery("");
              }}
              listRef={listRef}
            />
          ) : (
            <>
              {/* Missing or rejected key with players in the list; the first-run
                  guide covers the empty case */}
              {(isApiKeyRejected || !apiKey) && watchlist.length > 0 && (
                <div
                  role="alert"
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-warn/50 bg-warn/10 px-4 py-3"
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-4 h-4 text-warn shrink-0 mt-0.5" />
                    <div className="text-sm text-ink">
                      {apiKey ? "Riot отклонил API-ключ." : "Нужен API-ключ Riot."}{" "}
                      <span className="text-ink-2">
                        {apiKey
                          ? "Development-ключ живёт 24 часа: получите новый на портале Riot. Автоопрос ждёт новый ключ."
                          : "Без него список не обновляется. Бесплатный ключ выдаёт портал разработчиков Riot."}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSettingsOpen(true)}
                    className="btn-primary px-4 h-9 font-mono text-xs shrink-0"
                  >
                    {apiKey ? "обновить ключ" : "указать ключ"}
                  </button>
                </div>
              )}

              <Reveal>
                <AddPlayerBar
                  onAddPlayer={addPlayer}
                  isAdding={isAddingPlayer}
                  hasApiKey={Boolean(apiKey)}
                  openSettings={() => setIsSettingsOpen(true)}
                />
              </Reveal>

              {/* Watchlist board */}
              <section
                id="watchlist"
                tabIndex={-1}
                aria-label="Список наблюдения"
                className="focus:outline-none"
              >
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="label">Список</h2>
                  <span className="label tabular-nums">
                    {filteredAndSortedWatchlist.length} / {watchlist.length}
                  </span>
                </div>

                {watchlist.length === 0 ? (
                  <FirstRunGuide
                    hasApiKey={Boolean(apiKey)}
                    openSettings={() => setIsSettingsOpen(true)}
                    focusAddInput={() =>
                      document.getElementById("riot-id-input")?.focus()
                    }
                  />
                ) : filteredAndSortedWatchlist.length === 0 ? (
                  <NoMatchesState
                    onReset={() => {
                      setFilterStatus("ALL");
                      setSearchQuery("");
                    }}
                  />
                ) : (
                  <div ref={listRef} className="relative border-t border-line">
                    {filteredAndSortedWatchlist.map((player, index) => (
                      <Reveal
                        key={player.id}
                        data-flip-id={player.id}
                        delay={Math.min(index, 8) * 60}
                      >
                        <PlayerCard
                          player={player}
                          onCheckPlayer={(p) => checkPlayerStatus(p, true)}
                          onToggleTracking={toggleTracking}
                          onDeletePlayer={deletePlayer}
                          onViewMatch={(p) => setActiveMatchModalPlayer(p)}
                          onTogglePin={togglePin}
                          onToggleMute={toggleMute}
                          onOpenMatchHistory={(p) => setSelectedPlayerForHistory(p)}
                          isChecking={checkingPlayerIds.has(player.id)}
                        />
                      </Reveal>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>

        <footer className="px-4 lg:px-10 py-6 border-t border-line label flex flex-wrap justify-between gap-2">
          {isApex ? (
            <>
              <span>Apex Legends Tracker</span>
              <span>данные: apexlegendsstatus.com</span>
            </>
          ) : (
            <>
              <span>League Spectator Tracker</span>
              <span>Riot Spectator-V5 · Match-V5</span>
            </>
          )}
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
          // A fresh object: nothing (PUUID, level) may leak from the
          // player whose history was open before
          const [gameName, tagLine = ""] = (otherPlayer.riotId || "").split("#");
          setSelectedPlayerForHistory({
            region: selectedPlayerForHistory.region,
            puuid: otherPlayer.puuid || null,
            gameName: gameName || "Игрок",
            tagLine,
            profileIconId: otherPlayer.profileIconId || 29,
          });
        }}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        apexApiKey={apexApiKey}
        proxyType={proxyType}
        customProxy={customProxy}
        pollingInterval={pollingInterval}
        notificationsEnabled={notificationsEnabled}
        chimeEnabled={chimeEnabled}
        soundEnabled={soundEnabled}
        alertRules={alertRules}
        webhooks={webhooks}
        motionPref={motionPref}
        motionLevel={motionLevel}
        heroScene={heroScene}
        onSave={handleSaveSettings}
        activeGameName={isApex ? "Apex" : "League"}
        onResetWatchlist={isApex ? apex.clearWatchlist : clearWatchlist}
        onExportWatchlist={handleExportWatchlist}
        onImportWatchlist={handleImportWatchlist}
        watchlistSize={activeList.length}
        backupSize={watchlist.length + apex.watchlist.length}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}
