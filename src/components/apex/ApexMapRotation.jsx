import React, { useEffect, useState } from "react";
import { fetchMapRotation } from "../../services/apexApi";
import { formatDuration } from "../../services/timeFormat";

const RETRY_MS = 10 * 60 * 1000;
// setTimeout overflows past ~24.8 days
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

// Shared across mounts, so switching tabs back and forth costs no requests
let cache = null; // { apiKey, data, until }

const nearestEnd = (data) =>
  Math.min(
    ...[data.pubs?.current?.end, data.ranked?.current?.end].filter(Boolean),
  );

// "23:11", "5 ч 12 мин", "3 д 4 ч"
const formatLeft = (ms) => {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  if (seconds < 3600) return formatDuration(seconds);
  const hours = Math.floor(seconds / 3600);
  if (hours < 24) return `${hours} ч ${Math.floor((seconds % 3600) / 60)} мин`;
  return `${Math.floor(hours / 24)} д ${hours % 24} ч`;
};

const MapSlot = ({ title, mode, now }) => {
  if (!mode?.current) return null;
  const { current, next } = mode;
  return (
    <div className="px-4 py-3 border-b sm:border-b-0 sm:border-r last:border-0 border-line min-w-0">
      <div className="label">{title}</div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="font-display text-lg text-ink truncate">
          {current.map}
        </span>
        {current.end && (
          <span
            className="font-mono text-xs text-ink-2 tabular-nums shrink-0"
            title="До смены карты"
          >
            ещё {formatLeft(current.end - now)}
          </span>
        )}
      </div>
      {next?.map && (
        <div className="font-mono text-[11px] text-ink-2 mt-0.5 truncate">
          далее: {next.map}
        </div>
      )}
    </div>
  );
};

// Current maps of Battle Royale pubs and ranked, refreshed when one changes
export const ApexMapRotation = ({ apiKey }) => {
  const [rotation, setRotation] = useState(() =>
    cache?.apiKey === apiKey && cache.until > Date.now() ? cache.data : null,
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!apiKey) return undefined;
    let cancelled = false;
    let timer = null;

    const schedule = (ms) => {
      timer = setTimeout(load, Math.min(Math.max(ms, 1000), MAX_TIMEOUT_MS));
    };
    async function load() {
      try {
        const data = await fetchMapRotation({ apiKey });
        if (cancelled) return;
        // A few seconds of slack: the API flips the map right at the end
        const until = Number.isFinite(nearestEnd(data))
          ? nearestEnd(data) + 5000
          : Date.now() + RETRY_MS;
        cache = { apiKey, data, until };
        setRotation(data);
        schedule(until - Date.now());
      } catch {
        if (!cancelled) schedule(RETRY_MS);
      }
    }

    if (cache?.apiKey === apiKey && cache.until > Date.now()) {
      schedule(cache.until - Date.now());
    } else {
      load();
    }
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [apiKey]);

  useEffect(() => {
    if (!rotation) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [rotation]);

  // Nice to have: stays out of the way until it has something to show
  if (!apiKey || !rotation || (!rotation.pubs && !rotation.ranked)) return null;

  return (
    <section aria-label="Ротация карт">
      <div className="label mb-2">Карты сейчас</div>
      <div className="grid sm:grid-cols-2 border border-line bg-surface">
        <MapSlot title="Королевская битва" mode={rotation.pubs} now={now} />
        <MapSlot title="Рейтинг" mode={rotation.ranked} now={now} />
      </div>
    </section>
  );
};
