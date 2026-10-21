import { useLayoutEffect, useRef } from "react";
import { getMotion } from "../services/motion";

const DURATION_MS = 450;
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

/**
 * Glides list items to their new places when the list re-orders or an item
 * above grows (FLIP: compare each item's previous and new offsetTop, then
 * animate the difference away). Items are the container's direct children
 * with a data-flip-id. Only at the "full" motion level.
 */
export const useFlipList = (containerRef) => {
  const positions = useRef(new Map());

  // Runs after every render: positions can change from a re-sort, a filter,
  // a deleted row or an expanded panel, and measuring a list is cheap
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      positions.current = new Map();
      return;
    }
    const animate = getMotion() === "full";
    const next = new Map();

    for (const el of container.querySelectorAll(":scope > [data-flip-id]")) {
      const id = el.dataset.flipId;
      const top = el.offsetTop; // layout position, unaffected by transforms
      next.set(id, top);
      const prev = positions.current.get(id);
      if (animate && prev !== undefined && prev !== top) {
        el.animate(
          [
            { transform: `translateY(${prev - top}px)` },
            { transform: "translateY(0)" },
          ],
          { duration: DURATION_MS, easing: EASING },
        );
      }
    }
    positions.current = next;
  });
};
