import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AsciiCanvas } from "./hero/AsciiCanvas";
import { HERO_SCENES } from "./hero/scenes";
import { getMotion } from "../services/motion";

const TITLE = "Кто сейчас в игре";
const TYPE_MS = 45;

// Each scene fades out behind the title so the text stays readable; the
// ridges and ripples also melt into the page below
const SCENE_MASKS = {
  landscape:
    "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%), linear-gradient(to right, transparent, #000 25%)",
  rain: "linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%), linear-gradient(to right, transparent 15%, #000 50%)",
  radar: "linear-gradient(to right, transparent 35%, #000 60%)",
  ripples:
    "linear-gradient(to bottom, #000 0%, #000 60%, transparent 100%), linear-gradient(to right, transparent 15%, #000 50%)",
};

// Types the title out once; shows it at once unless motion is "full"
const useTypewriter = (text) => {
  const [animate] = useState(() => getMotion() === "full");
  const [count, setCount] = useState(animate ? 0 : text.length);

  useEffect(() => {
    if (!animate) return;
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
  }, [text, animate]);

  return text.slice(0, count);
};

// Page header: title over an ASCII background the user can switch
export const Hero = ({ scene, onCycleScene, subtitle }) => {
  const typed = useTypewriter(TITLE);
  const sceneLabel = HERO_SCENES.find((s) => s.id === scene)?.label;
  const mask = SCENE_MASKS[scene];

  return (
    <section className="relative isolate overflow-hidden border-b border-line hidden sm:block">
      {scene !== "none" && (
        <div
          className="absolute inset-0 -z-10"
          style={{
            WebkitMaskImage: mask,
            maskImage: mask,
            WebkitMaskComposite: "source-in",
            maskComposite: "intersect",
          }}
        >
          <AsciiCanvas key={scene} sceneId={scene} className="fx-fade" />
        </div>
      )}

      <div className="px-4 lg:px-10 py-8 sm:py-14 lg:py-16 max-w-5xl">
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
        <p className="mt-4 text-ink-2 max-w-md text-sm">{subtitle}</p>
      </div>

      {/* Quick switch; the full choice with previews is in Settings */}
      <div className="absolute right-4 lg:right-10 bottom-3 flex items-center gap-3">
        {scene === "ripples" && (
          <span className="label hidden md:inline">клик по шапке — волна</span>
        )}
        <button
          type="button"
          onClick={onCycleScene}
          title="Сменить фон шапки"
          className="fx-press inline-flex items-center gap-1.5 label hover:text-accent-ink transition-colors"
        >
          фон: {sceneLabel}
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </section>
  );
};
