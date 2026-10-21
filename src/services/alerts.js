// Turns tracker events into toasts, sounds, desktop popups and phone
// messages (Telegram/Discord), according to the user's alert rules
import { getChampionByKey } from "./ddragon";
import { getQueueInfo } from "../data/queues";
import { shouldAlert, shouldAlertApex } from "./alertRules";
import { sendWebhookAlerts } from "./webhooks";
import { formatMatchResult } from "./matchResult";
import { formatApexResult } from "./apexMatch";
import { getLegendAssets } from "./apexAssets";
import { getApexPlatform } from "../data/apexPlatforms";
import {
  sendDesktopNotification,
  playMatchAlertSound,
  playGameStartChime,
} from "./notifications";

const sendWebhooks = (webhooks, text, addToast) => {
  sendWebhookAlerts(webhooks, text).then((errors) => {
    errors.forEach((err) =>
      addToast("warning", err.message, "Уведомление не отправлено"),
    );
  });
};

// Siren for pinned players, the soft chime for everyone else
const playStartSounds = (settings, player, title, body, extra = {}) => {
  const isPinned = Boolean(player.isPinned);
  const shouldPlaySiren = settings.soundEnabled && isPinned;
  if (settings.notificationsEnabled) {
    sendDesktopNotification(
      `${title}${isPinned ? " 📌" : ""}`,
      { body, ...extra },
      shouldPlaySiren,
    );
  } else if (shouldPlaySiren) {
    playMatchAlertSound();
  }
  if (settings.chimeEnabled && !shouldPlaySiren) {
    playGameStartChime();
  }
};

/**
 * event:    { type: "GAME_START", player, championId, queueId }
 *         | { type: "GAME_END", player }
 *         | { type: "MATCH_RESULT", player, result }
 * settings: { notificationsEnabled, soundEnabled, chimeEnabled, alertRules, webhooks }
 */
export const announceTrackerEvent = (event, settings, addToast) => {
  const { player } = event;
  const riotId = `${player.gameName}#${player.tagLine}`;

  if (event.type === "GAME_START") {
    const champ = getChampionByKey(event.championId);
    const queue = getQueueInfo(event.queueId);
    addToast(
      "success",
      `${player.gameName} начал матч за ${champ.name}!`,
      "Игрок в матче",
    );

    const loud = shouldAlert({
      kind: "start",
      player,
      queueId: event.queueId,
      champion: champ,
      rules: settings.alertRules,
    });
    if (!loud) return;

    playStartSounds(
      settings,
      player,
      `${player.gameName} сейчас В ИГРЕ!`,
      `Чемпион: ${champ.name} | Режим: ${queue.name}`,
    );

    sendWebhooks(
      settings.webhooks,
      `🟢 ${riotId} начал матч: ${champ.name} (${queue.name})`,
      addToast,
    );
    return;
  }

  if (event.type === "GAME_END") {
    addToast("info", `${player.gameName} больше не в матче.`, "Матч завершён");
    return;
  }

  if (event.type === "MATCH_RESULT") {
    const { result } = event;
    const summary = formatMatchResult(result);
    addToast(
      result.win && !result.remake ? "success" : "info",
      `${player.gameName}: ${summary}`,
      "Итог матча",
    );

    const loud = shouldAlert({
      kind: "result",
      player,
      queueId: result.queueId,
      champion: getChampionByKey(result.championId),
      rules: settings.alertRules,
    });
    if (!loud) return;

    if (settings.notificationsEnabled) {
      sendDesktopNotification(`${player.gameName}: итог матча`, {
        body: summary,
        tag: "lol-match-result",
      });
    }
    sendWebhooks(settings.webhooks, `🏁 ${riotId}: ${summary}`, addToast);
  }
};

// Legend icon for the desktop popup, when one has been seen
const legendIcon = (legend) => {
  const icon = getLegendAssets(legend)?.icon;
  return icon ? { icon } : {};
};

/**
 * Apex Legends events, same settings as announceTrackerEvent:
 * event: { type: "ONLINE", player }
 *      | { type: "GAME_START", player, legend }
 *      | { type: "GAME_END", player }
 *      | { type: "MATCH_RESULT", player, result }
 */
export const announceApexEvent = (event, settings, addToast) => {
  const { player } = event;
  const label = `${player.name} (${getApexPlatform(player.platform).short})`;

  if (event.type === "ONLINE") {
    addToast("info", `${player.name} в сети.`, "Apex · в лобби");
    if (
      !shouldAlertApex({ kind: "online", player, rules: settings.alertRules })
    ) {
      return;
    }
    if (settings.notificationsEnabled) {
      sendDesktopNotification(`${player.name} в сети`, {
        body: "Apex Legends: игрок в лобби",
        tag: "apex-online",
      });
    }
    if (settings.chimeEnabled) playGameStartChime();
    sendWebhooks(settings.webhooks, `🟡 ${label} в сети (Apex Legends)`, addToast);
    return;
  }

  if (event.type === "GAME_START") {
    const legend = event.legend || "легенда не выбрана";
    addToast(
      "success",
      `${player.name} начал матч${event.legend ? ` за ${event.legend}` : ""}!`,
      "Apex · в матче",
    );
    if (
      !shouldAlertApex({
        kind: "start",
        player,
        legend: event.legend,
        rules: settings.alertRules,
      })
    ) {
      return;
    }
    playStartSounds(
      settings,
      player,
      `${player.name} сейчас В МАТЧЕ!`,
      `Apex Legends · ${legend}`,
      { tag: "apex-game-alert", ...legendIcon(event.legend) },
    );
    sendWebhooks(
      settings.webhooks,
      `🟢 ${label} начал матч в Apex Legends: ${legend}`,
      addToast,
    );
    return;
  }

  if (event.type === "GAME_END") {
    addToast("info", `${player.name} вышел из матча.`, "Apex · матч завершён");
    return;
  }

  if (event.type === "MATCH_RESULT") {
    const { result } = event;
    const summary = formatApexResult(result);
    addToast(
      result.win ? "success" : "info",
      `${player.name}: ${summary}`,
      "Apex · итог матча",
    );
    if (
      !shouldAlertApex({
        kind: "result",
        player,
        legend: result.legend,
        rules: settings.alertRules,
      })
    ) {
      return;
    }
    if (settings.notificationsEnabled) {
      sendDesktopNotification(`${player.name}: итог матча`, {
        body: summary,
        tag: "apex-match-result",
        ...legendIcon(result.legend),
      });
    }
    sendWebhooks(settings.webhooks, `🏁 ${label}: ${summary}`, addToast);
  }
};
