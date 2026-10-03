import { getRegionById, getRegionalHost } from "../data/regions";

export class RiotApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "RiotApiError";
    this.status = status;
    this.code = code;
  }
}

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
      "Please enter a valid Riot ID",
      400,
      "INVALID_INPUT",
    );
  }

  const parts = input.trim().split("#");
  const gameName = parts[0].trim();
  const tagLine = parts[1] ? parts[1].trim() : defaultTag;

  if (!gameName) {
    throw new RiotApiError("Riot ID name cannot be empty", 400, "EMPTY_NAME");
  }

  return { gameName, tagLine };
};

/**
 * Internal fetch with Riot Token & comprehensive status handling
 */
const fetchRiotEndpoint = async (targetUrl, apiKey, proxyType, customProxy) => {
  if (!apiKey) {
    throw new RiotApiError(
      "Riot API Key is required. Please set it in Settings.",
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
  } catch (err) {
    throw new RiotApiError(
      `Network / CORS error: Failed to reach Riot API via ${proxyType} proxy (${err.message}). Check your internet connection or proxy settings.`,
      0,
      "NETWORK_ERROR",
    );
  }

  if (response.status === 200) {
    try {
      return await response.json();
    } catch {
      throw new RiotApiError(
        "Invalid JSON response received from Riot API",
        500,
        "INVALID_JSON",
      );
    }
  }

  if (response.status === 404) {
    throw new RiotApiError("Not found (404)", 404, "NOT_FOUND");
  }

  if (response.status === 401 || response.status === 403) {
    throw new RiotApiError(
      "Riot API Key is invalid or expired. Please generate a new key on Riot Developer Portal.",
      response.status,
      "INVALID_KEY",
    );
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After");
    throw new RiotApiError(
      `Riot API Rate limit exceeded.${retryAfter ? ` Please wait ${retryAfter}s.` : " Polling will pause briefly."}`,
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
      "Riot Games API service is currently unavailable or undergoing maintenance.",
      response.status,
      "SERVER_ERROR",
    );
  }

  throw new RiotApiError(
    `Riot API request failed with HTTP ${response.status}`,
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
        `Player "${gameName}#${tagLine}" was not found in ${region.name} (${regionalHost}). Check the spelling and tag.`,
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
      return { success: true, message: "API key is valid and authorized!" };
    }
    return { success: false, error: err.message, status: err.status };
  }
};
