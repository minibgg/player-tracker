// Storage & Caching service for Riot players, keys, and tracking preferences
import { DEFAULT_ALERT_RULES } from "./alertRules";
import { DEFAULT_WEBHOOKS } from "./webhooks";
import { normalizeMotionPref } from "./motion";
import { normalizeHeroScene } from "../components/hero/scenes";

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
  ALERT_RULES: 'lol_tracker_alert_rules',
  WEBHOOKS: 'lol_tracker_webhooks',
  // Also read by the inline script in index.html before first paint
  MOTION: 'lol_tracker_motion',
  HERO_SCENE: 'lol_tracker_hero_scene',
  ACTIVE_GAME: 'lol_tracker_active_game',
  APEX_API_KEY: 'lol_tracker_apex_api_key',
  APEX_WATCHLIST: 'lol_tracker_apex_watchlist',
  APEX_LEGEND_ASSETS: 'lol_tracker_apex_legend_assets',
};

const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

// Reads a JSON object and fills in fields missing from older saves
const getStoredObject = (key, defaults) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    if (!isPlainObject(parsed)) return defaults;
    const merged = { ...defaults };
    for (const field of Object.keys(defaults)) {
      const value = parsed[field];
      if (value === undefined) continue;
      merged[field] = isPlainObject(defaults[field]) && isPlainObject(value)
        ? { ...defaults[field], ...value }
        : value;
    }
    return merged;
  } catch {
    return defaults;
  }
};

const setStoredObject = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Failed to save ${key} to localStorage:`, e);
  }
};

export const getStoredAlertRules = () =>
  getStoredObject(STORAGE_KEYS.ALERT_RULES, DEFAULT_ALERT_RULES);

export const setStoredAlertRules = (rules) =>
  setStoredObject(STORAGE_KEYS.ALERT_RULES, rules);

export const getStoredWebhooks = () =>
  getStoredObject(STORAGE_KEYS.WEBHOOKS, DEFAULT_WEBHOOKS);

export const setStoredWebhooks = (webhooks) =>
  setStoredObject(STORAGE_KEYS.WEBHOOKS, webhooks);

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

// Apex Legends tab: its own key and list, sharing every other setting
export const getStoredApexApiKey = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.APEX_API_KEY) || '';
  } catch {
    return '';
  }
};

export const setStoredApexApiKey = (key) => {
  localStorage.setItem(STORAGE_KEYS.APEX_API_KEY, key.trim());
};

export const getStoredApexWatchlist = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.APEX_WATCHLIST));
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Failed to parse Apex watchlist from localStorage:', e);
    return [];
  }
};

export const setStoredApexWatchlist = (watchlist) =>
  setStoredObject(STORAGE_KEYS.APEX_WATCHLIST, watchlist);

// Legend icons and banners seen in API responses, by legend key
export const getStoredLegendAssets = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.APEX_LEGEND_ASSETS));
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const setStoredLegendAssets = (assets) =>
  setStoredObject(STORAGE_KEYS.APEX_LEGEND_ASSETS, assets);

export const getStoredActiveGame = () => {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_GAME) === 'apex' ? 'apex' : 'lol';
  } catch {
    return 'lol';
  }
};

export const setStoredActiveGame = (game) => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_GAME, game);
  } catch (e) {
    console.error('Failed to save active game:', e);
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

export const getStoredMotionPref = () => {
  try {
    return normalizeMotionPref(localStorage.getItem(STORAGE_KEYS.MOTION));
  } catch {
    return 'auto';
  }
};

export const setStoredMotionPref = (pref) => {
  try {
    localStorage.setItem(STORAGE_KEYS.MOTION, pref);
  } catch (e) {
    console.error('Failed to save motion level:', e);
  }
};

export const getStoredHeroScene = () => {
  try {
    return normalizeHeroScene(localStorage.getItem(STORAGE_KEYS.HERO_SCENE));
  } catch {
    return normalizeHeroScene(null);
  }
};

export const setStoredHeroScene = (scene) => {
  try {
    localStorage.setItem(STORAGE_KEYS.HERO_SCENE, scene);
  } catch (e) {
    console.error('Failed to save hero background:', e);
  }
};
