// How much the interface moves. The chosen level lives on <html data-motion>,
// where CSS (fx-* classes) and canvas/JS animations read it.

export const MOTION_LEVELS = [
  {
    id: "auto",
    label: "Авто",
    note: "полные, а если в системе включено «уменьшение движения» — спокойные",
  },
  {
    id: "full",
    label: "Полные",
    note: "живой фон, строки переезжают при сортировке, вспышка при старте матча",
  },
  {
    id: "calm",
    label: "Спокойные",
    note: "только мягкие появления, фон неподвижен",
  },
  { id: "off", label: "Выкл", note: "ничего не двигается" },
];

const LEVEL_IDS = MOTION_LEVELS.map((l) => l.id);

export const normalizeMotionPref = (value) =>
  LEVEL_IDS.includes(value) ? value : "auto";

// "auto" follows the OS setting: reduced motion gets the calm level
export const resolveMotion = (pref, systemReducesMotion) => {
  const level = normalizeMotionPref(pref);
  if (level !== "auto") return level;
  return systemReducesMotion ? "calm" : "full";
};

export const systemReducesMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

// The level currently applied to the page
export const getMotion = () =>
  (typeof document !== "undefined" &&
    document.documentElement.dataset.motion) ||
  "full";

export const applyMotion = (level) => {
  document.documentElement.dataset.motion = level;
};
