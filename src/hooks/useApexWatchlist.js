import { useState } from "react";
import { usePlayerList } from "./usePlayerList";
import {
  getStoredApexWatchlist,
  setStoredApexWatchlist,
} from "../services/storage";
import { getApexPlatform } from "../data/apexPlatforms";
import { fetchApexPlayer } from "../services/apexApi";
import { rememberLegendAssets } from "../services/apexAssets";
import { createApexPlayer } from "../services/apexTracking";
import {
  createPlayerId,
  parseApexBackup,
  mergeImportedApexPlayers,
} from "../services/watchlistBackup";

const getName = (p) => p.name;

// A bare number is a UID (the only way to find Switch players)
const UID_PATTERN = /^\d{6,}$/;

/**
 * The Apex Legends watchlist (persisted to localStorage) and the actions on
 * it; the shared ones (pin, mute, delete…) come from usePlayerList.
 */
export const useApexWatchlist = ({ apiKey, addToast }) => {
  const list = usePlayerList({
    load: getStoredApexWatchlist,
    save: setStoredApexWatchlist,
    addToast,
    getName,
  });
  const { setWatchlist, watchlistRef } = list;
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);

  const addPlayer = async ({ rawInput, platformId, isPinned = false }) => {
    const platform = getApexPlatform(platformId);
    const input = String(rawInput || "").trim();
    const isUid = UID_PATTERN.test(input);

    if (!platform.byName && !isUid) {
      addToast(
        "error",
        `${platform.name}: игроков можно найти только по UID (число).`,
        "Нужен UID",
      );
      return;
    }

    const sameName = (p) =>
      p.platform === platform.id &&
      (p.uid === input || p.name.toLowerCase() === input.toLowerCase());
    if (watchlistRef.current.some(sameName)) {
      addToast("info", `${input} уже есть в вашем списке.`, "Уже добавлен");
      return;
    }

    setIsAddingPlayer(true);
    try {
      const snap = await fetchApexPlayer({
        ...(isUid ? { uid: input } : { name: input }),
        platform: platform.id,
        apiKey,
      });
      rememberLegendAssets(snap.legendAssets);

      // The name may differ in case, or the input was a UID
      if (
        watchlistRef.current.some(
          (p) => p.platform === platform.id && p.uid === snap.uid,
        )
      ) {
        addToast("info", `${snap.name} уже есть в вашем списке.`, "Уже добавлен");
        return;
      }

      const newPlayer = createApexPlayer(snap, {
        id: createPlayerId(),
        platform: platform.id,
        isPinned,
      });
      setWatchlist((prev) => [newPlayer, ...prev]);
      addToast(
        "success",
        `${snap.name} (${platform.short}) добавлен в список.`,
        "Игрок сохранен",
      );
    } catch (err) {
      console.error("Failed to add Apex player:", err);
      addToast(
        "error",
        err.status === 404
          ? `Игрок ${input} не найден на ${platform.name}. ${
              platform.id === "PC"
                ? "Для PC нужен ник EA-аккаунта, даже если игра запущена через Steam."
                : "Проверьте ник и платформу."
            }`
          : err.message || "Не удалось найти игрока.",
        "Ошибка поиска",
      );
    } finally {
      setIsAddingPlayer(false);
    }
  };

  // Quiet for backups without Apex players, so a League-only import shows one toast
  const importPlayers = (fileText) => {
    try {
      const imported = parseApexBackup(fileText);
      if (imported.length === 0) return;
      const { watchlist: merged, added, skipped } = mergeImportedApexPlayers(
        watchlistRef.current,
        imported,
      );
      setWatchlist(merged);
      addToast(
        added > 0 ? "success" : "info",
        `Добавлено игроков Apex: ${added}${skipped > 0 ? `, уже были в списке: ${skipped}` : ""}.`,
        "Импорт Apex",
      );
    } catch {
      // The League import already reported a broken file
    }
  };

  return {
    ...list,
    isAddingPlayer,
    addPlayer,
    importPlayers,
  };
};
