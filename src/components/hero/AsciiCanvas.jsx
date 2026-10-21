import React, { useEffect, useRef } from "react";
import { createScene } from "./scenes";
import { getMotion } from "../../services/motion";

// Characters ordered from faint to dense
const RAMP = " .:-=+*xX#%@";
const FRAME_MS = 1000 / 30;
const ALPHA_BUCKETS = 8;

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
 * Draws an ASCII scene (see ./scenes) on a <canvas>. Capped at ~30fps, paused
 * when off-screen or when the tab is hidden, and a still frame unless the
 * motion level is "full". `interactive` lets the cursor brighten glyphs and
 * clicks reach the scene; `fontSize` overrides the glyph size (previews).
 */
export const AsciiCanvas = ({
  sceneId,
  fontSize,
  interactive = true,
  className = "",
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scene = createScene(sceneId);
    const out = { alpha: 1, glyph: null };

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

    const isAnimated = () => getMotion() === "full";

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
      fontPx = fontSize ?? (width < 640 ? 14 : 11);
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
      scene.prepare(t, cols, rows);

      ctx.clearRect(0, 0, width, height);
      ctx.font = `${fontPx}px ${readFont()}`;
      ctx.textBaseline = "top";
      buckets.forEach((b) => (b.length = 0));

      const mouseCol = mouse.x / cellW;
      const mouseRow = mouse.y / cellH;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          out.alpha = 1;
          out.glyph = null;
          let level = scene.cell(c, r, out);
          if (!(level > 0)) continue;

          // Cursor: brighten nearby glyphs
          const dx = c - mouseCol;
          const dy = (r - mouseRow) * 1.8;
          const d2 = dx * dx + dy * dy;
          if (d2 < 120) level += (1 - d2 / 120) * 0.45;

          level = Math.min(level, 1);
          const ch = out.glyph ?? RAMP[Math.round(level * (RAMP.length - 1))];
          if (ch === " ") continue;

          const alpha = Math.min(out.alpha * (0.5 + level * 0.7), 1);
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
      if (running || !isAnimated() || !visible || document.hidden) return;
      running = true;
      rafId = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    // A still frame stays put; a running loop redraws on its own
    const redrawIfStill = () => {
      if (!running) draw(isAnimated() ? performance.now() : start);
    };

    const onResize = () => {
      resize();
      redrawIfStill();
    };

    const toCell = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onPointerMove = (e) => {
      const p = toCell(e);
      mouse.x = p.x;
      mouse.y = p.y;
    };
    const onPointerLeave = () => {
      mouse.x = mouse.y = -1000;
    };
    const onPointerDown = (e) => {
      if (!scene.addSource || !cellW) return;
      const p = toCell(e);
      scene.addSource(p.x / cellW, p.y / cellH);
      redrawIfStill();
    };
    const onVisibility = () => (document.hidden ? stopLoop() : startLoop());

    resize();
    draw(start);
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

    // Theme changes recolour; motion changes start or freeze the loop
    const mo = new MutationObserver(() => {
      rgb = readAccent();
      if (isAnimated()) startLoop();
      else stopLoop();
      redrawIfStill();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-motion"],
    });

    // Listen on the hero section: the canvas itself sits under the content
    const host = canvas.closest("section") || canvas.parentElement;
    if (interactive) {
      host.addEventListener("pointermove", onPointerMove);
      host.addEventListener("pointerleave", onPointerLeave);
      host.addEventListener("pointerdown", onPointerDown);
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopLoop();
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [sceneId, fontSize, interactive]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`w-full h-full block ${className}`}
    />
  );
};
