import React from "react";
import {
  Play,
  Pause,
  RotateCw,
  Settings,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  ShieldAlert,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { CommandRow } from "./CommandRow";

const BAR_CELLS = 24;

const formatClock = (totalSeconds) => {
  const s = Math.max(0, totalSeconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

export const Navbar = ({
  gameLabel = "LoL",
  isGlobalTracking,
  toggleGlobalTracking,
  secondsUntilNextCheck,
  pollingInterval,
  isRefreshingAll,
  refreshAllPlayers,
  soundEnabled,
  toggleSound,
  chimeEnabled,
  toggleChime,
  openSettings,
  hasApiKey,
  idleReason,
  canCheckNow,
}) => {
  const isIdle = Boolean(idleReason);
  const progressPercent = Math.max(
    0,
    Math.min(
      100,
      ((pollingInterval - secondsUntilNextCheck) / pollingInterval) * 100,
    ),
  );
  const filled = isIdle ? 0 : Math.round((progressPercent / 100) * BAR_CELLS);
  const intervalLabel =
    pollingInterval < 60 ? `${pollingInterval} с` : `${pollingInterval / 60} мин`;

  return (
    <header className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Wordmark and poll clock: side by side on phones, stacked in the rail */}
      <div className="flex items-start justify-between gap-4 lg:block lg:space-y-6">
        <div>
          <div className="label flex items-center gap-2">
            <span
              className={`size-2 bg-accent ${isIdle ? "opacity-40" : "animate-pulse"}`}
            />
            {gameLabel} · live watch
          </div>
          <div className="font-display text-3xl lg:text-4xl mt-2 leading-none">
            Spectator
          </div>
        </div>

        {/* Poll clock */}
        <div className="text-right lg:text-left">
          <div className="label">Следующая проверка</div>
          <div
            className={`font-mono text-3xl lg:text-4xl tabular-nums mt-1.5 ${isIdle ? "text-ink-2" : "text-ink"}`}
            role="timer"
            aria-label="Время до следующей проверки"
          >
            {isIdle
              ? "--:--"
              : isRefreshingAll
                ? "··:··"
                : formatClock(secondsUntilNextCheck)}
          </div>
          <div
            className="hidden lg:block font-mono text-xs text-accent-ink mt-2 select-none whitespace-nowrap overflow-hidden"
            aria-hidden="true"
          >
            [{"█".repeat(filled)}
            <span className="text-line-strong">
              {"░".repeat(BAR_CELLS - filled)}
            </span>
            ]
          </div>
          {/* On phones only the idle reason is worth the space */}
          <div
            className={`${isIdle ? "block" : "hidden lg:block"} font-mono text-[11px] mt-1 lg:mt-2 ${isIdle ? "text-warn" : "text-ink-2"}`}
          >
            {isIdle
              ? idleReason
              : isRefreshingAll
                ? "опрос игроков…"
                : `автоопрос каждые ${intervalLabel}`}
          </div>
        </div>
      </div>

      {/* Controls */}
      <nav aria-label="Управление" className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
        <CommandRow
          icon={RotateCw}
          label="Проверить всех"
          onClick={refreshAllPlayers}
          disabled={isRefreshingAll || !canCheckNow}
          title="Проверить статус всех игроков сейчас"
        />
        <CommandRow
          icon={isGlobalTracking ? Pause : Play}
          label="Автоопрос"
          state={isGlobalTracking ? "вкл" : "пауза"}
          onClick={toggleGlobalTracking}
          title={
            isGlobalTracking
              ? "Приостановить автоматический опрос"
              : "Возобновить автоматический опрос"
          }
        />
        <CommandRow
          icon={chimeEnabled ? Bell : BellOff}
          label="Звонок"
          state={chimeEnabled ? "вкл" : "выкл"}
          onClick={toggleChime}
          title={
            chimeEnabled
              ? "Отключить тихий сигнал при старте матча любого игрока"
              : "Включить тихий сигнал при старте матча любого игрока"
          }
        />
        <CommandRow
          icon={soundEnabled ? Volume2 : VolumeX}
          label="Сирена"
          state={soundEnabled ? "вкл" : "выкл"}
          onClick={toggleSound}
          title={
            soundEnabled
              ? "Отключить звук при начале матча"
              : "Включить звук при начале матча"
          }
        />
        <ThemeToggle />
        <CommandRow
          icon={hasApiKey ? Settings : ShieldAlert}
          label="Настройки"
          state={hasApiKey ? "" : "нужен ключ"}
          tone={hasApiKey ? "default" : "warn"}
          onClick={openSettings}
        />
      </nav>
    </header>
  );
};
