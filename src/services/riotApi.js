import { getRegionById, getRegionalHost } from "../data/regions";

export class RiotApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "RiotApiError";
    this.status = status;
    this.code = code;
  }
}

const PROXY_LABELS = {
  vite: "локальный прокси",
  corsproxy: "corsproxy.io",
  allorigins: "allorigins.win",
  custom: "свой прокси",
  direct: "напрямую",
};

/**
 * Builds the proxied URL based on chosen proxy strategy
 */
export const buildProxiedUrl = (
  targetUrl,
  proxyType = "vite",
  customProxy = "",
) => {
  switch (proxyType) {
    case "vite":
      // Uses the local Vite dev proxy server
      return `/api/riot-proxy?url=${encodeURIComponent(targetUrl)}`;
    case "corsproxy":
      return `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    case "allorigins":
      return `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    case "custom":
      if (!customProxy) return targetUrl;
      if (customProxy.includes("{url}")) {
        return customProxy.replace("{url}", encodeURIComponent(targetUrl));
      }
      return `${customProxy.trim()}${encodeURIComponent(targetUrl)}`;
    case "direct":
    default:
      return targetUrl;
  }
};

/**
 * Parses "Name#TAG" into { gameName, tagLine }
 */
export const parseRiotId = (input, defaultTag = "EUW") => {
  if (!input || typeof input !== "string") {
    throw new RiotApiError(
      "Введите Riot ID, например Faker#KR1.",
      400,
      "INVALID_INPUT",
    );
  }

  const parts = input.trim().split("#");
  const gameName = parts[0].trim();
  const tagLine = parts[1] ? parts[1].trim() : defaultTag;

  if (!gameName) {
    throw new RiotApiError("В Riot ID не хватает имени перед #.", 400, "EMPTY_NAME");
  }

  return { gameName, tagLine };
};

/**
 * Internal fetch with Riot Token & comprehensive status handling
 */
const fetchRiotEndpoint = async (targetUrl, apiKey, proxyType, customProxy) => {
  if (!apiKey) {
    throw new RiotApiError(
      "Нужен API-ключ Riot: укажите его в настройках.",
      401,
      "MISSING_API_KEY",
    );
  }

  const proxiedUrl = buildProxiedUrl(targetUrl, proxyType, customProxy);

  let response;
  try {
    response = await fetch(proxiedUrl, {
      method: "GET",
      headers: {
        "X-Riot-Token": apiKey.trim(),
        Accept: "application/json",
      },
    });
  } catch {
    throw new RiotApiError(
      `Не удалось связаться с Riot API (${PROXY_LABELS[proxyType] || proxyType}). Проверьте интернет и настройки прокси.`,
      0,
      "NETWORK_ERROR",
    );
  }

  if (response.status === 200) {
    try {
      return await response.json();
    } catch {
      throw new RiotApiError(
        "Riot API вернул некорректный ответ.",
        500,
        "INVALID_JSON",
      );
    }
  }

  if (response.status === 404) {
    throw new RiotApiError("Не найдено (404).", 404, "NOT_FOUND");
  }

  if (response.status === 401 || response.status === 403) {
    throw new RiotApiError(
      "API-ключ Riot недействителен или истёк. Получите новый на портале разработчиков.",
      response.status,
      "INVALID_KEY",
    );
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    throw new RiotApiError(
      `Превышен лимит запросов Riot API.${retryAfter ? ` Повторите через ${retryAfter} с.` : ""}`,
      429,
      "RATE_LIMITED",
    );
  }

  if (
    response.status === 500 ||
    response.status === 502 ||
    response.status === 503 ||
    response.status === 504
  ) {
    throw new RiotApiError(
      "Riot API сейчас недоступен или на обслуживании.",
      response.status,
      "SERVER_ERROR",
    );
  }

  throw new RiotApiError(
    `Запрос к Riot API не удался: HTTP ${response.status}.`,
    response.status,
    "UNKNOWN_ERROR",
  );
};

/**
 * 1. Fetch PUUID via Riot Account-V1
 * GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}
 */
export const fetchPuuidByRiotId = async ({
  gameName,
  tagLine,
  regionId,
  apiKey,
  proxyType,
  customProxy,
}) => {
  const region = getRegionById(regionId);
  const regionalHost = getRegionalHost(region.regionalRoute);

  const endpoint = `https://${regionalHost}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;

  try {
    const data = await fetchRiotEndpoint(
      endpoint,
      apiKey,
      proxyType,
      customProxy,
    );
    return {
      puuid: data.puuid,
      gameName: data.gameName || gameName,
      tagLine: data.tagLine || tagLine,
    };
  } catch (err) {
    if (err.status === 404) {
      throw new RiotApiError(
        `Игрок ${gameName}#${tagLine} не найден в регионе ${region.short}. Проверьте имя, тег и регион.`,
        404,
        "PLAYER_NOT_FOUND",
      );
    }
    throw err;
  }
};

/**
 * Optional: Fetch Summoner details (icon & level) via Summoner-V4 by PUUID
 * GET /lol/summoner/v4/summoners/by-puuid/{puuid}
 */
export const fetchSummonerByPuuid = async ({
  puuid,
  regionId,
  apiKey,
  proxyType,
  customProxy,
}) => {
  const region = getRegionById(regionId);
  const endpoint = `https://${region.platform}/lol/summoner/v4/summoners/by-puuid/${puuid}`;

  try {
    const data = await fetchRiotEndpoint(
      endpoint,
      apiKey,
      proxyType,
      customProxy,
    );
    return {
      profileIconId: data.profileIconId,
      summonerLevel: data.summonerLevel,
      summonerId: data.id,
    };
  } catch {
    // If summoner-v4 fails or returns 404, we can still proceed with puuid
    return {
      profileIconId: 29,
      summonerLevel: 1,
      summonerId: null,
    };
  }
};

/**
 * 2. Check Active Game (Spectator-V5)
 * GET /lol/spectator/v5/active-games/by-summoner/{puuid}
 */
export const checkActiveGameByPuuid = async ({
  puuid,
  regionId,
  apiKey,
  proxyType,
  customProxy,
}) => {
  const region = getRegionById(regionId);
  const endpoint = `https://${region.platform}/lol/spectator/v5/active-games/by-summoner/${puuid}`;

  try {
    const gameData = await fetchRiotEndpoint(
      endpoint,
      apiKey,
      proxyType,
      customProxy,
    );

    // If player is offline or not currently in an active match
    if (gameData?.notInGame || !gameData?.participants) {
      return {
        isInGame: false,
        gameData: null,
      };
    }

    // HTTP 200: Player is currently IN GAME!
    // Find the participant for this player
    const participant = gameData.participants?.find((p) => p.puuid === puuid);

    return {
      isInGame: true,
      gameData,
      participant: participant || null,
      championId: participant?.championId || null,
      spell1Id: participant?.spell1Id || null,
      spell2Id: participant?.spell2Id || null,
      queueId: gameData.gameQueueConfigId,
      gameStartTime: gameData.gameStartTime || 0,
      gameLength: gameData.gameLength || 0,
    };
  } catch (err) {
    if (err.status === 404) {
      // 404 means player is OFFLINE / NOT IN GAME
      return {
        isInGame: false,
        gameData: null,
      };
    }
    // Re-throw other errors (401, 403, 429, network, etc.)
    throw err;
  }
};

/**
 * 3. Ranked standing via League-V4
 * GET /lol/league/v4/entries/by-puuid/{puuid}
 * Returns { solo, flex }, each { tier, rank, lp, wins, losses } or null if unranked
 */
export const fetchRanksByPuuid = async ({
  puuid,
  regionId,
  apiKey,
  proxyType,
  customProxy,
}) => {
  const region = getRegionById(regionId);
  const endpoint = `https://${region.platform}/lol/league/v4/entries/by-puuid/${puuid}`;

  const entries = await fetchRiotEndpoint(
    endpoint,
    apiKey,
    proxyType,
    customProxy,
  );

  const pick = (queueType) => {
    const entry = Array.isArray(entries)
      ? entries.find((e) => e.queueType === queueType)
      : null;
    if (!entry) return null;
    return {
      tier: entry.tier,
      rank: entry.rank,
      lp: entry.leaguePoints || 0,
      wins: entry.wins || 0,
      losses: entry.losses || 0,
    };
  };

  return { solo: pick("RANKED_SOLO_5x5"), flex: pick("RANKED_FLEX_SR") };
};

/**
 * 4. Outcome of a finished match via Match-V5
 * GET /lol/match/v5/matches/{matchId}
 * Riot publishes a match a few minutes after it ends, so null means "not yet".
 */
export const fetchMatchResult = async ({
  matchId,
  puuid,
  regionId,
  apiKey,
  proxyType,
  customProxy,
}) => {
  const region = getRegionById(regionId);
  const regionalHost = getRegionalHost(region.regionalRoute);
  const endpoint = `https://${regionalHost}/lol/match/v5/matches/${matchId}`;

  let match;
  try {
    match = await fetchRiotEndpoint(endpoint, apiKey, proxyType, customProxy);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }

  const info = match?.info;
  const participant = info?.participants?.find((p) => p.puuid === puuid);
  if (!participant) return null;

  return {
    matchId,
    queueId: info.queueId,
    championId: participant.championId,
    win: Boolean(participant.win),
    remake: Boolean(participant.gameEndedInEarlySurrender),
    // Arena ranks players 1-8 instead of win/loss
    placement: info.gameMode === "CHERRY" ? participant.placement || null : null,
    kills: participant.kills || 0,
    deaths: participant.deaths || 0,
    assists: participant.assists || 0,
    duration: info.gameDuration || 0,
    startedAt: info.gameStartTimestamp || null,
    endedAt: info.gameEndTimestamp || Date.now(),
  };
};

/**
 * 5. Id of the player's most recent finished match via Match-V5
 * GET /lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count=1
 * Returns null when the player has no matches.
 */
export const fetchLatestMatchId = async ({
  puuid,
  regionId,
  apiKey,
  proxyType,
  customProxy,
}) => {
  const region = getRegionById(regionId);
  const regionalHost = getRegionalHost(region.regionalRoute);
  const endpoint = `https://${regionalHost}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=1`;

  const ids = await fetchRiotEndpoint(endpoint, apiKey, proxyType, customProxy);
  return Array.isArray(ids) && ids.length > 0 ? ids[0] : null;
};

/**
 * Test API key with a fast verification request
 */
export const testRiotApiKey = async ({ apiKey, proxyType, customProxy }) => {
  // Test by checking a public account endpoint in europe
  const endpoint = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/Riot/EUW`;
  try {
    const res = await fetchRiotEndpoint(
      endpoint,
      apiKey,
      proxyType,
      customProxy,
    );
    return { success: true, data: res };
  } catch (err) {
    if (err.status === 404) {
      // 404 means the endpoint was reached and authenticated (key is valid!), just the specific test name didn't exist
      return { success: true, message: "Ключ работает." };
    }
    return { success: false, error: err.message, status: err.status };
  }
};
