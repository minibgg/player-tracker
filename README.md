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
- **Riot Games Account-V1 & Spectator-V5 Flow**:
  - Handles `Name#TAG` parsing with automatic fallback to regional tags (e.g., `EUW`, `EUNE`, `RU1`, `NA1`, `KR1`).
  - Queries Account-V1 via regional routes (`europe`, `americas`, `asia`, `sea`).
  - Queries Spectator-V5 via platform routes (`euw1`, `eun1`, `na1`, `kr`, `ru`, etc.).
- **Client-Side CORS Architecture**:
  - Built-in **Vite Dev Server Proxy Middleware** (`/api/riot-proxy?url=...`) for zero rate-limiting during local development.
  - Selectable public CORS proxies in Settings: `corsproxy.io`, `allorigins.win`, or custom proxy URLs.
  - Safe client-side storage of Riot Development API Keys in `localStorage`.
- **Configurable Polling Engine**:
  - Periodic polling intervals: 30s, 60s, 120s, or 300s.
  - Live visual countdown timer and progress indicator.
  - Non-disruptive manual **"Check Now"** buttons (individual and "Check All") that query spectator status immediately without breaking the scheduled timer.
  - Individual and global pause/resume tracking controls.
- **Desktop Notifications & Audio Alerts**:
  - Native browser `Notification` API triggers desktop popups when a player transitions to `IN GAME`.
  - Synthesized Web Audio API Hextech chime sound effect.
- **Status Change History**:
  - Expandable event log tracking when matches were entered, champion played, queue type, and match conclusions.
- **Built-in Demo Simulation Mode**:
  - Instant toggle to preview active matches, notifications, timers, and team viewer without requiring an active Riot API key right away.

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

Open [http://localhost:5173/](http://localhost:5173/) in your web browser.

### 3. Build for Production

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
