import React from "react";

// One row of the sidebar control list: label on the left, state on the right
export const CommandRow = ({
  icon: Icon,
  label,
  state,
  onClick,
  title,
  tone = "default",
  disabled = false,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`flex items-center justify-between gap-3 h-10 px-3 border font-mono text-xs transition-colors disabled:opacity-50 ${
      tone === "warn"
        ? "border-warn/50 text-warn hover:bg-warn/10"
        : "border-line text-ink hover:border-accent hover:bg-surface"
    }`}
  >
    <span className="flex items-center gap-2.5">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
    {state && <span className="text-ink-2">{state}</span>}
  </button>
);
