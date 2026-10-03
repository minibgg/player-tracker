import React, { useEffect } from "react";
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

const ToastItem = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, toast.duration || 4500);

    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const tone = TONES[toast.type] || TONES.info;

  return (
    <div className="pointer-events-auto relative flex items-start gap-3 pl-4 pr-2 py-3 border border-line-strong bg-surface shadow-xl">
      <span
        aria-hidden="true"
        className={`absolute left-0 top-0 bottom-0 w-0.5 ${tone.bar}`}
      />
      <div className="flex-1 min-w-0">
        <div className={`label ${tone.text}`}>
          {tone.tag}
          {toast.title ? ` · ${toast.title}` : ""}
        </div>
        <div className="text-sm text-ink mt-1 break-words">{toast.message}</div>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Закрыть уведомление"
        className="text-ink-2 hover:text-ink p-1 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
