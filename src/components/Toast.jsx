import React, { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div
      className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Left bar colour + label per toast type
const TONES = {
  success: { bar: "bg-success", text: "text-success", tag: "ok" },
  error: { bar: "bg-danger", text: "text-danger", tag: "ошибка" },
  warning: { bar: "bg-warn", text: "text-warn", tag: "внимание" },
  info: { bar: "bg-ink-2", text: "text-ink-2", tag: "инфо" },
};

const EXIT_MS = 200;

const ToastItem = ({ toast, onDismiss }) => {
  // Keep the latest onDismiss in a ref so parent re-renders (e.g. polling
  // updates) don't recreate the callback and restart the timer forever.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(toast.duration || 4500);

  // A new toast object (e.g. a duplicate bumping the counter) resets the timer
  useEffect(() => {
    remainingRef.current = toast.duration || 4500;
  }, [toast]);

  // Auto-dismiss countdown; hovering pauses it and keeps the time left
  useEffect(() => {
    if (paused || leaving) return undefined;
    const startedAt = Date.now();
    const timer = setTimeout(() => setLeaving(true), remainingRef.current);
    return () => {
      clearTimeout(timer);
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (Date.now() - startedAt),
      );
    };
  }, [toast, paused, leaving]);

  // Let the exit animation play before actually removing the toast
  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(() => onDismissRef.current(), EXIT_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  const tone = TONES[toast.type] || TONES.info;

  return (
    <div
      role={toast.type === "error" ? "alert" : undefined}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={`pointer-events-auto relative flex items-start gap-3 pl-4 pr-2 py-3 border border-line-strong bg-surface shadow-xl ${
        leaving ? "toast-leave" : "toast-enter"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 bottom-0 w-0.5 ${tone.bar}`}
      />
      <div className="flex-1 min-w-0">
        <div className={`label ${tone.text}`}>
          {tone.tag}
          {toast.title ? ` · ${toast.title}` : ""}
          {toast.count > 1 ? ` · ×${toast.count}` : ""}
        </div>
        <div className="text-sm text-ink mt-1 break-words">{toast.message}</div>
      </div>
      <button
        type="button"
        onClick={() => setLeaving(true)}
        aria-label="Закрыть уведомление"
        className="text-ink-2 hover:text-ink p-1 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
