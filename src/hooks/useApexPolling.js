import { useState, useEffect, useRef, useCallback } from "react";
import { fetchApexPlayer } from "../services/apexApi";
import { rememberLegendAssets } from "../services/apexAssets";
import { applyApexSnapshot } from "../services/apexTracking";

/**
 * Checks tracked Apex players: one /bridge request per player gives presence,
 * rank and trackers; applyApexSnapshot turns it into state and events.
 * onEvent receives ONLINE / GAME_START / GAME_END / MATCH_RESULT events;
 * onAuthStatus(ok) reports whether the API accepted the key.
 *
 * checkPlayerStatus resolves to "STOP" when the rest of a pass would fail the
 * same way (bad key, rate limit, API down), so "Check all" can bail out.
 */
export const useApexPolling = ({
  watchlistRef,
  setWatchlist,
  apiKey,
  addToast,
  onEvent,
  onAuthStatus,
}) => {
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [checkingPlayerIds, setCheckingPlayerIds] = useState(new Set());
  // Two checks of one player at once would both see the old state and
  // announce the same change twice, so the later one is skipped
  const inFlightRef = useRef(new Set());

  // Through refs so new alert settings don't recreate the pollers
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);
  const onAuthStatusRef = useRef(onAuthStatus);
  useEffect(() => {
    onAuthStatusRef.current = onAuthStatus;
  }, [onAuthStatus]);

  const checkPlayerStatus = useCallback(
    async (player, isManual = false) => {
      if (!player.isTracking && !isManual) return;

      if (!apiKey) {
        if (isManual) {
          addToast(
            "warning",
            "Укажите API-ключ Apex Legends Status в настройках, чтобы проверять статус.",
            "Нужен ключ",
          );
        }
        return;
      }

      if (inFlightRef.current.has(player.id)) return;
      inFlightRef.current.add(player.id);
      setCheckingPlayerIds((prev) => new Set(prev).add(player.id));
      try {
        // UID survives name changes; name is the fallback for imported entries
        const snap = await fetchApexPlayer({
          ...(player.uid ? { uid: player.uid } : { name: player.name }),
          platform: player.platform,
          apiKey,
        });
        onAuthStatusRef.current?.(true);
        rememberLegendAssets(snap.legendAssets);

        // Player may have been deleted while the request was in flight
        const p = watchlistRef.current.find((item) => item.id === player.id);
        if (!p) return;

        const { patch, events } = applyApexSnapshot(p, snap, Date.now());
        setWatchlist((prevList) =>
          prevList.map((item) =>
            item.id === player.id ? { ...item, ...patch } : item,
          ),
        );
        events.forEach((event) => onEventRef.current?.(event));
      } catch (err) {
        console.error(`Error checking Apex player ${player.name}:`, err);

        if (err.status === 401) {
          onAuthStatusRef.current?.(false);
          addToast("error", err.message, "Ключ Apex отклонён");
          return "STOP";
        }
        if (err.status === 429) {
          addToast(
            "warning",
            "Превышен лимит запросов Apex Legends API. Остальные игроки проверятся в следующем цикле.",
            "Лимит запросов",
          );
          return "STOP";
        }
        if (err.status === 404) {
          addToast("error", err.message, `Ошибка (${player.name})`);
          return;
        }
        // No connection, EA or the API itself down: every player fails alike
        addToast(
          err.status === 0 ? "error" : "warning",
          err.message,
          err.status === 0 ? "Нет связи" : "Apex API",
        );
        return "STOP";
      } finally {
        inFlightRef.current.delete(player.id);
        setCheckingPlayerIds((prev) => {
          const next = new Set(prev);
          next.delete(player.id);
          return next;
        });
      }
    },
    [apiKey, addToast, watchlistRef, setWatchlist],
  );

  // One by one; also used for players imported or resumed between polls
  const checkPlayers = useCallback(
    async (players) => {
      for (const player of players) {
        if ((await checkPlayerStatus(player, false)) === "STOP") break;
        // Stays well under the API's 5 requests per second; timers are
        // throttled in background tabs, so skip the pause there
        if (!document.hidden) await new Promise((r) => setTimeout(r, 250));
      }
    },
    [checkPlayerStatus],
  );

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
