import React, { useEffect, useRef } from "react";

// Characters ordered from faint to dense
const RAMP = " .:-=+*xX#%@";
const FRAME_MS = 1000 / 30;
const ALPHA_BUCKETS = 8;

// Three ridges: far (dim, slow) -> near (bright, faster). `base` is the ridge
// height as a fraction of the canvas height, `speed` the horizontal drift.
const LAYERS = [
  { base: 0.38, amp: 0.1, freq: 0.9, speed: 0.12, alpha: 0.28, phase: 0 },
  { base: 0.52, amp: 0.12, freq: 1.3, speed: 0.2, alpha: 0.5, phase: 2.1 },
  { base: 0.67, amp: 0.13, freq: 1.8, speed: 0.32, alpha: 0.85, phase: 4.3 },
];

// Cheap smooth noise: a few detuned sines
const ridge = (x, t, layer) => {
  const p = x * layer.freq + t * layer.speed + layer.phase;
  return (
    Math.sin(p) * 0.55 +
    Math.sin(p * 2.1 + 1.7) * 0.3 +
    Math.sin(p * 4.3 + 0.4) * 0.15
  );
};

const readAccent = () => {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--c-accent")
    .trim()
    .split(/\s+/);
  return v.length === 3 ? v.join(",") : "224,82,58";
};

const readFont = () =>
  getComputedStyle(document.documentElement)
    .getPropertyValue("--font-mono")
    .trim() || "monospace";

/**
 * Animated ASCII hills drawn on a <canvas>. Capped at ~30fps, paused when
 * off-screen or when the tab is hidden, static when the user prefers reduced motion.
 */
export const AsciiLandscape = ({ className = "" }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let width = 0;
    let height = 0;
    let cols = 0;
    let rows = 0;
    let cellW = 0;
    let cellH = 0;
    let fontPx = 12;
    let rgb = readAccent();
    let rafId = 0;
    let lastFrame = 0;
    let visible = true;
    let running = false;
    const mouse = { x: -1000, y: -1000 };
    const start = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Fewer, larger glyphs on small screens keeps it light
      fontPx = width < 640 ? 14 : 11;
      ctx.font = `${fontPx}px ${readFont()}`;
      cellW = ctx.measureText("M").width || fontPx * 0.6;
      cellH = fontPx * 1.1;
      cols = Math.ceil(width / cellW);
      rows = Math.ceil(height / cellH);
    };

    // Per-bucket glyph lists so fillStyle changes only a handful of times per frame
    const buckets = Array.from({ length: ALPHA_BUCKETS }, () => []);

    const draw = (now) => {
      if (!cols || !rows) return;
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, width, height);
      ctx.font = `${fontPx}px ${readFont()}`;
      ctx.textBaseline = "top";
      buckets.forEach((b) => (b.length = 0));

      const heights = LAYERS.map((layer) => {
        const arr = new Float32Array(cols);
        for (let c = 0; c < cols; c++) {
          const nx = (c / cols) * 6;
          arr[c] = (layer.base + ridge(nx, t, layer) * layer.amp) * rows;
        }
        return arr;
      });

      const mouseCol = mouse.x / cellW;
      const mouseRow = mouse.y / cellH;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          // Nearest layer whose ridge is above this cell wins
          let li = -1;
          for (let l = LAYERS.length - 1; l >= 0; l--) {
            if (r >= heights[l][c]) {
              li = l;
              break;
            }
          }
          if (li < 0) continue;

          const depth = r - heights[li][c]; // rows below the crest
          // Dense at the crest, thinning out below it
          let level = Math.exp(-depth / 5) * 0.85 + 0.12;

          // Cursor: brighten nearby glyphs
          const dx = c - mouseCol;
          const dy = (r - mouseRow) * 1.8;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120) level += (1 - d2 / 120) * 0.45;

          level = Math.min(level, 1);
          const ch = RAMP[Math.round(level * (RAMP.length - 1))];
          if (ch === " ") continue;

          const alpha = Math.min(LAYERS[li].alpha * (0.5 + level * 0.7), 1);
          const bucket = Math.min(
            ALPHA_BUCKETS - 1,
            Math.floor(alpha * ALPHA_BUCKETS),
          );
          buckets[bucket].push(ch, c * cellW, r * cellH);
        }
      }

      for (let b = 0; b < ALPHA_BUCKETS; b++) {
        const list = buckets[b];
        if (!list.length) continue;
        ctx.fillStyle = `rgba(${rgb},${((b + 0.5) / ALPHA_BUCKETS).toFixed(2)})`;
        for (let i = 0; i < list.length; i += 3) {
          ctx.fillText(list[i], list[i + 1], list[i + 2]);
        }
      }
    };

    const frame = (now) => {
      rafId = requestAnimationFrame(frame);
      if (now - lastFrame < FRAME_MS) return;
      lastFrame = now;
      draw(now);
    };

    const startLoop = () => {
      if (running || reduceMotion || !visible || document.hidden) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    const onResize = () => {
      resize();
      draw(performance.now());
    };

    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onPointerLeave = () => {
      mouse.x = mouse.y = -1000;
    };
    const onVisibility = () => (document.hidden ? stopLoop() : startLoop());

    resize();
    draw(performance.now());
    startLoop();

    // Glyph metrics change once the webfont arrives
    document.fonts?.ready.then(onResize);

    const ro = new ResizeObserver(onResize);
    ro.observe(canvas);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) startLoop();
      else stopLoop();
    });
    io.observe(canvas);

    // Re-read the accent colour when the theme changes
    const mo = new MutationObserver(() => {
      rgb = readAccent();
      draw(performance.now());
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Listen on the hero section: the canvas itself sits under the content
    const host = canvas.closest("section") || canvas.parentElement;
    if (!reduceMotion) {
      host.addEventListener("pointermove", onPointerMove);
      host.addEventListener("pointerleave", onPointerLeave);
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopLoop();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`w-full h-full block ${className}`}
    />
  );
};
