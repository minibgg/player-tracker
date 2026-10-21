# League of Legends In-Game Spectator Tracker

A modern, real-time client-side single-page application built with **React 19**, **Vite**, and **Tailwind CSS** to track League of Legends players' in-game status, active champions, queue modes, and team compositions.

---

## ✨ Features

- **Real-Time Match Tracking**:
  - Live Spectator-V5 status detection.
  - Green pulsing orb + glow effect for active matches (`IN GAME`).
  - Data Dragon CDN integration for dynamic Champion icons, Profile icons, and Summoner Spells.
  - Live running match stopwatch (`MM:SS`) ticking every second based on `gameStartTime`.
  - Full 10-Player Team Composition Viewer (Blue vs Red teams with summoner spells, champion icons, and bans).
- **Rank & Match Results**:
  - Solo/Duo (or Flex) tier, division and LP on every player card via League-V4.
  - When a match ends, its result (win/loss, champion, K/D/A, duration) is fetched from Match-V5 and shown on the card, in a toast and in the status log.
  - For ranked games, the LP gained or lost (or a promotion/demotion) is included.
- **Riot Games Account-V1 & Spectator-V5 Flow**:
  - Handles `Name#TAG` parsing with automatic fallback to regional tags (e.g., `EUW`, `EUNE`, `RU1`, `NA1`, `KR1`).
  - Queries Account-V1 via regional routes (`europe`, `americas`, `asia`, `sea`).
  - Queries Spectator-V5 via platform routes (`euw1`, `eun1`, `na1`, `kr`, `ru`, etc.).
- **Client-Side CORS Architecture**:
  - Built-in **Vite Proxy Middleware** (`/api/riot-proxy?url=...`) in both `npm run dev` and `npm run preview`; the API key never leaves your machine.
  - Selectable public CORS proxies in Settings: `corsproxy.io`, `allorigins.win`, or custom proxy URLs (public proxies receive your API key).
  - Safe client-side storage of Riot Development API Keys in `localStorage`.
- **Configurable Polling Engine**:
  - Periodic polling intervals: 30s, 60s, 120s, or 300s.
  - Live visual countdown timer and progress indicator.
  - Non-disruptive manual **"Check Now"** buttons (individual and "Check All") that query spectator status immediately without breaking the scheduled timer.
  - Individual and global pause/resume tracking controls.
- **Desktop Notifications & Audio Alerts**:
  - Native browser `Notification` API triggers desktop popups when a player transitions to `IN GAME`.
  - Synthesized Web Audio API Hextech chime sound effect.
  - Alert rules: only selected queue types (Ranked / Normal / ARAM / Other), only selected champions, optional match-result alerts, quiet hours, and a per-player mute button.
  - Phone notifications through a Telegram bot or a Discord webhook (sent from the browser while the tracker is open).
- **Activity Stats**:
  - Time in game today and over 7 days, wins/losses, and a weekday × hour heatmap of when the player usually plays, built from the games the tracker has seen.
- **Animations (Settings → Анимации)**:
  - Four switchable ASCII hero backgrounds (landscape, rain, radar, ripples that also start from clicks) or none; a quick switch sits in the hero corner.
  - Motion levels: auto (follows the OS "reduce motion" setting), full, calm (soft fades only, still background) and off.
  - At the full level rows glide to their new place when the list re-sorts, a band of light crosses a row when the player starts a game, match results slide in, counters roll and modals rise into view.
- **Backup & Install**:
  - Export the watchlist (pins, log, stats) to a JSON file and import it on another machine.
  - Installable as an app (PWA) from the production build (`npm run build && npm run preview`).
- **Apex Legends Tab**:
  - A second tab next to League with its own watchlist and API key; both games are polled on the same clock whichever tab is open, and each tab shows how many of its players are in a match.
  - Online / in lobby / in match status, the selected legend and a live match stopwatch via the [Apex Legends Status API](https://apexlegendsapi.com/) (EA has no public API).
  - Rank and RP on every card. After a match: RP gained or lost (ranked), plus kills, damage and a win when the player shows those trackers on the legend's banner.
  - Match history built by the tracker: RP per match, totals for today / 7 days, an RP chart for the season, and "unseen" entries for RP that moved while the tracker was closed.
  - Progress to the next division (or to Apex Predator from Master, using the live Predator cut) and a leaderboard of the tracked players by RP gained.
  - Optional "came online" alert and a legend filter in the alert rules; current Battle Royale and ranked maps with a countdown.
  - PC players are found by their EA account name (Steam players too), PlayStation / Xbox by PSN ID / Gamertag, anyone (including Switch) by UID or by a profile link from apexlegendsstatus.com.
- **Status Change History**:
  - Expandable event log tracking when matches were entered, champion played, queue type, and match conclusions.

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:5174/](http://localhost:5174/) in your web browser.

### Start with Windows (no terminal)

```bash
npm run autostart:on    # once: start the tracker at every sign-in
npm run autostart:off   # undo
```

At sign-in a hidden PowerShell builds the app, serves it on [http://localhost:5174/](http://localhost:5174/) (`vite preview`, Riot proxy included) and opens it in its own Chrome app window (or the default browser). The polling runs in that window, so keep it open; minimized is fine. Logs go to `logs/tracker.log`.

- `npm run tracker` starts the same thing by hand.
- `npm run tracker:stop` stops the background server, e.g. to free port 5174 for `npm run dev`.
- In a normal Chrome tab, add `localhost:5174` to *Settings → Performance → Always keep these sites active*, or Memory Saver may put the tab to sleep.

### 3. Run the Tests

```bash
npm test
```

### 4. Build for Production

```bash
npm run build
npm run preview
```

---

## 🔑 How to Set Up Your Riot API Key

1. Visit the [Riot Developer Portal](https://developer.riotgames.com/).
2. Log in with your Riot account and accept terms.
3. Copy your personal **Development API Key** (e.g. `RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
4. Click **Settings** in the top navigation bar of the tracker and paste your key.
5. Click **Test API Connection** to verify your setup, then click **Save Changes**.

> ⚠️ **Note**: Riot Development API Keys expire every 24 hours. The app will notify you with a clear toast if your key has expired so you can quickly renew it.

---

## 🎯 How to Set Up Your Apex Legends API Key

1. Visit [portal.apexlegendsapi.com](https://portal.apexlegendsapi.com/) and click **Create an API key**.
2. Paste the key in **Settings → Apex Legends API ключ** and click **проверить ключ**.
3. Switch to the **Apex** tab and add a player.

> The Apex API allows cross-origin requests, so it is called straight from the browser without a proxy. A new key may make 5 requests per second; the tracker sends one request per player per poll.

---

## 🌐 Supported Regions & Regional Routing

| Region Code           | Name                   | Regional Route | Platform Host                       |
| --------------------- | ---------------------- | -------------- | ----------------------------------- |
| `EUW1`                | Europe West            | `europe`       | `euw1.api.riotgames.com`            |
| `EUN1`                | Europe Nordic & East   | `europe`       | `eun1.api.riotgames.com`            |
| `RU`                  | Russia                 | `europe`       | `ru.api.riotgames.com`              |
| `NA1`                 | North America          | `americas`     | `na1.api.riotgames.com`             |
| `KR`                  | Korea                  | `asia`         | `kr.api.riotgames.com`              |
| `TR1`                 | Turkey                 | `europe`       | `tr1.api.riotgames.com`             |
| `BR1`                 | Brazil                 | `americas`     | `br1.api.riotgames.com`             |
| `LA1` / `LA2`         | Latin America          | `americas`     | `la1`/`la2.api.riotgames.com`       |
| `OC1`                 | Oceania                | `sea`          | `oc1.api.riotgames.com`             |
| `JP1`                 | Japan                  | `asia`         | `jp1.api.riotgames.com`             |
| `SG2` / `TW2` / `VN2` | SEA / Taiwan / Vietnam | `sea`          | `sg2`/`tw2`/`vn2.api.riotgames.com` |
