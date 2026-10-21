// Match History Service using Riot Match-V5 and Data Dragon item icons
import { getRegionById, getRegionalHost } from "../data/regions";
import { buildProxiedUrl } from "./riotApi";

const MATCH_CACHE_PREFIX = "lol_match_cache_";

export const getItemIconUrl = (itemId, version = "14.24.1") => {
  if (!itemId || itemId === 0) return null;
  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`;
};

/**
 * Generates realistic match history for a player when API key is missing or for demo
 */
const generateMockMatches = (player) => {
  const sampleChampions = [
    {
      id: 103,
      name: "Ahri",
      kills: 9,
      deaths: 2,
      assists: 11,
      cs: 198,
      win: true,
      queue: 420,
    },
    {
      id: 157,
      name: "Yasuo",
      kills: 14,
      deaths: 6,
      assists: 5,
      cs: 245,
      win: true,
      queue: 420,
    },
    {
      id: 238,
      name: "Zed",
      kills: 6,
      deaths: 8,
      assists: 3,
      cs: 165,
      win: false,
      queue: 420,
    },
    {
      id: 517,
      name: "Sylas",
      kills: 18,
      deaths: 4,
      assists: 14,
      cs: 142,
      win: true,
      queue: 450,
    },
    {
      id: 84,
      name: "Akali",
      kills: 4,
      deaths: 7,
      assists: 6,
      cs: 180,
      win: false,
      queue: 420,
    },
    {
      id: 222,
      name: "Jinx",
      kills: 12,
      deaths: 3,
      assists: 9,
      cs: 260,
      win: true,
      queue: 420,
    },
    {
      id: 412,
      name: "Thresh",
      kills: 2,
      deaths: 4,
      assists: 19,
      cs: 35,
      win: true,
      queue: 440,
    },
    {
      id: 64,
      name: "Lee Sin",
      kills: 5,
      deaths: 7,
      assists: 8,
      cs: 130,
      win: false,
      queue: 420,
    },
  ];

  const now = Date.now();
  return sampleChampions.map((item, index) => {
    const gameDuration = 1400 + Math.floor(Math.random() * 800);
    const creation =
      now -
      (index * 4 + 1) * 3600 * 1000 -
      Math.floor(Math.random() * 3600 * 1000);

    return {
      matchId: `MOCK_${player.region || "EUW"}_${1000000 + index}`,
      gameCreation: creation,
      gameDuration,
      queueId: item.queue,
      win: item.win,
      championId: item.id,
      championName: item.name,
      champLevel: 14 + Math.floor(Math.random() * 4),
      kills: item.kills,
      deaths: item.deaths,
      assists: item.assists,
      cs: item.cs,
      csPerMin: (item.cs / (gameDuration / 60)).toFixed(1),
      kda:
        item.deaths === 0
          ? "Perfect"
          : ((item.kills + item.assists) / Math.max(1, item.deaths)).toFixed(2),
      spell1Id: 4, // Flash
      spell2Id: item.queue === 450 ? 32 : 14, // Ignite or Snowball
      items: [3089, 3157, 3020, 3135, 4645, 3116, 3364], // Rabadon, Zhonya, Sorc Shoes, Void Staff, Shadowflame, Rylai, Red Trinket
      totalDamage: 18000 + Math.floor(Math.random() * 25000),
      goldEarned: 11000 + Math.floor(Math.random() * 6000),
      allies: [
        {
          championId: item.id,
          riotId: player.gameName || "You",
          isTarget: true,
        },
        { championId: 897, riotId: "Toplaner" },
        { championId: 64, riotId: "Jungler" },
        { championId: 222, riotId: "ADC" },
        { championId: 412, riotId: "Support" },
      ],
      enemies: [
        { championId: 24, riotId: "EnemyTop" },
        { championId: 11, riotId: "EnemyJgl" },
        { championId: 238, riotId: "EnemyMid" },
        { championId: 81, riotId: "EnemyADC" },
        { championId: 99, riotId: "EnemySup" },
      ],
    };
  });
};

const MATCH_FETCH_CONCURRENCY = 3;

/**
 * Runs async `worker` over `items` with at most `limit` in flight,
 * keeping Riot dev-key rate limits (20 req/s, 100 req/2min) in check.
 */
const mapWithConcurrency = async (items, limit, worker) => {
  const results = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
};

/**
 * Fetches recent matches via Riot Match-V5
 */
export const fetchMatchHistory = async ({
  puuid,
  gameName,
  tagLine,
  regionId,
  apiKey,
  proxyType,
  customProxy,
  count = 10,
}) => {
  const cacheKey = `${MATCH_CACHE_PREFIX}${puuid || `${gameName}#${tagLine}`}`;

  // Check in-memory/localStorage cache (valid for 5 minutes)
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (
        Date.now() - parsed.timestamp < 5 * 60 * 1000 &&
        parsed.matches?.length > 0
      ) {
        return { matches: parsed.matches, isCached: true };
      }
    }
  } catch (e) {
    console.warn("Failed reading match history cache:", e);
  }

  // If no API key is provided, return mock match history
  if (!apiKey) {
    const mock = generateMockMatches({ gameName, tagLine, region: regionId });
    return { matches: mock, isMock: true };
  }

  // Match-V5 is keyed by PUUID; without it there is nothing to ask for
  if (!puuid) {
    return {
      matches: [],
      isMock: false,
      error: "Не удалось определить аккаунт игрока.",
    };
  }

  const region = getRegionById(regionId);
  const regionalHost = getRegionalHost(region.regionalRoute);

  try {
    // 1. Get Match IDs by PUUID: GET /lol/match/v5/matches/by-puuid/{puuid}/ids
    const matchIdsUrl = `https://${regionalHost}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=${count}`;
    const proxiedMatchIdsUrl = buildProxiedUrl(
      matchIdsUrl,
      proxyType,
      customProxy,
    );

    const idsRes = await fetch(proxiedMatchIdsUrl, {
      method: "GET",
      headers: {
        "X-Riot-Token": apiKey.trim(),
        Accept: "application/json",
      },
    });

    if (!idsRes.ok) {
      const retryAfter = idsRes.headers.get("Retry-After");
      throw new Error(
        idsRes.status === 429
          ? `Превышен лимит запросов Riot API.${retryAfter ? ` Повторите через ${retryAfter}с.` : ""}`
          : idsRes.status === 401 || idsRes.status === 403
            ? "API-ключ Riot недействителен или истёк."
            : `Не удалось загрузить список матчей: HTTP ${idsRes.status}`,
      );
    }

    const matchIds = await idsRes.json();
    if (!Array.isArray(matchIds) || matchIds.length === 0) {
      return { matches: [], isMock: false };
    }

    // 2. Fetch match details in parallel (up to 7 matches for quick response)
    const targetMatchIds = matchIds.slice(0, 7);
    const matchesRaw = await mapWithConcurrency(
      targetMatchIds,
      MATCH_FETCH_CONCURRENCY,
      async (mId) => {
      try {
        const mUrl = `https://${regionalHost}/lol/match/v5/matches/${mId}`;
        const proxiedMUrl = buildProxiedUrl(mUrl, proxyType, customProxy);
        const mRes = await fetch(proxiedMUrl, {
          method: "GET",
          headers: {
            "X-Riot-Token": apiKey.trim(),
            Accept: "application/json",
          },
        });
        if (!mRes.ok) return null;
        return await mRes.json();
      } catch {
        return null;
      }
      },
    );

    const matchesData = matchesRaw.filter(Boolean);

    // 3. Transform and extract participant info
    const parsedMatches = matchesData.map((m) => {
      const info = m.info || {};
      const participant =
        info.participants?.find(
          (p) =>
            p.puuid === puuid ||
            p.riotIdGameName?.toLowerCase() === gameName?.toLowerCase(),
        ) || {};

      const gameDuration = info.gameDuration || 1200;
      const kills = participant.kills || 0;
      const deaths = participant.deaths || 0;
      const assists = participant.assists || 0;
      const cs =
        (participant.totalMinionsKilled || 0) +
        (participant.neutralMinionsKilled || 0);
      const csPerMin = (cs / Math.max(1, gameDuration / 60)).toFixed(1);
      const kda =
        deaths === 0
          ? "Perfect"
          : ((kills + assists) / Math.max(1, deaths)).toFixed(2);

      const allies = [];
      const enemies = [];
      info.participants?.forEach((p) => {
        const itemObj = {
          puuid: p.puuid,
          championId: p.championId,
          riotId: p.riotIdGameName
            ? `${p.riotIdGameName}#${p.riotIdTagline || ""}`
            : p.summonerName,
          isTarget: p.puuid === puuid,
        };
        if (p.teamId === participant.teamId) {
          allies.push(itemObj);
        } else {
          enemies.push(itemObj);
        }
      });

      return {
        matchId: m.metadata?.matchId || `MATCH_${Date.now()}`,
        gameCreation: info.gameCreation || Date.now(),
        gameDuration,
        queueId: info.queueId || 420,
        win: Boolean(participant.win),
        championId: participant.championId,
        championName: participant.championName,
        champLevel: participant.champLevel || 1,
        kills,
        deaths,
        assists,
        cs,
        csPerMin,
        kda,
        spell1Id: participant.summoner1Id,
        spell2Id: participant.summoner2Id,
        items: [
          participant.item0,
          participant.item1,
          participant.item2,
          participant.item3,
          participant.item4,
          participant.item5,
          participant.item6,
        ],
        totalDamage: participant.totalDamageDealtToChampions || 0,
        goldEarned: participant.goldEarned || 0,
        allies,
        enemies,
      };
    });

    // Save to cache
    try {
      localStorage.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          matches: parsedMatches,
        }),
      );
    } catch (e) {
      console.warn("Failed to cache match history:", e);
    }

    return { matches: parsedMatches, isMock: false };
  } catch (err) {
    console.error("Error fetching match history from Riot Match-V5:", err);
    // Real key + failure: report the error instead of passing off fake matches as real
    return { matches: [], isMock: false, error: err.message };
  }
};
