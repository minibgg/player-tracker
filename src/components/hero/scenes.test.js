import { describe, it, expect } from "vitest";
import {
  HERO_SCENES,
  createScene,
  nextHeroScene,
  normalizeHeroScene,
} from "./scenes";

const animatedScenes = HERO_SCENES.filter((s) => s.id !== "none");

// Renders a few frames on a grid and collects every cell's brightness
const sample = (id, cols, rows, times = [0, 0.4, 1.7, 5]) => {
  const scene = createScene(id);
  const out = { alpha: 1, glyph: null };
  const levels = [];
  for (const t of times) {
    scene.prepare(t, cols, rows);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        out.alpha = 1;
        out.glyph = null;
        levels.push({ level: scene.cell(c, r, out), alpha: out.alpha });
      }
    }
  }
  return levels;
};

describe("hero scenes", () => {
  it.each(animatedScenes.map((s) => s.id))(
    "%s gives finite brightness in 0..1 and draws something",
    (id) => {
      for (const [cols, rows] of [
        [120, 22],
        [40, 8],
      ]) {
        const levels = sample(id, cols, rows);
        for (const { level, alpha } of levels) {
          expect(Number.isFinite(level)).toBe(true);
          expect(level).toBeLessThanOrEqual(1);
          expect(alpha).toBeGreaterThan(0);
          expect(alpha).toBeLessThanOrEqual(1);
        }
        expect(levels.some(({ level }) => level > 0.3)).toBe(true);
      }
    },
  );

  it("draws a still first frame for every scene (motion off or calm)", () => {
    for (const { id } of animatedScenes) {
      const levels = sample(id, 80, 16, [0]);
      expect(levels.some(({ level }) => level > 0)).toBe(true);
    }
  });

  it("lets ripples start from a click", () => {
    const scene = createScene("ripples");
    scene.prepare(0, 60, 12);
    scene.addSource(10, 6);
    scene.prepare(0.2, 60, 12);
    // About 3 columns out after 0.2 s at 16 columns/s
    expect(scene.cell(13, 6, {})).toBeGreaterThan(0.3);
  });
});

describe("scene choice", () => {
  it("cycles through every scene and wraps around", () => {
    let id = HERO_SCENES[0].id;
    const seen = [id];
    for (let i = 1; i < HERO_SCENES.length; i++) {
      id = nextHeroScene(id);
      seen.push(id);
    }
    expect(seen).toEqual(HERO_SCENES.map((s) => s.id));
    expect(nextHeroScene(id)).toBe(HERO_SCENES[0].id);
  });

  it("falls back to the landscape for unknown values", () => {
    expect(normalizeHeroScene("radar")).toBe("radar");
    expect(normalizeHeroScene(null)).toBe("landscape");
    expect(normalizeHeroScene("disco")).toBe("landscape");
  });
});
