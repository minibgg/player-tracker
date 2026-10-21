import React, { useState, useRef, useEffect } from "react";
import {
  X,
  ExternalLink,
  Check,
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  Volume2,
  VolumeX,
  Bell,
  Send,
  Search,
  Download,
  Upload,
} from "lucide-react";
import {
  QUEUE_CATEGORIES,
  parseChampionList,
} from "../services/alertRules";
import {
  sendWebhookAlerts,
  findTelegramChat,
  isDiscordWebhookUrl,
} from "../services/webhooks";
import {
  getNotificationPermission,
  requestNotificationPermission,
  sendDesktopNotification,
  playMatchAlertSound,
  playGameStartChime,
  stopMatchAlertSound,
} from "../services/notifications";
import { testRiotApiKey } from "../services/riotApi";
import { testApexApiKey } from "../services/apexApi";
import {
  MOTION_LEVELS,
  resolveMotion,
  systemReducesMotion,
} from "../services/motion";
import { HERO_SCENES } from "./hero/scenes";
import { AsciiCanvas } from "./hero/AsciiCanvas";

const PROXIES = [
  {
    id: "vite",
    name: "Локальный прокси",
    note: "ключ не покидает компьютер",
  },
  { id: "corsproxy", name: "corsproxy.io", note: "публичный прокси" },
  { id: "allorigins", name: "allorigins.win", note: "публичный прокси" },
  { id: "custom", name: "Свой прокси", note: "URL вашего сервера" },
];

const INTERVALS = [
  { seconds: 30, label: "30 с" },
  { seconds: 60, label: "1 мин" },
  { seconds: 120, label: "2 мин" },
  { seconds: 300, label: "5 мин" },
];

const inputClass =
  "w-full h-10 px-3 bg-canvas border border-line-strong font-mono text-xs text-ink placeholder-ink-2 rounded-none focus:border-accent";

const smallButtonClass =
  "inline-flex items-center justify-center gap-1.5 h-8 px-3 border border-line-strong font-mono text-[11px] text-ink hover:border-accent hover:text-accent-ink transition-colors disabled:opacity-50 disabled:pointer-events-none shrink-0";

// Numbered block of the settings sheet
const Section = ({ index, title, description, action, children }) => (
  <section className="px-5 sm:px-6 py-6 border-b border-line space-y-4">
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="flex items-baseline gap-3">
          <span className="font-mono text-xs text-accent-ink">{index}</span>
          <span className="font-display text-lg text-ink">{title}</span>
        </h3>
        {action}
      </div>
      {description && (
        <p className="text-xs text-ink-2 mt-1.5 leading-relaxed">
          {description}
        </p>
      )}
    </div>
    {children}
  </section>
);

const Switch = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 items-center border transition-colors ${
      checked ? "bg-accent border-accent" : "bg-surface-3 border-line-strong"
    }`}
  >
    <span
      className={`absolute size-3.5 transition-transform ${
        checked ? "translate-x-[18px] bg-accent-fg" : "translate-x-[2px] bg-ink-2"
      }`}
    />
  </button>
);

// Title + hint on the left, controls on the right
const SettingRow = ({ title, description, children }) => (
  <div className="flex items-center justify-between gap-4">
    <div className="min-w-0">
      <div className="text-sm text-ink">{title}</div>
      {description && (
        <div className="text-xs text-ink-2 mt-0.5">{description}</div>
      )}
    </div>
    <div className="flex items-center gap-2 shrink-0">{children}</div>
  </div>
);

const StatusLine = ({ status }) =>
  status ? (
    <div
      role="status"
      className={`flex items-start gap-1.5 font-mono text-[11px] ${
        status.ok ? "text-success" : "text-danger"
      }`}
    >
      {status.ok ? (
        <Check className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      )}
      <span>{status.text}</span>
    </div>
  ) : null;

// Hooks live in the inner component so they are never called conditionally;
// it remounts on every open, so the draft state re-initialises from props
export const SettingsModal = (props) => {
  if (!props.isOpen) return null;
  return <SettingsModalContent {...props} />;
};

const SettingsModalContent = ({
  onClose,
  apiKey,
  apexApiKey,
  proxyType,
  customProxy,
  pollingInterval,
  notificationsEnabled,
  soundEnabled,
  chimeEnabled,
  alertRules,
  webhooks,
  motionPref,
  motionLevel,
  heroScene,
  onSave,
  onResetWatchlist,
  onExportWatchlist,
  onImportWatchlist,
  activeGameName,
  watchlistSize,
  backupSize,
}) => {
  const [tempApiKey, setTempApiKey] = useState(apiKey);
  const [tempApexKey, setTempApexKey] = useState(apexApiKey);
  const [showApexKey, setShowApexKey] = useState(false);
  const [isTestingApexKey, setIsTestingApexKey] = useState(false);
  const [apexTestResult, setApexTestResult] = useState(null);
  const [tempProxyType, setTempProxyType] = useState(proxyType);
  const [tempCustomProxy, setTempCustomProxy] = useState(customProxy);
  const [tempInterval, setTempInterval] = useState(pollingInterval);
  const [tempNotifications, setTempNotifications] =
    useState(notificationsEnabled);
  const [tempSound, setTempSound] = useState(soundEnabled);
  const [tempChime, setTempChime] = useState(chimeEnabled);
  const [tempRules, setTempRules] = useState(alertRules);
  const [tempChampions, setTempChampions] = useState(
    alertRules.champions.join(", "),
  );
  const [tempLegends, setTempLegends] = useState(
    alertRules.apexLegends.join(", "),
  );
  const [tempWebhooks, setTempWebhooks] = useState(webhooks);
  const [tempMotion, setTempMotion] = useState(motionPref);
  const [tempScene, setTempScene] = useState(heroScene);
  const [webhookStatus, setWebhookStatus] = useState(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isFindingChat, setIsFindingChat] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState(null);
  const importInputRef = useRef(null);

  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  // Escape closes the sheet without saving
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSave = () => {
    onSave({
      apiKey: tempApiKey.trim(),
      apexApiKey: tempApexKey.trim(),
      proxyType: tempProxyType,
      customProxy: tempCustomProxy.trim(),
      pollingInterval: tempInterval,
      notificationsEnabled: tempNotifications,
      soundEnabled: tempSound,
      chimeEnabled: tempChime,
      alertRules: {
        ...tempRules,
        champions: parseChampionList(tempChampions),
        apexLegends: parseChampionList(tempLegends),
      },
      webhooks: {
        telegram: {
          ...tempWebhooks.telegram,
          botToken: tempWebhooks.telegram.botToken.trim(),
          chatId: tempWebhooks.telegram.chatId.trim(),
        },
        discord: {
          ...tempWebhooks.discord,
          url: tempWebhooks.discord.url.trim(),
        },
      },
      motionPref: tempMotion,
      heroScene: tempScene,
    });
    onClose();
  };

  const toggleQueueCategory = (id) =>
    setTempRules((r) => ({
      ...r,
      queueCategories: r.queueCategories.includes(id)
        ? r.queueCategories.filter((c) => c !== id)
        : [...r.queueCategories, id],
    }));

  const setQuietHours = (patch) =>
    setTempRules((r) => ({ ...r, quietHours: { ...r.quietHours, ...patch } }));

  const setTelegram = (patch) => {
    setWebhookStatus(null);
    setTempWebhooks((w) => ({ ...w, telegram: { ...w.telegram, ...patch } }));
  };

  const setDiscord = (patch) => {
    setWebhookStatus(null);
    setTempWebhooks((w) => ({ ...w, discord: { ...w.discord, ...patch } }));
  };

  // Fills the chat id from the last message the user sent to the bot
  const handleFindTelegramChat = async () => {
    setIsFindingChat(true);
    setWebhookStatus(null);
    try {
      const chat = await findTelegramChat(tempWebhooks.telegram.botToken);
      if (chat) {
        setTelegram({ chatId: chat.id });
        setWebhookStatus({
          ok: true,
          text: `Найден чат ${chat.title ? `«${chat.title}» ` : ""}(${chat.id}).`,
        });
      } else {
        setWebhookStatus({
          ok: false,
          text: "Сообщений боту нет. Напишите ему что-нибудь и повторите.",
        });
      }
    } catch (err) {
      setWebhookStatus({ ok: false, text: err.message });
    } finally {
      setIsFindingChat(false);
    }
  };

  const handleTestWebhooks = async () => {
    const { telegram, discord } = tempWebhooks;
    if (!telegram.enabled && !discord.enabled) {
      setWebhookStatus({ ok: false, text: "Включите Telegram или Discord." });
      return;
    }
    // sendWebhookAlerts silently skips half-configured channels
    const missing = [
      telegram.enabled &&
        (!telegram.botToken.trim() || !telegram.chatId.trim()) &&
        "токен и chat ID для Telegram",
      discord.enabled && !discord.url.trim() && "URL вебхука Discord",
    ].filter(Boolean);
    if (missing.length > 0) {
      setWebhookStatus({ ok: false, text: `Заполните ${missing.join(" и ")}.` });
      return;
    }
    setIsSendingTest(true);
    setWebhookStatus(null);
    const errors = await sendWebhookAlerts(
      tempWebhooks,
      "✅ Spectator Tracker: тестовое уведомление",
    );
    setIsSendingTest(false);
    setWebhookStatus(
      errors.length === 0
        ? { ok: true, text: "Тестовое сообщение отправлено." }
        : { ok: false, text: errors.map((e) => e.message).join(" · ") },
    );
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires onChange
    e.target.value = "";
    if (file) onImportWatchlist(await file.text());
  };

  const handleTestNotification = async () => {
    let perm = getNotificationPermission();
    if (perm !== "granted") {
      perm = await requestNotificationPermission();
    }
    if (perm === "granted") {
      sendDesktopNotification(
        "Spectator Tracker",
        {
          body: "Системные уведомления включены! При обнаружении матча прозвучит громкая сирена.",
        },
        true,
      );
      setNotifyStatus({ ok: true, text: "Уведомление отправлено." });
      setIsPlayingSound(true);
      setTimeout(() => {
        setIsPlayingSound(false);
      }, 4000);
    } else {
      setNotifyStatus({
        ok: false,
        text: "Браузер не дал разрешения на уведомления. Разрешите их в настройках сайта.",
      });
    }
  };

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

  const handleTestApexKey = async () => {
    setIsTestingApexKey(true);
    setApexTestResult(null);
    const result = await testApexApiKey({ apiKey: tempApexKey.trim() });
    setIsTestingApexKey(false);
    setApexTestResult(result);
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
    <div
      className="fx-fade fixed inset-0 z-50 flex justify-end bg-scrim/70"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="fx-sheet w-full max-w-xl h-full flex flex-col bg-surface border-l border-line-strong"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 sm:px-6 py-5 border-b border-line flex items-start justify-between gap-4">
          <div>
            <div className="label">Настройки</div>
            <h2
              id="settings-title"
              className="font-display text-xl sm:text-2xl text-ink mt-1"
            >
              Ключи, опрос и уведомления
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть настройки"
            className="p-2 -mr-2 text-ink-2 hover:text-ink transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <Section
            index="01"
            title="Riot API ключ"
            description="Development-ключ с портала Riot. Хранится только в этом браузере и действует 24 часа: если запросы начнут падать с 401/403, получите новый."
            action={
              <a
                href="https://developer.riotgames.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[11px] text-accent-ink hover:underline shrink-0"
              >
                получить ключ
                <ExternalLink className="w-3 h-3" />
              </a>
            }
          >
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={tempApiKey}
                onChange={(e) => {
                  setTempApiKey(e.target.value);
                  setTestResult(null);
                }}
                aria-label="Riot API ключ"
                placeholder="RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? "Скрыть ключ" : "Показать ключ"}
                className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-ink-2 hover:text-ink"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={!tempApiKey || isTestingKey}
                className={smallButtonClass}
              >
                {isTestingKey ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {isTestingKey ? "проверка…" : "проверить ключ"}
              </button>
              {testResult && (
                <StatusLine
                  status={
                    testResult.success
                      ? { ok: true, text: "Ключ работает." }
                      : {
                          ok: false,
                          text: testResult.error || "Проверка не прошла.",
                        }
                  }
                />
              )}
            </div>
          </Section>

          <Section
            index="02"
            title="Apex Legends API ключ"
            description="Бесплатный ключ сервиса Apex Legends Status (у EA нет открытого API). Хранится только в этом браузере, запросы идут напрямую, без прокси."
            action={
              <a
                href="https://portal.apexlegendsapi.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[11px] text-accent-ink hover:underline shrink-0"
              >
                получить ключ
                <ExternalLink className="w-3 h-3" />
              </a>
            }
          >
            <div className="relative">
              <input
                type={showApexKey ? "text" : "password"}
                value={tempApexKey}
                onChange={(e) => {
                  setTempApexKey(e.target.value);
                  setApexTestResult(null);
                }}
                aria-label="Apex Legends API ключ"
                placeholder="ключ с portal.apexlegendsapi.com"
                className={`${inputClass} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowApexKey(!showApexKey)}
                aria-label={showApexKey ? "Скрыть ключ" : "Показать ключ"}
                className="absolute right-0 top-0 h-10 w-10 flex items-center justify-center text-ink-2 hover:text-ink"
              >
                {showApexKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTestApexKey}
                disabled={!tempApexKey || isTestingApexKey}
                className={smallButtonClass}
              >
                {isTestingApexKey ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                {isTestingApexKey ? "проверка…" : "проверить ключ"}
              </button>
              {apexTestResult && (
                <StatusLine
                  status={
                    apexTestResult.success
                      ? { ok: true, text: "Ключ работает." }
                      : {
                          ok: false,
                          text: apexTestResult.error || "Проверка не прошла.",
                        }
                  }
                />
              )}
            </div>
          </Section>

          <Section
            index="03"
            title="Прокси для Riot"
            description="Riot API не принимает запросы прямо из браузера, поэтому они идут через прокси. Apex Legends API прокси не нужен."
          >
            <div role="radiogroup" aria-label="Прокси" className="border-t border-line">
              {PROXIES.map((p) => {
                const active = tempProxyType === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTempProxyType(p.id)}
                    className={`flex w-full items-baseline gap-2 py-2.5 border-b border-line text-left transition-colors ${
                      active ? "text-ink" : "text-ink-2 hover:text-ink"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`font-mono text-xs ${active ? "text-accent-ink" : "text-transparent"}`}
                    >
                      ›
                    </span>
                    <span className="text-sm">{p.name}</span>
                    <span className="font-mono text-[11px] text-ink-2 truncate">
                      {p.note}
                    </span>
                  </button>
                );
              })}
            </div>

            {(tempProxyType === "corsproxy" ||
              tempProxyType === "allorigins") && (
              <div className="flex items-start gap-2 border-l-2 border-warn pl-3 text-xs text-ink">
                <AlertTriangle className="w-3.5 h-3.5 text-warn shrink-0 mt-0.5" />
                <span>
                  Публичный прокси получает ваш API ключ с каждым запросом.
                  Используйте его, только если локальный недоступен.
                </span>
              </div>
            )}

            {tempProxyType === "custom" && (
              <input
                type="text"
                value={tempCustomProxy}
                onChange={(e) => setTempCustomProxy(e.target.value)}
                aria-label="URL своего прокси"
                placeholder="https://my-proxy.com/?url="
                className={inputClass}
              />
            )}
          </Section>

          <Section
            index="04"
            title="Интервал опроса"
            description="Как часто проверять, не начался ли матч, в обеих играх. Чаще = быстрее узнаете, но больше запросов к API."
          >
            <div role="radiogroup" aria-label="Интервал опроса" className="grid grid-cols-4">
              {INTERVALS.map((item) => {
                const active = tempInterval === item.seconds;
                return (
                  <button
                    key={item.seconds}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setTempInterval(item.seconds)}
                    className={`h-10 -ml-px first:ml-0 border font-mono text-xs transition-colors ${
                      active
                        ? "relative z-10 border-accent bg-accent text-accent-fg"
                        : "border-line-strong text-ink-2 hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section index="05" title="Звук и уведомления">
            <div className="space-y-4">
              <SettingRow
                title="Системные уведомления"
                description="Всплывающее окно на рабочем столе при старте матча"
              >
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className={smallButtonClass}
                >
                  <Bell className="w-3.5 h-3.5" />
                  тест
                </button>
                <Switch
                  checked={tempNotifications}
                  onChange={setTempNotifications}
                  label="Системные уведомления"
                />
              </SettingRow>
              <StatusLine status={notifyStatus} />

              <SettingRow
                title="Тихий звонок"
                description="Короткий сигнал при старте матча любого игрока"
              >
                <button
                  type="button"
                  onClick={playGameStartChime}
                  className={smallButtonClass}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  тест
                </button>
                <Switch
                  checked={tempChime}
                  onChange={setTempChime}
                  label="Тихий звонок"
                />
              </SettingRow>

              <SettingRow
                title="Громкая сирена"
                description="Вместо звонка, только для закреплённых игроков"
              >
                <button
                  type="button"
                  onClick={handleTestSound}
                  className={`${smallButtonClass} ${isPlayingSound ? "border-danger text-danger" : ""}`}
                >
                  {isPlayingSound ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                  {isPlayingSound ? "стоп" : "тест"}
                </button>
                <Switch
                  checked={tempSound}
                  onChange={setTempSound}
                  label="Громкая сирена"
                />
              </SettingRow>

              <p className="text-xs text-ink-2 leading-relaxed">
                Закрепите игрока кнопкой с булавкой на его карточке, чтобы
                слышать сирену. Свой звук можно положить в{" "}
                <code className="font-mono text-ink">public/siren.mp3</code> или{" "}
                <code className="font-mono text-ink">public/siren.wav</code>.
              </p>
            </div>
          </Section>

          <Section
            index="06"
            title="Правила уведомлений"
            description="Влияют на звук, системные уведомления и Telegram/Discord. Тосты и лог статусов показывают всё. Отдельного игрока можно заглушить колокольчиком на его карточке."
          >
            <div className="space-y-2">
              <div className="label">Режимы League</div>
              <div className="flex flex-wrap gap-1.5">
                {QUEUE_CATEGORIES.map((c) => {
                  const active = tempRules.queueCategories.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleQueueCategory(c.id)}
                      className={`inline-flex items-center gap-1.5 h-8 px-3 border font-mono text-xs transition-colors ${
                        active
                          ? "border-accent text-ink bg-accent/10"
                          : "border-line-strong text-ink-2 hover:text-ink"
                      }`}
                    >
                      {active && (
                        <Check className="w-3 h-3 text-accent-ink" />
                      )}
                      {c.label}
                    </button>
                  );
                })}
              </div>
              {tempRules.queueCategories.length === 0 && (
                <div className="font-mono text-[11px] text-warn">
                  Ни один режим не выбран: уведомлений не будет.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="alert-champions" className="label block">
                Только эти чемпионы
              </label>
              <input
                id="alert-champions"
                type="text"
                value={tempChampions}
                onChange={(e) => setTempChampions(e.target.value)}
                placeholder="Ahri, Lee Sin  (пусто = любые)"
                className={inputClass}
              />
              <div className="text-xs text-ink-2">
                Английские названия через запятую.
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="alert-legends" className="label block">
                Apex: только эти легенды
              </label>
              <input
                id="alert-legends"
                type="text"
                value={tempLegends}
                onChange={(e) => setTempLegends(e.target.value)}
                placeholder="Wraith, Mad Maggie  (пусто = любые)"
                className={inputClass}
              />
            </div>

            <SettingRow
              title="Apex: вход в сеть"
              description="Тихий сигнал, когда игрок появляется в лобби"
            >
              <Switch
                checked={tempRules.apexNotifyOnline}
                onChange={(value) =>
                  setTempRules((r) => ({ ...r, apexNotifyOnline: value }))
                }
                label="Уведомлять о входе в сеть в Apex"
              />
            </SettingRow>

            <SettingRow
              title="Итог матча"
              description="League: победа, K/D/A и LP. Apex: RP, убийства и урон. Без звука"
            >
              <Switch
                checked={tempRules.notifyResults}
                onChange={(value) =>
                  setTempRules((r) => ({ ...r, notifyResults: value }))
                }
                label="Уведомлять об итоге матча"
              />
            </SettingRow>

            <SettingRow
              title="Тихие часы"
              description="В это время уведомления только в самом трекере"
            >
              <Switch
                checked={tempRules.quietHours.enabled}
                onChange={(value) => setQuietHours({ enabled: value })}
                label="Тихие часы"
              />
            </SettingRow>
            {tempRules.quietHours.enabled && (
              <div className="flex items-center gap-2 font-mono text-xs text-ink-2">
                с
                <input
                  type="time"
                  aria-label="Начало тихих часов"
                  value={tempRules.quietHours.from}
                  onChange={(e) => setQuietHours({ from: e.target.value })}
                  className={`${inputClass} w-auto`}
                />
                до
                <input
                  type="time"
                  aria-label="Конец тихих часов"
                  value={tempRules.quietHours.to}
                  onChange={(e) => setQuietHours({ to: e.target.value })}
                  className={`${inputClass} w-auto`}
                />
              </div>
            )}
          </Section>

          <Section
            index="07"
            title="Уведомления на телефон"
            description="Сообщения уходят, пока трекер открыт в браузере."
          >
            <SettingRow title="Telegram" description="Через своего бота">
              <Switch
                checked={tempWebhooks.telegram.enabled}
                onChange={(value) => setTelegram({ enabled: value })}
                label="Telegram"
              />
            </SettingRow>
            {tempWebhooks.telegram.enabled && (
              <div className="space-y-2 border-l border-line-strong pl-4">
                <p className="text-xs text-ink-2">
                  Создайте бота у{" "}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent-ink hover:underline"
                  >
                    @BotFather
                  </a>
                  , вставьте его токен, напишите боту любое сообщение и
                  нажмите «найти».
                </p>
                <input
                  type="password"
                  aria-label="Токен бота Telegram"
                  value={tempWebhooks.telegram.botToken}
                  onChange={(e) => setTelegram({ botToken: e.target.value })}
                  placeholder="токен: 123456789:AA..."
                  className={inputClass}
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    aria-label="Chat ID"
                    value={tempWebhooks.telegram.chatId}
                    onChange={(e) => setTelegram({ chatId: e.target.value })}
                    placeholder="chat ID"
                    className={`${inputClass} flex-1 min-w-0`}
                  />
                  <button
                    type="button"
                    onClick={handleFindTelegramChat}
                    disabled={!tempWebhooks.telegram.botToken || isFindingChat}
                    className={`${smallButtonClass} h-10`}
                  >
                    {isFindingChat ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                    найти
                  </button>
                </div>
              </div>
            )}

            <SettingRow title="Discord" description="Через вебхук канала">
              <Switch
                checked={tempWebhooks.discord.enabled}
                onChange={(value) => setDiscord({ enabled: value })}
                label="Discord"
              />
            </SettingRow>
            {tempWebhooks.discord.enabled && (
              <div className="space-y-2 border-l border-line-strong pl-4">
                <p className="text-xs text-ink-2">
                  Настройки канала → Интеграции → Вебхуки → Копировать URL
                  вебхука.
                </p>
                <input
                  type="password"
                  aria-label="URL вебхука Discord"
                  value={tempWebhooks.discord.url}
                  onChange={(e) => setDiscord({ url: e.target.value })}
                  placeholder="https://discord.com/api/webhooks/..."
                  className={inputClass}
                />
                {tempWebhooks.discord.url.trim() &&
                  !isDiscordWebhookUrl(tempWebhooks.discord.url) && (
                    <div className="font-mono text-[11px] text-warn">
                      Это не похоже на URL вебхука Discord.
                    </div>
                  )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleTestWebhooks}
                disabled={isSendingTest}
                className={smallButtonClass}
              >
                {isSendingTest ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                отправить тест
              </button>
              <StatusLine status={webhookStatus} />
            </div>
          </Section>

          <Section
            index="08"
            title="Резервная копия"
            description="Один JSON-файл с игроками обеих вкладок, закреплениями, логом и статистикой. При импорте игроки, которые уже есть в списке, пропускаются."
          >
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onExportWatchlist}
                disabled={backupSize === 0}
                className={smallButtonClass}
              >
                <Download className="w-3.5 h-3.5" />
                экспорт · {backupSize}
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className={smallButtonClass}
              >
                <Upload className="w-3.5 h-3.5" />
                импорт из файла
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>
          </Section>

          <Section
            index="09"
            title="Анимации"
            description="Сколько движения в интерфейсе и что рисовать в шапке. Фон можно быстро менять и кнопкой «фон» в углу шапки."
          >
            <div className="space-y-2">
              <div className="label">Движение</div>
              <div
                role="radiogroup"
                aria-label="Уровень анимаций"
                className="grid grid-cols-4"
              >
                {MOTION_LEVELS.map((level) => {
                  const active = tempMotion === level.id;
                  return (
                    <button
                      key={level.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTempMotion(level.id)}
                      className={`fx-press h-10 -ml-px first:ml-0 border font-mono text-xs transition-colors ${
                        active
                          ? "relative z-10 border-accent bg-accent text-accent-fg"
                          : "border-line-strong text-ink-2 hover:text-ink"
                      }`}
                    >
                      {level.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-ink-2">
                {MOTION_LEVELS.find((l) => l.id === tempMotion)?.note}
                {tempMotion === "auto" &&
                  ` · сейчас: ${
                    MOTION_LEVELS.find(
                      (l) =>
                        l.id === resolveMotion("auto", systemReducesMotion()),
                    )?.label.toLowerCase()
                  }`}
              </p>
            </div>

            <div className="space-y-2">
              <div className="label">Фон шапки</div>
              <div
                role="radiogroup"
                aria-label="Фон шапки"
                className="grid grid-cols-2 sm:grid-cols-3 gap-2"
              >
                {HERO_SCENES.map((scene) => {
                  const active = tempScene === scene.id;
                  return (
                    <button
                      key={scene.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setTempScene(scene.id)}
                      className={`fx-press group text-left border transition-colors ${
                        active
                          ? "border-accent"
                          : "border-line-strong hover:border-ink-2"
                      }`}
                    >
                      <span className="block h-16 bg-canvas overflow-hidden">
                        {scene.id !== "none" && (
                          <AsciiCanvas
                            sceneId={scene.id}
                            fontSize={7}
                            interactive={false}
                          />
                        )}
                      </span>
                      <span
                        className={`flex items-center justify-between px-2.5 h-8 border-t font-mono text-[11px] ${
                          active
                            ? "border-accent text-ink"
                            : "border-line-strong text-ink-2 group-hover:text-ink"
                        }`}
                      >
                        {scene.label}
                        {active && <Check className="w-3 h-3 text-accent-ink" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              {motionLevel !== "full" && (
                <p className="text-xs text-ink-2">
                  Сейчас анимации не полные, поэтому фон и превью неподвижны.
                </p>
              )}
            </div>
          </Section>

          <div className="px-5 sm:px-6 py-6">
            <button
              type="button"
              onClick={onResetWatchlist}
              disabled={watchlistSize === 0}
              className="font-mono text-[11px] text-danger hover:underline disabled:opacity-40 disabled:no-underline"
            >
              очистить список игроков {activeGameName}
            </button>
            <span className="block font-mono text-[11px] text-ink-2 mt-1">
              в течение нескольких секунд можно вернуть
            </span>
          </div>
        </div>

        <footer className="px-5 sm:px-6 py-4 border-t border-line bg-canvas flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost h-10 px-4 font-mono text-xs"
          >
            отмена
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn-primary h-10 px-5 font-mono text-xs"
          >
            сохранить
          </button>
        </footer>
      </div>
    </div>
  );
};
