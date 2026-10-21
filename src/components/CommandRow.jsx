import React from "react";

// One row of the sidebar control list: label on the left, state on the right.
// On phones the rows sit two per line and the icon alone carries the state.
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
    className={`fx-press flex items-center justify-between gap-3 h-10 px-3 border font-mono text-xs transition-colors disabled:opacity-50 ${
      tone === "warn"
        ? "border-warn/50 text-warn hover:bg-warn/10"
        : "border-line text-ink hover:border-accent hover:bg-surface"
    }`}
  >
    <span className="flex items-center gap-2.5 min-w-0">
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate">{label}</span>
    </span>
    {state && <span className="hidden lg:inline text-ink-2">{state}</span>}
  </button>
);
