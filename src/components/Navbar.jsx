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
}) => {
  const progressPercent = Math.max(
    0,
    Math.min(
      100,
      ((pollingInterval - secondsUntilNextCheck) / pollingInterval) * 100,
    ),
  );
  const filled = Math.round((progressPercent / 100) * BAR_CELLS);

  return (
    <header className="p-5 lg:p-6 space-y-6">
      {/* Wordmark */}
      <div>
        <div className="label flex items-center gap-2">
          <span
            className={`size-2 bg-accent ${isGlobalTracking ? "animate-pulse" : "opacity-40"}`}
          />
          LoL · live watch
        </div>
        <div className="font-display text-4xl mt-2 leading-none">Spectator</div>
      </div>

      {/* Poll clock */}
      <div>
        <div className="label">Следующая проверка</div>
        <div
          className="font-mono text-4xl tabular-nums mt-1.5"
          role="timer"
          aria-label="Время до следующей проверки"
        >
          {isRefreshingAll ? "··:··" : formatClock(secondsUntilNextCheck)}
        </div>
        <div
          className="font-mono text-xs text-accent-ink mt-2 select-none whitespace-nowrap overflow-hidden"
          aria-hidden="true"
        >
          [{"█".repeat(filled)}
          <span className="text-line-strong">
            {"░".repeat(BAR_CELLS - filled)}
          </span>
          ]
        </div>
        <div className="font-mono text-[11px] text-ink-2 mt-2">
          {isRefreshingAll
            ? "Опрос игроков…"
            : isGlobalTracking
              ? `Автоопрос каждые ${pollingInterval} с`
              : "Автоопрос на паузе"}
        </div>
      </div>

      {/* Controls */}
      <nav aria-label="Управление" className="grid gap-1.5">
        <CommandRow
          icon={RotateCw}
          label="Проверить всех"
          onClick={refreshAllPlayers}
          disabled={isRefreshingAll}
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
