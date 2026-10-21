// Data Dragon Service: dynamic caching and asset URLs for League of Legends

let currentVersion = "14.24.1";
let championKeyToData = {};
let isInitialized = false;

// Fallback lookup table for popular champions
const FALLBACK_CHAMPIONS = {
  1: { id: "Annie", name: "Annie" },
  2: { id: "Olaf", name: "Olaf" },
  3: { id: "Galio", name: "Galio" },
  4: { id: "TwistedFate", name: "Twisted Fate" },
  5: { id: "XinZhao", name: "Xin Zhao" },
  6: { id: "Urgot", name: "Urgot" },
  7: { id: "Leblanc", name: "LeBlanc" },
  8: { id: "Vladimir", name: "Vladimir" },
  9: { id: "Fiddlesticks", name: "Fiddlesticks" },
  10: { id: "Kayle", name: "Kayle" },
  11: { id: "MasterYi", name: "Master Yi" },
  12: { id: "Alistar", name: "Alistar" },
  13: { id: "Ryze", name: "Ryze" },
  14: { id: "Sion", name: "Sion" },
  15: { id: "Sivir", name: "Sivir" },
  16: { id: "Soraka", name: "Soraka" },
  17: { id: "Teemo", name: "Teemo" },
  18: { id: "Tristana", name: "Tristana" },
  19: { id: "Warwick", name: "Warwick" },
  20: { id: "Nunu", name: "Nunu & Willump" },
  21: { id: "MissFortune", name: "Miss Fortune" },
  22: { id: "Ashe", name: "Ashe" },
  23: { id: "Tryndamere", name: "Tryndamere" },
  24: { id: "Jax", name: "Jax" },
  25: { id: "Morgana", name: "Morgana" },
  26: { id: "Zilean", name: "Zilean" },
  27: { id: "Singed", name: "Singed" },
  28: { id: "Evelynn", name: "Evelynn" },
  29: { id: "Twitch", name: "Twitch" },
  51: { id: "Caitlyn", name: "Caitlyn" },
  64: { id: "LeeSin", name: "Lee Sin" },
  67: { id: "Vayne", name: "Vayne" },
  81: { id: "Ezreal", name: "Ezreal" },
  84: { id: "Akali", name: "Akali" },
  99: { id: "Lux", name: "Lux" },
  103: { id: "Ahri", name: "Ahri" },
  157: { id: "Yasuo", name: "Yasuo" },
  222: { id: "Jinx", name: "Jinx" },
  238: { id: "Zed", name: "Zed" },
  268: { id: "Azir", name: "Azir" },
  350: { id: "Yuumi", name: "Yuumi" },
  412: { id: "Thresh", name: "Thresh" },
  517: { id: "Sylas", name: "Sylas" },
  777: { id: "Yone", name: "Yone" },
  888: { id: "Renata", name: "Renata Glasc" },
  897: { id: "KSante", name: "K'Sante" },
  902: { id: "Milio", name: "Milio" },
  910: { id: "Hwei", name: "Hwei" },
  901: { id: "Smolder", name: "Smolder" },
  233: { id: "Briar", name: "Briar" },
  893: { id: "Aurora", name: "Aurora" },
  799: { id: "Ambessa", name: "Ambessa" },
};

export const initDataDragon = async () => {
  if (isInitialized) return currentVersion;
  try {
    // 1. Fetch latest version
    const versionRes = await fetch(
      "https://ddragon.leagueoflegends.com/api/versions.json",
    );
    if (versionRes.ok) {
      const versions = await versionRes.json();
      if (Array.isArray(versions) && versions.length > 0) {
        currentVersion = versions[0];
      }
    }
  } catch {
    console.warn("Using default Data Dragon version:", currentVersion);
  }

  try {
    // 2. Fetch all champions for current version
    const champRes = await fetch(
      `https://ddragon.leagueoflegends.com/cdn/${currentVersion}/data/en_US/champion.json`,
    );
    if (champRes.ok) {
      const champData = await champRes.json();
      if (champData && champData.data) {
        Object.values(champData.data).forEach((c) => {
          championKeyToData[c.key] = {
            id: c.id,
            name: c.name,
            title: c.title,
            key: c.key,
            tags: c.tags,
          };
        });
        isInitialized = true;
      }
    }
  } catch (e) {
    console.warn(
      "Failed to load dynamic champions from Data Dragon, falling back to local table:",
      e,
    );
  }

  return currentVersion;
};

export const getDDragonVersion = () => currentVersion;

export const getChampionByKey = (championKey) => {
  const keyStr = String(championKey);
  if (championKeyToData[keyStr]) {
    return championKeyToData[keyStr];
  }
  if (FALLBACK_CHAMPIONS[championKey]) {
    return FALLBACK_CHAMPIONS[championKey];
  }
  return {
    id: "Unknown",
    name: `Champion #${championKey}`,
    key: keyStr,
  };
};

export const getChampionIconUrl = (championKey) => {
  const champ = getChampionByKey(championKey);
  if (champ && champ.id && champ.id !== "Unknown") {
    return `https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/champion/${champ.id}.png`;
  }
  // Generic fallback placeholder icon
  return `https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/profileicon/29.png`;
};

export const getChampionSplashUrl = (championKey) => {
  const champ = getChampionByKey(championKey);
  if (champ && champ.id && champ.id !== "Unknown") {
    return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champ.id}_0.jpg`;
  }
  return null;
};

export const getProfileIconUrl = (profileIconId) => {
  const iconId = profileIconId || 29;
  return `https://ddragon.leagueoflegends.com/cdn/${currentVersion}/img/profileicon/${iconId}.png`;
};
