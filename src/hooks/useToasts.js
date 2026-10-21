import { useState, useCallback } from "react";

const MAX_TOASTS = 4;
// Errors usually need an action from the user, so they stay up longer
const DURATION_BY_TYPE = { error: 9000, warning: 6500 };
const DEFAULT_DURATION = 4500;

/**
 * addToast(type, message, title?, options?)
 * options: { duration, action: { label, onClick } } — an action button
 * (e.g. "undo") dismisses the toast when clicked.
 */
export const useToasts = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, message, title = "", options = {}) => {
    const { action } = options;
    const duration =
      options.duration ??
      (action ? 7000 : (DURATION_BY_TYPE[type] ?? DEFAULT_DURATION));
    setToasts((prev) => {
      // Collapse identical toasts into one with a counter (never ones with
      // an action: each undo belongs to its own event)
      const dup =
        !action &&
        prev.find(
          (t) =>
            !t.action &&
            t.type === type &&
            t.message === message &&
            t.title === title,
        );
      if (dup) {
        return prev.map((t) =>
          t === dup ? { ...t, count: (t.count || 1) + 1, duration } : t,
        );
      }
      const id = Date.now() + Math.random().toString();
      // Cap how many toasts are on screen; oldest ones are dropped
      return [
        ...prev,
        { id, type, message, title, duration, action, count: 1 },
      ].slice(-MAX_TOASTS);
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
};
