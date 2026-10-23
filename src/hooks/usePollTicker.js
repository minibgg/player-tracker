import { useState, useEffect, useRef } from "react";

/**
 * One poll clock for every game: calls onTick as soon as it's enabled, then
 * each `pollingInterval` seconds, and returns the seconds left until the
 * next call.
 *
 * Works off a wall-clock deadline instead of counting ticks, so it stays
 * accurate when the browser throttles a background tab.
 */
export const usePollTicker = ({ pollingInterval, isEnabled, onTick }) => {
  const [secondsUntilNextCheck, setSecondsUntilNextCheck] =
    useState(pollingInterval);

  // Through a ref, so new callbacks don't restart the clock
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  const nextCheckAtRef = useRef(0);

  // Reset the shown countdown when the interval changes or tracking resumes.
  // Adjusted during render, so there is no extra effect-driven re-render.
  const countdownKey = `${pollingInterval}:${isEnabled}`;
  const [prevCountdownKey, setPrevCountdownKey] = useState(countdownKey);
  if (countdownKey !== prevCountdownKey) {
    setPrevCountdownKey(countdownKey);
    setSecondsUntilNextCheck(pollingInterval);
  }

  // Ticker. A Web Worker timer is not throttled in background tabs (setInterval
  // on the page is, down to ~1/min), so checks keep running when you switch tabs.
  useEffect(() => {
    if (!isEnabled) return;

    // Check right away whenever the interval changes or tracking resumes, so
    // the board doesn't show stored data for a whole interval after opening
    nextCheckAtRef.current = Date.now() + pollingInterval * 1000;
    onTickRef.current?.();

    const tick = () => {
      const left = Math.ceil((nextCheckAtRef.current - Date.now()) / 1000);
      if (left <= 0) {
        nextCheckAtRef.current = Date.now() + pollingInterval * 1000;
        setSecondsUntilNextCheck(pollingInterval);
        onTickRef.current?.();
      } else {
        setSecondsUntilNextCheck(left);
      }
    };

    let worker = null;
    let fallbackTimer = null;
    try {
      const url = URL.createObjectURL(
        new Blob(["setInterval(() => postMessage(0), 1000);"], {
          type: "text/javascript",
        }),
      );
      worker = new Worker(url);
      worker.onmessage = tick;
      URL.revokeObjectURL(url);
    } catch {
      fallbackTimer = setInterval(tick, 1000);
    }

    // Catch up immediately when the tab becomes visible again
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      worker?.terminate();
      if (fallbackTimer) clearInterval(fallbackTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isEnabled, pollingInterval]);

  return secondsUntilNextCheck;
};
