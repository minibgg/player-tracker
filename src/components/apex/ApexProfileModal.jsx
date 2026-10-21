import React, { useEffect } from "react";
import { X, RotateCw, ShieldAlert } from "lucide-react";
import { LegendIcon } from "./LegendIcon";
import { getApexPlatform, PRESENCE } from "../../data/apexPlatforms";
import {
  formatApexTier,
  formatRpChange,
  isRanked,
} from "../../data/apexRanks";
import { legendKey } from "../../services/apexApi";
import { getApexOutcomeLabel } from "../../services/apexMatch";
import { formatTimestamp } from "../../services/timeFormat";

// Hooks live in the inner component so they are never called conditionally
export const ApexProfileModal = (props) => {
  if (!props.player) return null;
  return <ApexProfileContent {...props} />;
};

const formatValue = (n) => Number(n).toLocaleString("ru-RU");

const Stat = ({ label, children, detail }) => (
  <div className="min-w-0">
    <div className="label">{label}</div>
    <div className="mt-1.5 text-ink">{children}</div>
    {detail && (
      <div className="font-mono text-[11px] text-ink-2 mt-1">{detail}</div>
    )}
  </div>
);

const ApexProfileContent = ({ player, onClose, onRefresh, isChecking }) => {
  const platform = getApexPlatform(player.platform);
  const presence = PRESENCE[player.status] || PRESENCE.OFFLINE;

  // Escape closes the modal
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Selected legend first, the rest alphabetically
  const selectedKey = legendKey(player.legend);
  const legends = Object.entries(player.legends || {})
    .map(([key, entry]) => ({ key, ...entry }))
    .sort(
      (a, b) =>
        Number(b.key === selectedKey) - Number(a.key === selectedKey) ||
        a.name.localeCompare(b.name),
    );
  const matchLog = player.matchLog || [];

  return (
    <div
      className="fx-fade fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-scrim/80"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="apex-profile-title"
        className="fx-modal w-full max-w-3xl max-h-[92vh] flex flex-col bg-surface border border-line-strong"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 sm:px-6 py-5 border-b border-line flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <LegendIcon
              legend={player.legend}
              className="size-14 border-line-strong text-2xl"
            />
            <div className="min-w-0">
              <div className="label flex flex-wrap items-center gap-x-2">
                <span>Apex Legends · {platform.name}</span>
                {player.uid && <span>· UID {player.uid}</span>}
              </div>
              <h2
                id="apex-profile-title"
                className="font-display text-xl sm:text-2xl text-ink mt-1 truncate"
              >
                {player.name}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onRefresh(player)}
              disabled={isChecking}
              title="Обновить сейчас"
              aria-label="Обновить сейчас"
              className="p-2 text-ink-2 hover:text-ink transition-colors disabled:opacity-50"
            >
              <RotateCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="p-2 -mr-2 text-ink-2 hover:text-ink transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="px-5 sm:px-6 py-5 overflow-y-auto space-y-8">
          {player.isBanned && (
            <div className="flex items-start gap-2 border-l-2 border-danger pl-3 text-xs text-ink">
              <ShieldAlert className="w-3.5 h-3.5 text-danger shrink-0 mt-0.5" />
              На аккаунте действует бан.
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
            <Stat
              label="ранг"
              detail={
                isRanked(player.rank)
                  ? `${formatValue(player.rank.score)} RP${player.rank.season ? ` · ${player.rank.season}` : ""}`
                  : null
              }
            >
              <div className="flex items-center gap-2">
                {isRanked(player.rank) && player.rank.img && (
                  <img
                    src={player.rank.img}
                    alt=""
                    className="size-8 object-contain"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                )}
                <span className="font-display text-lg">
                  {isRanked(player.rank) ? formatApexTier(player.rank) : "без ранга"}
                </span>
              </div>
            </Stat>

            <Stat label="уровень" detail={`${player.xpPercent || 0}% до следующего`}>
              <div className="font-display text-lg tabular-nums">
                {player.level || "—"}
              </div>
              <div className="mt-1.5 h-1 bg-surface-3" aria-hidden="true">
                <div
                  className="h-full bg-accent"
                  style={{ width: `${Math.min(100, player.xpPercent || 0)}%` }}
                />
              </div>
            </Stat>

            <Stat
              label="сейчас"
              detail={
                player.lastChecked
                  ? `проверен ${formatTimestamp(player.lastChecked)}`
                  : "ещё не проверялся"
              }
            >
              <div className="flex items-center gap-2 font-mono text-sm">
                <span className={`size-2 rounded-full ${presence.dot}`} />
                {presence.label}
                {player.stateSince && player.status !== "OFFLINE" && (
                  <span className="text-ink-2">
                    с {formatTimestamp(player.stateSince)}
                  </span>
                )}
              </div>
            </Stat>
          </div>

          <section aria-label="Трекеры на баннерах">
            <div className="label pb-2 border-b border-line-strong">
              трекеры на баннерах
            </div>
            {legends.length === 0 ? (
              <p className="py-3 text-xs text-ink-2">
                API пока не видел трекеров этого игрока.
              </p>
            ) : (
              <ul>
                {legends.map((legend) => (
                  <li
                    key={legend.key}
                    className="flex items-start gap-3 py-2.5 border-b border-line"
                  >
                    <LegendIcon legend={legend.name} className="size-8 border-line" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-ink">
                        {legend.name}
                        {legend.key === selectedKey && (
                          <span className="label ml-2 text-accent-ink">выбрана</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[11px] text-ink-2">
                        {legend.trackers.map((t) => (
                          <span key={t.key}>
                            {t.name}{" "}
                            <span className="text-ink tabular-nums">
                              {formatValue(t.value)}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Матчи, замеченные трекером">
            <div className="label pb-2 border-b border-line-strong">
              матчи, замеченные трекером
            </div>
            {matchLog.length === 0 ? (
              <p className="py-3 text-xs text-ink-2">
                Пока ни одного. Итог появится после первого матча, который
                застанет открытый трекер.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-mono text-xs">
                  <thead>
                    <tr className="text-left text-ink-2">
                      <th className="py-2 pr-3 font-normal">когда</th>
                      <th className="py-2 pr-3 font-normal">легенда</th>
                      <th className="py-2 pr-3 font-normal">итог</th>
                      <th className="py-2 pr-3 font-normal text-right">убийства</th>
                      <th className="py-2 pr-3 font-normal text-right">урон</th>
                      <th className="py-2 pr-3 font-normal text-right">RP</th>
                      <th className="py-2 font-normal text-right">мин</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchLog.map((m) => (
                      <tr key={m.matchKey} className="border-t border-line">
                        <td className="py-2 pr-3 text-ink-2 whitespace-nowrap">
                          {formatTimestamp(m.endedAt)}
                        </td>
                        <td className="py-2 pr-3 text-ink whitespace-nowrap">
                          {m.legend || "—"}
                        </td>
                        <td
                          className={`py-2 pr-3 uppercase whitespace-nowrap ${
                            m.win ? "text-success" : m.counted ? "text-ink" : "text-ink-2"
                          }`}
                        >
                          {getApexOutcomeLabel(m)}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {m.kills ?? "—"}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {m.damage != null ? formatValue(m.damage) : "—"}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums whitespace-nowrap">
                          {m.rpChange != null ? formatRpChange(m.rpChange) : "—"}
                        </td>
                        <td className="py-2 text-right tabular-nums">
                          {Math.max(1, Math.round(m.duration / 60))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <p className="text-xs text-ink-2 leading-relaxed">
            Убийства, урон и победы видны, только если игрок поставил эти
            трекеры на баннер легенды, с которой играл. RP меняется только в
            рейтинговых матчах. Данные:{" "}
            <a
              href="https://apexlegendsstatus.com/"
              target="_blank"
              rel="noreferrer"
              className="text-accent-ink hover:underline"
            >
              apexlegendsstatus.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
