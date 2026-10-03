// Storage & Caching service for Riot players, keys, and tracking preferences

const STORAGE_KEYS = {
  API_KEY: 'lol_tracker_api_key',
  PROXY_TYPE: 'lol_tracker_proxy_type',
  CUSTOM_PROXY: 'lol_tracker_custom_proxy',
  POLLING_INTERVAL: 'lol_tracker_polling_interval',
  SOUND_ENABLED: 'lol_tracker_sound_enabled',
  CHIME_ENABLED: 'lol_tracker_chime_enabled',
  NOTIFICATIONS_ENABLED: 'lol_tracker_notifications_enabled',
  WATCHLIST: 'lol_tracker_watchlist',
  PLAYER_CACHE: 'lol_tracker_player_cache',
  DEMO_MODE: 'lol_tracker_demo_mode',
};

export const getStoredApiKey = () => {
  return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
};

export const setStoredApiKey = (key) => {
  localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
};

export const getStoredProxyType = () => {
  return localStorage.getItem(STORAGE_KEYS.PROXY_TYPE) || 'vite';
};

export const setStoredProxyType = (type) => {
  localStorage.setItem(STORAGE_KEYS.PROXY_TYPE, type);
};

export const getStoredCustomProxy = () => {
  return localStorage.getItem(STORAGE_KEYS.CUSTOM_PROXY) || 'https://corsproxy.io/?url=';
};

export const setStoredCustomProxy = (url) => {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_PROXY, url.trim());
};

export const getStoredPollingInterval = () => {
  const val = parseInt(localStorage.getItem(STORAGE_KEYS.POLLING_INTERVAL), 10);
  return [30, 60, 120, 300].includes(val) ? val : 60;
};

export const setStoredPollingInterval = (seconds) => {
  localStorage.setItem(STORAGE_KEYS.POLLING_INTERVAL, String(seconds));
};

export const getStoredSoundEnabled = () => {
  const val = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
  return val !== null ? val === 'true' : true;
};

export const setStoredSoundEnabled = (enabled) => {
  localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(enabled));
};

export const getStoredChimeEnabled = () => {
  const val = localStorage.getItem(STORAGE_KEYS.CHIME_ENABLED);
  return val !== null ? val === 'true' : true;
};

export const setStoredChimeEnabled = (enabled) => {
  localStorage.setItem(STORAGE_KEYS.CHIME_ENABLED, String(enabled));
};

export const getStoredNotificationsEnabled = () => {
  const val = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED);
  return val !== null ? val === 'true' : true;
};

export const setStoredNotificationsEnabled = (enabled) => {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_ENABLED, String(enabled));
};

export const getStoredWatchlist = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WATCHLIST);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse watchlist from localStorage:', e);
    return [];
  }
};

export const setStoredWatchlist = (watchlist) => {
  try {
    localStorage.setItem(STORAGE_KEYS.WATCHLIST, JSON.stringify(watchlist));
  } catch (e) {
    console.error('Failed to save watchlist to localStorage:', e);
  }
};

const getCacheKey = (region, gameName, tagLine) => {
  return `${(region || '').toLowerCase()}::${(gameName || '').toLowerCase()}#${(tagLine || '').toLowerCase()}`;
};

export const getCachedPlayer = (region, gameName, tagLine) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_CACHE);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    const key = getCacheKey(region, gameName, tagLine);
    return cache[key] || null;
  } catch {
    return null;
  }
};

export const setCachedPlayer = (region, gameName, tagLine, data) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_CACHE);
    const cache = raw ? JSON.parse(raw) : {};
    const key = getCacheKey(region, gameName, tagLine);
    cache[key] = {
      ...data,
      cachedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.PLAYER_CACHE, JSON.stringify(cache));
  } catch (e) {
    console.error('Failed to update player cache:', e);
  }
};

export const getAllCachedPlayers = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PLAYER_CACHE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const clearPlayerCache = () => {
  localStorage.removeItem(STORAGE_KEYS.PLAYER_CACHE);
};

export const getStoredDemoMode = () => {
  return localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';
};

export const setStoredDemoMode = (enabled) => {
  localStorage.setItem(STORAGE_KEYS.DEMO_MODE, String(enabled));
};
