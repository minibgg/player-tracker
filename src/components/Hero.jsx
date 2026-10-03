import React, { useEffect, useState } from "react";
import { AsciiLandscape } from "./AsciiLandscape";

const TITLE = "Кто сейчас в игре";
const TYPE_MS = 45;

const FADE_MASK =
  "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%), linear-gradient(to right, transparent, #000 25%)";

// Types the title out once; shows it immediately under reduced motion
const useTypewriter = (text) => {
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [count, setCount] = useState(reduce ? text.length : 0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, TYPE_MS);
    return () => clearInterval(id);
  }, [text, reduce]);

  return text.slice(0, count);
};

// Page header: title over a quiet, drifting ASCII landscape
export const Hero = () => {
  const typed = useTypewriter(TITLE);

  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <div
        className="absolute inset-0 -z-10"
        style={{
          WebkitMaskImage: FADE_MASK,
          maskImage: FADE_MASK,
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
      >
        <AsciiLandscape />
      </div>

      <div className="px-4 lg:px-10 py-10 sm:py-14 lg:py-16 max-w-5xl">
        <div className="label">Журнал наблюдения</div>
        <h1
          className="font-display text-4xl sm:text-6xl lg:text-7xl text-ink mt-3 leading-[1.05]"
          aria-label={TITLE}
        >
          <span aria-hidden="true">
            {typed}
            <span className="cursor-blink text-accent-ink">_</span>
          </span>
        </h1>
        <p className="mt-4 text-ink-2 max-w-md text-sm">
          Живой список аккаунтов League of Legends: уведомление в момент, когда
          матч начинается.
        </p>
      </div>
    </section>
  );
};
