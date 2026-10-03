import React, { useState } from "react";
import {
  X,
  Key,
  Globe,
  Clock,
  Bell,
  Volume2,
  VolumeX,
  ExternalLink,
  Check,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendDesktopNotification,
  playMatchAlertSound,
  playGameStartChime,
  stopMatchAlertSound,
} from "../services/notifications";
import { testRiotApiKey } from "../services/riotApi";

// Hooks live in the inner component so they are never called conditionally;
// it remounts on every open, so the draft state re-initialises from props
export const SettingsModal = (props) => {
  if (!props.isOpen) return null;
  return <SettingsModalContent {...props} />;
};

const SettingsModalContent = ({
  onClose,
  apiKey,
  setApiKey,
  proxyType,
  setProxyType,
  customProxy,
  setCustomProxy,
  pollingInterval,
  setPollingInterval,
  notificationsEnabled,
  setNotificationsEnabled,
  soundEnabled,
  setSoundEnabled,
  chimeEnabled,
  onSave,
  onResetWatchlist,
}) => {
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempProxyType, setTempProxyType] = useState(proxyType);
  const [tempCustomProxy, setTempCustomProxy] = useState(customProxy);
  const [tempInterval, setTempInterval] = useState(pollingInterval);
  const [tempNotifications, setTempNotifications] =
    useState(notificationsEnabled);
  const [tempSound, setTempSound] = useState(soundEnabled);
  const [tempChime, setTempChime] = useState(chimeEnabled);

  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [notificationPerm, setNotificationPerm] = useState(
    getNotificationPermission(),
  );

  const handleSave = () => {
    onSave({
      apiKey: tempApiKey.trim(),
      proxyType: tempProxyType,
      customProxy: tempCustomProxy.trim(),
      pollingInterval: tempInterval,
      notificationsEnabled: tempNotifications,
      soundEnabled: tempSound,
      chimeEnabled: tempChime,
    });
    onClose();
  };

  const handleTestNotification = async () => {
    let perm = getNotificationPermission();
    if (perm !== "granted") {
      perm = await requestNotificationPermission();
      setNotificationPerm(perm);
    }
    if (perm === "granted") {
      sendDesktopNotification(
        "League Spectator Tracker",
        {
          body: "Системные уведомления включены! При обнаружении матча прозвучит громкая сирена.",
        },
        true,
      );
      setIsPlayingSound(true);
      setTimeout(() => {
        setIsPlayingSound(false);
      }, 4000);
    } else {
      alert(
        "Разрешение на системные уведомления не было предоставлено браузером.",
      );
    }
  };

  const [isPlayingSound, setIsPlayingSound] = useState(false);

  const handleTestSound = async () => {
    if (isPlayingSound) {
      stopMatchAlertSound();
      setIsPlayingSound(false);
      return;
    }

    setIsPlayingSound(true);
    await playMatchAlertSound();
    setTimeout(() => {
      setIsPlayingSound(false);
    }, 4000);
  };

  const handleTestConnection = async () => {
    setIsTestingKey(true);
    setTestResult(null);

    const result = await testRiotApiKey({
      apiKey: tempApiKey.trim(),
      proxyType: tempProxyType,
      customProxy: tempCustomProxy.trim(),
    });

    setIsTestingKey(false);
    setTestResult(result);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-scrim/70" onClick={onClose}>
      <div
        className="w-full max-w-xl h-full flex flex-col bg-surface border-l border-line-strong overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-surface border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-surface-3 border border-line-strong text-accent-ink">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-medium text-ink">
                API & APPLICATION SETTINGS
              </h2>
              <p className="text-xs text-ink-2">
                Configure your Riot API Key, CORS Proxy, and Tracking
                preferences
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-ink-2 hover:text-ink border border-line transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 text-xs text-ink">
          {/* Riot API Key Section */}
          <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-sm text-ink flex items-center gap-2">
                <Key className="w-4 h-4 text-accent-ink" />
                Riot Development API Key
              </label>
              <a
                href="https://developer.riotgames.com/"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-accent-ink hover:text-accent-ink flex items-center gap-1 font-medium transition-colors"
              >
                <span>Get API Key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-ink-2 leading-relaxed text-[11px]">
              Login to the Riot Developer Portal, copy your personal Development
              API Key (format:{" "}
              <code className="text-warn">
                RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
              </code>
              ), and paste it below. Keys are stored locally in your browser’s{" "}
              <code className="text-ink">localStorage</code>.
            </p>

            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={tempApiKey}
                onChange={(e) => {
                  setTempApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full h-10 px-3 pr-10 rounded-lg bg-canvas border border-line focus:border-accent font-mono text-xs text-ink focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-2.5 text-ink-2 hover:text-ink"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Test Connection Button */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={!tempApiKey || isTestingKey}
                className="px-3 py-1.5 rounded-lg bg-surface-3 hover:bg-surface-3 text-info border border-info/40 flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {isTestingKey ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying key...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Test API Connection</span>
                  </>
                )}
              </button>

              {testResult && (
                <div
                  className={`flex items-center gap-1 text-xs font-semibold ${
                    testResult.success ? "text-success" : "text-danger"
                  }`}
                >
                  {testResult.success ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Key Verified & Active!</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      <span>{testResult.error || "Verification failed"}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="text-[11px] text-warn bg-warn/10 p-2.5 rounded-lg border border-warn/40">
              💡 <strong>Note:</strong> Riot Development API Keys expire every
              24 hours. If requests start failing with 401 or 403, regenerate
              your key on the portal.
            </div>
          </div>

          {/* CORS Proxy Strategy */}
          <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
            <label className="font-semibold text-sm text-ink flex items-center gap-2">
              <Globe className="w-4 h-4 text-info" />
              CORS Proxy Strategy
            </label>
            <p className="text-ink-2 text-[11px]">
              Because Riot Games API does not allow browser-direct CORS calls,
              requests are routed through a CORS proxy.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  tempProxyType === "vite"
                    ? "bg-surface-3 border-info text-ink"
                    : "bg-canvas border-line text-ink-2"
                }`}
              >
                <input
                  type="radio"
                  name="proxyType"
                  value="vite"
                  checked={tempProxyType === "vite"}
                  onChange={() => setTempProxyType("vite")}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-xs text-info">
                    Vite Dev Proxy (Recommended)
                  </div>
                  <div className="text-[10px] text-ink-2">
                    Zero rate limits, runs through Vite dev server
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  tempProxyType === "corsproxy"
                    ? "bg-surface-3 border-info text-ink"
                    : "bg-canvas border-line text-ink-2"
                }`}
              >
                <input
                  type="radio"
                  name="proxyType"
                  value="corsproxy"
                  checked={tempProxyType === "corsproxy"}
                  onChange={() => setTempProxyType("corsproxy")}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-xs">corsproxy.io</div>
                  <div className="text-[10px] text-ink-2">
                    Public proxy (no backend setup required)
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  tempProxyType === "allorigins"
                    ? "bg-surface-3 border-info text-ink"
                    : "bg-canvas border-line text-ink-2"
                }`}
              >
                <input
                  type="radio"
                  name="proxyType"
                  value="allorigins"
                  checked={tempProxyType === "allorigins"}
                  onChange={() => setTempProxyType("allorigins")}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-xs">allorigins.win</div>
                  <div className="text-[10px] text-ink-2">
                    Alternative public CORS proxy
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  tempProxyType === "custom"
                    ? "bg-surface-3 border-info text-ink"
                    : "bg-canvas border-line text-ink-2"
                }`}
              >
                <input
                  type="radio"
                  name="proxyType"
                  value="custom"
                  checked={tempProxyType === "custom"}
                  onChange={() => setTempProxyType("custom")}
                  className="mt-0.5"
                />
                <div>
                  <div className="font-bold text-xs">Custom CORS Proxy</div>
                  <div className="text-[10px] text-ink-2">
                    Specify your self-hosted proxy URL
                  </div>
                </div>
              </label>
            </div>

            {tempProxyType === "custom" && (
              <div className="mt-2">
                <input
                  type="text"
                  value={tempCustomProxy}
                  onChange={(e) => setTempCustomProxy(e.target.value)}
                  placeholder="https://my-proxy.com/?url="
                  className="w-full h-9 px-3 rounded-lg bg-canvas border border-line focus:border-accent font-mono text-xs text-ink focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Polling Interval */}
          <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
            <label className="font-semibold text-sm text-ink flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-ink" />
              Automatic Polling Interval
            </label>
            <p className="text-ink-2 text-[11px]">
              How frequently the application checks the Spectator API for active
              games.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { seconds: 30, label: "30 Seconds (Fast)" },
                { seconds: 60, label: "60 Seconds (Default)" },
                { seconds: 120, label: "120 Seconds (Relaxed)" },
                { seconds: 300, label: "5 Minutes (Light)" },
              ].map((item) => (
                <button
                  key={item.seconds}
                  type="button"
                  onClick={() => setTempInterval(item.seconds)}
                  className={`p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    tempInterval === item.seconds
                      ? "bg-accent text-accent-fg border-accent shadow-sm"
                      : "bg-canvas border-line text-ink-2 hover:text-ink hover:border-line-strong"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Notifications & Audio Alerts */}
          <div className="p-4 rounded-xl bg-surface border border-line space-y-4">
            <div className="font-semibold text-sm text-ink flex items-center gap-2">
              <Bell className="w-4 h-4 text-success" />
              Notifications & Sound Alerts
            </div>

            {/* Desktop Notification Switch */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-ink">
                  Системные уведомления (Desktop)
                </div>
                <div className="text-[11px] text-ink-2">
                  Всплывающее окно на рабочем столе со звуком сирены при старте
                  матча
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="px-2.5 py-1 rounded bg-surface-2 hover:bg-surface-3 text-[11px] text-info border border-line"
                >
                  Тест уведомления
                </button>
                <input
                  type="checkbox"
                  checked={tempNotifications}
                  onChange={(e) => setTempNotifications(e.target.checked)}
                  className="w-4 h-4 rounded text-success cursor-pointer"
                />
              </div>
            </div>

            {/* Soft chime for any player */}
            <div className="flex items-center justify-between pt-2 border-t border-line/60">
              <div>
                <div className="font-medium text-ink">Тихий звонок</div>
                <div className="text-[11px] text-ink-2">
                  Короткий сигнал, когда любой из игроков начал матч (для
                  закреплённых вместо него звучит сирена)
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={playGameStartChime}
                  className="px-2.5 py-1 rounded bg-surface-2 hover:bg-surface-3 text-[11px] text-info border border-line"
                >
                  Тест звонка
                </button>
                <input
                  type="checkbox"
                  checked={tempChime}
                  onChange={(e) => setTempChime(e.target.checked)}
                  aria-label="Тихий звонок"
                  className="w-4 h-4 rounded text-success cursor-pointer"
                />
              </div>
            </div>

            {/* Audio Alert Switch */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-line/60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-ink flex items-center gap-2">
                    <span>Звук громкой сирены</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-warn/15 text-warn border border-warn/30">
                      Только для 📌
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-2">
                    Воспроизводить сирену только при старте матча у закреплённых
                    (📌) игроков
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestSound}
                    className={`px-2.5 py-1 rounded text-[11px] border flex items-center gap-1.5 transition-colors ${
                      isPlayingSound
                        ? "bg-danger/15 text-danger border-danger/40 hover:bg-danger/15"
                        : "bg-surface-2 hover:bg-surface-3 text-info border-line"
                    }`}
                  >
                    {isPlayingSound ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5 text-danger animate-pulse" />
                        <span>Остановить</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Тест сирены</span>
                      </>
                    )}
                  </button>
                  <input
                    type="checkbox"
                    checked={tempSound}
                    onChange={(e) => setTempSound(e.target.checked)}
                    className="w-4 h-4 rounded text-success cursor-pointer"
                  />
                </div>
              </div>

              <div className="text-[11px] text-info bg-info/10 p-2.5 rounded-lg border border-info/40 flex items-start gap-2">
                <span className="shrink-0 text-info">📌</span>
                <div className="space-y-0.5">
                  <div className="font-semibold text-info">
                    Сирена звучит только для закреплённых игроков:
                  </div>
                  <div>
                    Закрепите нужного игрока булавкой (кнопка 📌 на его
                    карточке), чтобы слышать сирену при старте его матча. Свой
                    файл можно положить в{" "}
                    <code className="bg-canvas text-warn px-1.5 py-0.5 rounded font-mono text-[11px] border border-info/30">
                      public/siren.mp3
                    </code>{" "}
                    (или{" "}
                    <code className="bg-canvas text-warn px-1.5 py-0.5 rounded font-mono text-[11px] border border-info/30">
                      public/siren.wav
                    </code>
                    ).
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 bg-canvas border-t border-line flex items-center justify-between">
          <button
            type="button"
            onClick={onResetWatchlist}
            className="text-xs text-danger hover:text-danger underline"
          >
            Clear All Watchlist
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-ink-2 hover:text-ink border border-line transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-lg btn-primary text-xs font-bold uppercase tracking-wider transition-transform"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
