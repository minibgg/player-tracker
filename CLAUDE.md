# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Vite dev server on http://localhost:5174 (strictPort)
npm test               # vitest run (all tests)
npx vitest run src/services/apexTracking.test.js   # one file
npx vitest run -t "parseRiotId"                    # tests matching a name
npm run lint           # oxlint (.oxlintrc.json: react + oxc plugins)
npm run build && npm run preview                   # production build, served on 5174
```

Windows background mode: `npm run tracker` builds, serves the build with `vite preview` on 5174 and opens a Chrome `--app` window; `npm run tracker:stop` stops it; `npm run autostart:on|off` adds/removes a Startup-folder shortcut. Logs go to `logs/` (gitignored). Port 5174 is strict, so `npm run dev` fails while the background tracker is running: stop it first.

## Architecture

A client-only React 19 + Vite SPA (plain JSX, no TypeScript) that polls game APIs and alerts when tracked players enter a match. It has two boards, League of Legends and Apex Legends, and both are polled whichever tab is open.

**No backend except the Vite proxy.** `vite.config.js` mounts `/api/riot-proxy?url=...` on both the dev and preview servers. It forwards only to `https://*.api.riotgames.com` (otherwise it would be an open proxy leaking the key) and rewrites a Spectator-V5 404 into `200 {notInGame: true}`. Because the proxy only exists inside Vite, the app is meant to be run with `vite preview`. Static hosting would need one of the public CORS proxies chosen in `riotApi.buildProxiedUrl`. The Apex API (`api.mozambiquehe.re`) allows CORS and is called directly, with the key in the `auth` query param on purpose: a header would force a preflight.

**Layers:**
- `src/services/`: API clients and pure logic. Almost all tests live here (and in `src/data/`), as co-located `*.test.js` running in vitest's default Node environment (no jsdom; `fetch` is stubbed with `vi.stubGlobal`). Hooks and components have no tests, so put logic that needs testing into a pure service function.
- `src/hooks/`: state. Each game has its own pair: `useWatchlist` + `usePlayerPolling` (League) and `useApexWatchlist` + `useApexPolling` (Apex). Both watchlists build on `usePlayerList` (persisting, pin/mute/pause/delete with undo, and `watchlistRef`).
- `src/App.jsx`: owns every setting as state (each paired with a `getStored*`/`setStored*` from `storage.js`), wires the hooks together, and holds the League board's filter/sort. The Apex board lives in `components/apex/`.

**Polling flow:**
- `usePollTicker` is the single clock for both games. It uses a Web Worker timer and a wall-clock deadline so polling keeps going in throttled background tabs, and it fires right away whenever it starts.
- Each tick calls each game's `refreshAllPlayers` → `checkPlayers`, which checks players one at a time with a 150 ms gap. `checkPlayerStatus` returns `"STOP"` on 401/403, 429 or a network error so the rest of the pass bails out. A rejected key pauses that game's auto-polling until settings are saved again.
- Async code reads the current list from `watchlistRef.current`, not from closures, because the player may have been deleted mid-request. `inFlightRef` skips a second concurrent check of the same player, which would otherwise announce the same transition twice. `onEvent`/`onAuthStatus` are held in refs so changing alert settings doesn't recreate the pollers.

**Events → alerts:** the pollers detect transitions and emit events: `GAME_START`, `GAME_END`, `MATCH_RESULT`, and for Apex also `ONLINE`. `services/alerts.js` (`announceTrackerEvent` / `announceApexEvent`) always shows a toast. The rest (siren for pinned players or a chime, desktop notification, Telegram/Discord webhooks) is gated by `alertRules.shouldAlert*` (queue/champion/legend filters, quiet hours, per-player mute).

**League match results are deferred.** Match-V5 publishes a game minutes after it ends. On `GAME_END` the poller stores `pendingResult` and retries every 60 s for up to 20 min. The LP change is computed against the ranks snapshot taken before the game, so ranks are deliberately not refreshed while a result is pending. Separately, every 30 min it asks for the latest match ID to catch games the polls never saw (these get no alert or LP change).

**Apex state machine:** `services/apexTracking.applyApexSnapshot` turns each `/bridge` snapshot into new player state plus events. The API is unreliable in ways the code works around:
- `currentStateSinceTimestamp` is sometimes just the request time, so it only counts once two polls agree.
- `isInGame` can stay set for hours after the player quits, so `currentState` wins.
- Matches between polls are detected from XP changes.
- Results after long gaps are logged as "unseen" and get no alert.

Read the comments in `apexTracking.js` / `apexMatch.js` before changing detection logic, and extend `apexTracking.test.js`.

**Persistence:**
- Everything lives in `localStorage` under `lol_tracker_*` keys (the Apex keys too) in `services/storage.js`.
- `getStoredObject` fills in fields missing from older saves from the `DEFAULT_*` objects, so a new setting field must be added to its default object.
- The inline script in `index.html` reads `lol_tracker_theme` and `lol_tracker_motion` before first paint, so keep those keys in sync if you rename them.
- `watchlistBackup.js` exports and imports both games' lists in one JSON file.
- Riot PUUIDs are cached per `region::name#tag` (`getCachedPlayer`).
- Champion names/icons come from Data Dragon (`ddragon.js`); a League pass waits for `initDataDragon()` so messages don't say "Champion #N".

**Styling:**
- Tailwind colors are semantic tokens (`canvas`, `surface`, `ink`, `line`, `accent`, `success`, …) backed by `--c-*` RGB-triple CSS variables in `src/index.css`. Use these, not raw colors, so light/dark themes (`data-theme` on `<html>`) keep working.
- Animation is gated by `data-motion` (`auto`/`full`/`calm`/`off`, see `services/motion.js`).

**PWA:** `public/sw.js` is registered only in production builds. It never caches `/api/` and uses network-first for pages.

## Conventions

- User-facing strings are Russian; code, comments and commit messages are English.
- Comments are short and explain why (API quirks, races, throttling), not what.
- Commit messages: a short imperative subject, then a bulleted body describing the behavior change and the reason.
- Small code tasks (1–3 files: boilerplate, comments, renames, formatting; not tests) go to the `antigravity` subagent without asking. Review its diff and run tests/lint before answering.
