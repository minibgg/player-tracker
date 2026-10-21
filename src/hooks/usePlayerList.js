import { useState, useEffect, useRef } from "react";

const HISTORY_LIMIT = 20;

/**
 * A persisted list of tracked players and the actions every game's list
 * shares: pin, mute, pause, delete and clear (both with undo).
 * watchlistRef is an always-current view for async callbacks, which avoids
 * stale closures and keeps side effects out of state updater functions.
 * getName(player) is the name toasts use.
 */
export const usePlayerList = ({ load, save, addToast, getName }) => {
  const [watchlist, setWatchlist] = useState(load);

  const watchlistRef = useRef(watchlist);
  useEffect(() => {
    watchlistRef.current = watchlist;
    save(watchlist);
  }, [watchlist, save]);

  const findPlayer = (playerId) =>
    watchlistRef.current.find((p) => p.id === playerId);

  const updatePlayer = (playerId, update) =>
    setWatchlist((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, ...update(p) } : p)),
    );

  const togglePin = (playerId) => {
    const player = findPlayer(playerId);
    if (!player) return;
    const nextState = !player.isPinned;
    updatePlayer(playerId, () => ({ isPinned: nextState }));
    addToast(
      "info",
      nextState
        ? `Игрок ${getName(player)} закреплен вверху списка.`
        : `Игрок ${getName(player)} откреплен.`,
      "Закрепление",
    );
  };

  // Muted players still show up in toasts and the log, but never make noise
  const toggleMute = (playerId) => {
    const player = findPlayer(playerId);
    if (!player) return;
    const nextState = !player.isMuted;
    updatePlayer(playerId, () => ({ isMuted: nextState }));
    addToast(
      "info",
      nextState
        ? `Уведомления о ${getName(player)} выключены.`
        : `Уведомления о ${getName(player)} включены.`,
      "Уведомления",
    );
  };

  // No confirmation dialog: the toast offers an undo instead
  const deletePlayer = (playerId) => {
    const index = watchlistRef.current.findIndex((p) => p.id === playerId);
    if (index < 0) return;
    const player = watchlistRef.current[index];
    setWatchlist((prev) => prev.filter((p) => p.id !== playerId));
    addToast("info", `${getName(player)} удалён из списка.`, "Удалено", {
      action: {
        label: "вернуть",
        onClick: () =>
          setWatchlist((prev) =>
            prev.some((p) => p.id === player.id)
              ? prev
              : [...prev.slice(0, index), player, ...prev.slice(index)],
          ),
      },
    });
  };

  const toggleTracking = (playerId) => {
    updatePlayer(playerId, (p) => {
      const nextState = !p.isTracking;
      return {
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
        ].slice(0, HISTORY_LIMIT),
      };
    });
  };

  const clearWatchlist = () => {
    const previous = watchlistRef.current;
    if (previous.length === 0) return;
    setWatchlist([]);
    addToast("info", `Удалено игроков: ${previous.length}.`, "Список очищен", {
      action: { label: "вернуть", onClick: () => setWatchlist(previous) },
    });
  };

  return {
    watchlist,
    setWatchlist,
    watchlistRef,
    togglePin,
    toggleMute,
    deletePlayer,
    toggleTracking,
    clearWatchlist,
  };
};
