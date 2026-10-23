import { useState } from "react";
import { usePlayerList } from "./usePlayerList";
import {
  getStoredApexWatchlist,
  setStoredApexWatchlist,
} from "../services/storage";
import { getApexPlatform } from "../data/apexPlatforms";
import { fetchApexPlayer, parseApexPlayerInput } from "../services/apexApi";
import { rememberLegendAssets } from "../services/apexAssets";
import { createApexPlayer } from "../services/apexTracking";
import {
  createPlayerId,
  parseApexBackup,
  mergeImportedApexPlayers,
} from "../services/watchlistBackup";

const getName = (p) => p.name;

// The service's site resolves names its API can't, and links to the UID
const profileUrl = (platform, name) =>
  `https://apexlegendsstatus.com/profile/${platform}/${encodeURIComponent(name)}`;

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
    const { uid, name, platform: linkPlatform } = parseApexPlayerInput(rawInput);
    // A pasted profile link knows its platform better than the select
    const platform = getApexPlatform(linkPlatform || platformId);
    const input = uid || name;

    if (!platform.byName && !uid) {
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
        ...(uid ? { uid } : { name }),
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
      if (err.status === 404 && name) {
        // The API's name search misses many accounts, renamed ones above all;
        // a UID always works
        addToast(
          "error",
          `API не нашёл ${name} на ${platform.name}: поиск по нику работает не для всех аккаунтов, особенно после смены ника. Откройте профиль на apexlegendsstatus.com, нажмите значок платформы рядом с ником и вставьте сюда ссылку из адресной строки: по ней игрок найдётся по UID.`,
          "Ник не найден",
          {
            duration: 20000,
            action: {
              label: "открыть профиль",
              onClick: () =>
                window.open(profileUrl(platform.id, name), "_blank", "noopener"),
            },
          },
        );
        return;
      }
      addToast(
        "error",
        err.status === 404
          ? `Игрок с UID ${uid} не найден на ${platform.name}.`
          : err.message || "Не удалось найти игрока.",
        "Ошибка поиска",
      );
    } finally {
      setIsAddingPlayer(false);
    }
  };

  // Quiet for backups without Apex players, so a League-only import shows one
  // toast. Returns the players it added, for the caller to check right away
  const importPlayers = (fileText) => {
    try {
      const imported = parseApexBackup(fileText);
      if (imported.length === 0) return [];
      const {
        watchlist: merged,
        newPlayers,
        added,
        skipped,
      } = mergeImportedApexPlayers(watchlistRef.current, imported);
      setWatchlist(merged);
      addToast(
        added > 0 ? "success" : "info",
        `Добавлено игроков Apex: ${added}${skipped > 0 ? `, уже были в списке: ${skipped}` : ""}.`,
        "Импорт Apex",
      );
      return newPlayers;
    } catch {
      // The League import already reported a broken file
      return [];
    }
  };

  return {
    ...list,
    isAddingPlayer,
    addPlayer,
    importPlayers,
  };
};
