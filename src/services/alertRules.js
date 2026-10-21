// Rules that decide whether a tracker event (a game started, a match result)
// alerts outside the app: sound, desktop popup, Telegram/Discord. Toasts and
// the status log always get every event.
import { getQueueInfo } from "../data/queues";

export const QUEUE_CATEGORIES = [
  { id: "RANKED", label: "Рейтинговые" },
  { id: "NORMAL", label: "Обычные" },
  { id: "ARAM", label: "ARAM" },
  { id: "OTHER", label: "Остальные" },
];

export const DEFAULT_ALERT_RULES = {
  queueCategories: QUEUE_CATEGORIES.map((c) => c.id),
  // Champion names as the user typed them; empty = any champion
  champions: [],
  notifyResults: false,
  quietHours: { enabled: false, from: "23:00", to: "08:00" },
  // Apex Legends: legend names, empty = any legend
  apexLegends: [],
  apexNotifyOnline: false,
};

export const getQueueCategory = (queueId) => {
  const { type } = getQueueInfo(queueId);
  if (type === "Ranked") return "RANKED";
  if (type === "Normal") return "NORMAL";
  if (type === "ARAM") return "ARAM";
  return "OTHER";
};

// "Kai'Sa" and "kaisa" should match, as should "Lee Sin" and "leesin"
export const normalizeChampionName = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

export const parseChampionList = (text) =>
  String(text || "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => normalizeChampionName(name) !== "");

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
};

// Quiet hours may wrap past midnight (23:00 → 08:00)
export const isQuietTime = (date, quietHours) => {
  if (!quietHours?.enabled) return false;
  const from = toMinutes(quietHours.from);
  const to = toMinutes(quietHours.to);
  if (from === to) return false;
  const minutes = date.getHours() * 60 + date.getMinutes();
  return from < to
    ? minutes >= from && minutes < to
    : minutes >= from || minutes < to;
};

/**
 * Whether an event should alert outside the app.
 * kind: "start" (game started) or "result" (match result arrived)
 * champion: Data Dragon champion object ({ id, name })
 */
export const shouldAlert = ({
  kind,
  player,
  queueId,
  champion,
  rules,
  now = new Date(),
}) => {
  if (player.isMuted) return false;
  if (kind === "result" && !rules.notifyResults) return false;
  if (!rules.queueCategories.includes(getQueueCategory(queueId))) return false;
  if (rules.champions.length > 0) {
    const wanted = rules.champions.map(normalizeChampionName);
    // Data Dragon id differs from the name for a few champions (Wukong = MonkeyKing)
    const names = [champion?.name, champion?.id].map(normalizeChampionName);
    if (!names.some((n) => n && wanted.includes(n))) return false;
  }
  return !isQuietTime(now, rules.quietHours);
};

/**
 * Apex Legends version of shouldAlert.
 * kind: "online" (came online), "start" (match started) or "result"
 */
export const shouldAlertApex = ({
  kind,
  player,
  legend,
  rules,
  now = new Date(),
}) => {
  if (player.isMuted) return false;
  if (kind === "online" && !rules.apexNotifyOnline) return false;
  if (kind === "result" && !rules.notifyResults) return false;
  // Lobby legend says nothing about the next match, so "online" skips the filter
  if (kind !== "online" && rules.apexLegends.length > 0) {
    const wanted = rules.apexLegends.map(normalizeChampionName);
    if (!wanted.includes(normalizeChampionName(legend))) return false;
  }
  return !isQuietTime(now, rules.quietHours);
};
