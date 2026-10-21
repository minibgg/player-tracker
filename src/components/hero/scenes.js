// ASCII scenes for the hero background. A scene is a factory returning:
//   prepare(t, cols, rows)  per-frame setup, t in seconds
//   cell(c, r, out)         brightness 0..1 of a cell (<= 0: empty). May set
//                           out.alpha (layer dimming) and out.glyph (a fixed
//                           character instead of the brightness ramp)
//   addSource(col, row)     optional: react to a click on the hero
// AsciiCanvas turns the brightness into glyphs and draws them.

export const HERO_SCENES = [
  { id: "landscape", label: "Ландшафт" },
  { id: "rain", label: "Дождь" },
  { id: "radar", label: "Радар" },
  { id: "ripples", label: "Волны" },
  { id: "none", label: "Без фона" },
];

export const DEFAULT_HERO_SCENE = "landscape";

export const normalizeHeroScene = (id) =>
  HERO_SCENES.some((s) => s.id === id) ? id : DEFAULT_HERO_SCENE;

export const nextHeroScene = (id) => {
  const i = HERO_SCENES.findIndex((s) => s.id === id);
  return HERO_SCENES[(i + 1) % HERO_SCENES.length].id;
};

// Glyph cells are about this many times taller than wide, so distances
// along rows are stretched to keep circles round
const CELL_ASPECT = 1.8;
const TAU = Math.PI * 2;

// Angle `a` behind `b`, in [0, TAU)
const angleBehind = (b, a) => (((b - a) % TAU) + TAU) % TAU;

// Cheap integer hash for stable pseudo-random glyphs
const hash = (a, b, c) => {
  let h = (a * 374761393 + b * 668265263 + c * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
};

/* Landscape: three drifting ridges, far (dim, slow) to near (bright, fast) */

const RIDGES = [
  { base: 0.38, amp: 0.1, freq: 0.9, speed: 0.12, alpha: 0.28, phase: 0 },
  { base: 0.52, amp: 0.12, freq: 1.3, speed: 0.2, alpha: 0.5, phase: 2.1 },
  { base: 0.67, amp: 0.13, freq: 1.8, speed: 0.32, alpha: 0.85, phase: 4.3 },
];

// A few detuned sines make a smooth, non-repeating ridge line
const ridge = (x, t, layer) => {
  const p = x * layer.freq + t * layer.speed + layer.phase;
  return (
    Math.sin(p) * 0.55 +
    Math.sin(p * 2.1 + 1.7) * 0.3 +
    Math.sin(p * 4.3 + 0.4) * 0.15
  );
};

const createLandscape = () => {
  let heights = [];
  return {
    prepare(t, cols, rows) {
      heights = RIDGES.map((layer) => {
        const arr = new Float32Array(cols);
        for (let c = 0; c < cols; c++) {
          arr[c] = (layer.base + ridge((c / cols) * 6, t, layer) * layer.amp) * rows;
        }
        return arr;
      });
    },
    cell(c, r, out) {
      // Nearest ridge whose crest is above this cell wins
      for (let l = RIDGES.length - 1; l >= 0; l--) {
        if (r >= heights[l][c]) {
          out.alpha = RIDGES[l].alpha;
          // Dense at the crest, thinning out below it
          return Math.exp(-(r - heights[l][c]) / 5) * 0.85 + 0.12;
        }
      }
      return 0;
    },
  };
};

/* Rain: columns of hex glyphs falling at different speeds */

const RAIN_GLYPHS = "0123456789ABCDEF<>/\\|=+*:#%$";

const createRain = () => {
  let drops = [];
  let lastT = 0;
  let now = 0;

  const spawn = (rows, anywhere) => ({
    // Only some columns rain at a time, so it reads as streaks, not a wall
    active: Math.random() < 0.5,
    y: anywhere ? Math.random() * rows * 1.6 - rows * 0.3 : -Math.random() * rows,
    speed: 5 + Math.random() * 13,
    len: 4 + Math.random() * 12,
  });

  return {
    prepare(t, cols, rows) {
      if (drops.length !== cols) {
        drops = Array.from({ length: cols }, () => spawn(rows, true));
      }
      const dt = Math.min(0.1, Math.max(0, t - lastT));
      lastT = t;
      now = t;
      for (const d of drops) {
        d.y += d.speed * dt;
        if (d.y - d.len > rows) Object.assign(d, spawn(rows, false));
      }
    },
    cell(c, r, out) {
      const d = drops[c];
      if (!d || !d.active) return 0;
      const dist = d.y - r;
      if (dist < 0 || dist > d.len) return 0;
      // Glyphs flicker a few times a second
      out.glyph = RAIN_GLYPHS[hash(c, r, Math.floor(now * 7 + c)) % RAIN_GLYPHS.length];
      // Bright head, fading tail
      return dist < 1 ? 1 : 0.85 * (1 - dist / d.len) + 0.1;
    },
  };
};

/* Radar: a sweep with rings and blips that light up as the beam passes */

const BLIP_COUNT = 6;
const SWEEP_SPEED = 1.1; // rad/s, about 5.7 s per turn

const createRadar = () => {
  let cx = 0;
  let cy = 0;
  let radius = 0;
  let sweep = 0;
  let blips = [];
  let gridKey = "";

  return {
    prepare(t, cols, rows) {
      cx = cols * 0.74;
      cy = rows * 0.5;
      radius = Math.min(rows * 0.46 * CELL_ASPECT, cols * 0.24);
      sweep = (t * SWEEP_SPEED) % TAU;

      const key = `${cols}x${rows}`;
      if (key !== gridKey) {
        gridKey = key;
        blips = Array.from({ length: BLIP_COUNT }, () => {
          const angle = Math.random() * TAU;
          const dist = radius * (0.2 + Math.random() * 0.7);
          return {
            angle,
            x: cx + Math.cos(angle) * dist,
            y: cy + (Math.sin(angle) * dist) / CELL_ASPECT,
          };
        });
      }
    },
    cell(c, r) {
      const dx = c - cx;
      const dy = (r - cy) * CELL_ASPECT;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius + 0.6) return 0;

      let level = 0;
      // Rim, two inner rings and the crosshair
      if (Math.abs(dist - radius) < 0.6) level = 0.32;
      else if (dist % (radius / 3) < 0.55) level = 0.18;
      if (Math.abs(dx) < 0.5 || Math.abs(r - cy) < 0.5) {
        level = Math.max(level, 0.16);
      }

      // The beam and its fading trail
      const behind = angleBehind(sweep, Math.atan2(dy, dx));
      level = Math.max(level, Math.exp(-behind * 3) * 0.95);

      // Blips flare when the beam crosses them, then fade over the turn
      for (const b of blips) {
        const bx = c - b.x;
        const by = (r - b.y) * CELL_ASPECT;
        if (bx * bx + by * by < 1.6) {
          level = Math.max(level, Math.exp(-angleBehind(sweep, b.angle) * 0.8));
        }
      }
      return level;
    },
  };
};

/* Ripples: rings spreading from random points and from clicks */

const RIPPLE_SPEED = 16; // columns per second
const RIPPLE_LIFE = 3.2; // seconds
const MAX_RIPPLES = 10;

const createRipples = () => {
  let sources = [];
  let now = 0;
  let nextSpawn = 0;
  let cols = 0;
  let rows = 0;
  let seeded = false;

  const randomSource = (t0) => ({
    x: cols * (0.3 + Math.random() * 0.65),
    y: rows * (0.15 + Math.random() * 0.7),
    t0,
  });

  return {
    prepare(t, c, r) {
      cols = c;
      rows = r;
      now = t;
      // Start mid-way through a few ripples so even a still frame has rings
      if (!seeded) {
        seeded = true;
        sources = [0.7, 1.6, 2.5].map((age) => randomSource(t - age));
        nextSpawn = t + 0.8;
      }
      if (t >= nextSpawn) {
        sources.push(randomSource(t));
        nextSpawn = t + 1.2 + Math.random() * 1.2;
      }
      sources = sources.filter((s) => t - s.t0 < RIPPLE_LIFE).slice(-MAX_RIPPLES);
    },
    addSource(col, row) {
      sources.push({ x: col, y: row, t0: now });
      sources = sources.slice(-MAX_RIPPLES);
    },
    cell(c, r) {
      let level = 0;
      for (const s of sources) {
        const age = now - s.t0;
        const dx = c - s.x;
        const dy = (r - s.y) * CELL_ASPECT;
        const band = Math.sqrt(dx * dx + dy * dy) - age * RIPPLE_SPEED;
        if (band > 1.5 || band < -7) continue;
        const fade = 1 - age / RIPPLE_LIFE;
        // Sharp leading crest, soft wake behind it
        const v = band > 0 ? Math.exp(-band * band * 1.4) : Math.exp(band / 2.4) * 0.75;
        level += v * fade;
      }
      return Math.min(level, 1);
    },
  };
};

const FACTORIES = {
  landscape: createLandscape,
  rain: createRain,
  radar: createRadar,
  ripples: createRipples,
};

export const createScene = (id) => (FACTORIES[id] || createLandscape)();
