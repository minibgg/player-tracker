// Apex Legends Status API (apexlegendsapi.com). EA has no public API; this
// third-party one serves player stats, rank and online status.
// It answers with Access-Control-Allow-Origin: *, so the browser calls it
// directly, no proxy. The key goes in the query string: an Authorization
// header would turn every request into a CORS preflight.

const API_BASE = "https://api.mozambiquehe.re";

export class ApexApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "ApexApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Error for a failed response. The API reports errors as { Error: "..." },
 * sometimes with HTTP 200, so the message matters as much as the status.
 */
export const toApexError = (status, message = "") => {
  const text = String(message || "");
  if (status === 401 || status === 403 || /api key/i.test(text)) {
    return new ApexApiError(
      "API-ключ Apex Legends Status недействителен. Проверьте его в настройках.",
      401,
      "INVALID_KEY",
    );
  }
  if (status === 404 || /not found|doesn't exist|does not exist/i.test(text)) {
    return new ApexApiError(
      "Игрок не найден. Проверьте имя и платформу.",
      404,
      "PLAYER_NOT_FOUND",
    );
  }
  if (status === 429 || /rate limit|too many/i.test(text)) {
    return new ApexApiError(
      "Превышен лимит запросов Apex Legends API.",
      429,
      "RATE_LIMITED",
    );
  }
  if (status === 410) {
    return new ApexApiError("Неизвестная платформа.", 410, "UNKNOWN_PLATFORM");
  }
  if (status >= 500) {
    return new ApexApiError(
      "Apex Legends API сейчас недоступен.",
      status,
      "SERVER_ERROR",
    );
  }
  // 400 "try again later", 405 "external API error" (EA did not answer)
  return new ApexApiError(
    `Apex Legends API не ответил${text ? `: ${text}` : ""}. Повторим в следующем цикле.`,
    status === 405 ? 405 : 400,
    "TRY_AGAIN",
  );
};

const fetchApexEndpoint = async (path, params, apiKey) => {
  if (!apiKey) {
    throw new ApexApiError(
      "Нужен API-ключ Apex Legends Status: укажите его в настройках.",
      401,
      "MISSING_API_KEY",
    );
  }

  const query = new URLSearchParams({ ...params, auth: apiKey.trim() });
  let response;
  try {
    response = await fetch(`${API_BASE}${path}?${query}`);
  } catch {
    throw new ApexApiError(
      "Не удалось связаться с Apex Legends API. Проверьте интернет.",
      0,
      "NETWORK_ERROR",
    );
  }

  // Some errors are plain text ("Error: API key doesn't exist !") despite
  // a JSON content type
  const text = await response.text().catch(() => "");
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  const apiError =
    data && typeof data === "object"
      ? typeof data.Error === "string"
        ? data.Error
        : null
      : text.trim().replace(/^Error:\s*/i, "");
  if (response.ok && data && !apiError) return data;
  throw toApexError(response.ok ? 400 : response.status, apiError);
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// "Mad Maggie", "MadMaggie" and "madmaggie" are the same legend
export const legendKey = (name) =>
  String(name || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");

// "inMatch" / "inLobby" / "offline", with isInGame / isOnline as a fallback
export const getPresence = (realtime = {}) => {
  const state = String(realtime.currentState || "").toLowerCase();
  if (state === "inmatch" || num(realtime.isInGame) === 1) return "IN_GAME";
  if (state === "inlobby" || num(realtime.isOnline) === 1) return "IN_LOBBY";
  return "OFFLINE";
};

const parseRank = (rank) =>
  rank && rank.rankName
    ? {
        name: String(rank.rankName),
        div: num(rank.rankDiv),
        score: num(rank.rankScore),
        img: rank.rankImg || null,
        season: rank.rankedSeason ? String(rank.rankedSeason) : null,
        ladderPos: num(rank.ladderPosPlatform),
      }
    : null;

// Banner trackers: the (up to three) stats a player shows on a legend
const parseTrackers = (data) =>
  Array.isArray(data)
    ? data
        .filter((t) => t && (t.key || t.name) && Number.isFinite(Number(t.value)))
        .map((t) => ({
          key: String(t.key || t.name),
          name: String(t.name || t.key),
          value: Number(t.value),
        }))
    : [];

/**
 * Normalizes a /bridge response into a snapshot:
 * { uid, name, platform, level, xpPercent, isBanned, rank, presence,
 *   stateSince, legend, legends, legendAssets }
 * legends: { [legendKey]: { name, trackers } } for legends with trackers;
 * legendAssets: { [legendKey]: { name, icon, banner } }.
 */
export const parseBridgeResponse = (data) => {
  const global = data?.global;
  if (!global || global.uid == null) {
    throw new ApexApiError(
      "Apex Legends API вернул неожиданный ответ.",
      500,
      "INVALID_RESPONSE",
    );
  }
  const realtime = data.realtime || {};
  const selected = data.legends?.selected || {};

  const legends = {};
  const legendAssets = {};
  const addLegend = (name, entry) => {
    const key = legendKey(name);
    if (!key || !entry) return;
    if (entry.ImgAssets?.icon) {
      legendAssets[key] = {
        name,
        icon: entry.ImgAssets.icon,
        banner: entry.ImgAssets.banner || null,
      };
    }
    const trackers = parseTrackers(entry.data);
    if (trackers.length > 0) legends[key] = { name, trackers };
  };
  Object.entries(data.legends?.all || {}).forEach(([name, entry]) =>
    addLegend(name, entry),
  );
  // The selected legend's trackers are read live; "all" may be older
  if (selected.LegendName) addLegend(selected.LegendName, selected);

  const since = num(realtime.currentStateSinceTimestamp);
  return {
    uid: String(global.uid),
    name: String(global.name || ""),
    platform: String(global.platform || ""),
    level: num(global.level),
    xpPercent: num(global.toNextLevelPercent),
    isBanned: Boolean(global.bans?.isActive),
    rank: parseRank(global.rank),
    presence: getPresence(realtime),
    stateSince: since > 0 ? since * 1000 : null,
    legend: realtime.selectedLegend || selected.LegendName || null,
    legends,
    legendAssets,
  };
};

/**
 * Player snapshot by name (PC: EA account name) or by UID
 * GET /bridge?player={name}&platform={platform}  |  ?uid={uid}&platform=…
 */
export const fetchApexPlayer = async ({ name, uid, platform, apiKey }) => {
  const params = uid
    ? { uid: String(uid), platform }
    : { player: name, platform };
  return parseBridgeResponse(await fetchApexEndpoint("/bridge", params, apiKey));
};

const parseRotationSlot = (slot) =>
  slot?.map
    ? {
        map: String(slot.map),
        start: num(slot.start) * 1000 || null,
        end: num(slot.end) * 1000 || null,
      }
    : null;

/**
 * Current and next maps: { pubs, ranked }, each { current, next } or null.
 * GET /maprotation?version=2
 */
export const fetchMapRotation = async ({ apiKey }) => {
  const data = await fetchApexEndpoint("/maprotation", { version: "2" }, apiKey);
  const mode = (m) =>
    m?.current
      ? { current: parseRotationSlot(m.current), next: parseRotationSlot(m.next) }
      : null;
  return { pubs: mode(data.battle_royale), ranked: mode(data.ranked) };
};

// The map rotation is the cheapest request that needs a valid key
export const testApexApiKey = async ({ apiKey }) => {
  try {
    await fetchApexEndpoint("/maprotation", {}, apiKey);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message, status: err.status };
  }
};
