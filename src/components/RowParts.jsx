import React from "react";
import { formatTimestamp } from "../services/timeFormat";

// Quiet square icon button for a row's action strip; fixed size so the
// strips line up from row to row
export const IconButton = ({
  onClick,
  title,
  active = false,
  danger = false,
  disabled = false,
  children,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={title}
    aria-pressed={active || undefined}
    className={`fx-press inline-flex items-center justify-center size-8 shrink-0 transition-colors disabled:opacity-50 ${
      danger
        ? "text-ink-2 hover:text-danger hover:bg-danger/10"
        : active
          ? "text-accent-ink bg-accent/10"
          : "text-ink-2 hover:text-ink hover:bg-surface-3"
    }`}
  >
    {children}
  </button>
);

export const Divider = () => (
  <span aria-hidden="true" className="w-px h-4 bg-line mx-1 shrink-0" />
);

// Status log: terminal-style lines, newest first
export const StatusLog = ({ history }) =>
  !history || history.length === 0 ? (
    <div className="font-mono text-xs text-ink-2">пока нет записей</div>
  ) : (
    <ol className="font-mono text-xs border-l border-line-strong pl-4 space-y-1 max-h-44 overflow-y-auto">
      {history.map((item, idx) => (
        <li key={idx} className="flex gap-3">
          <time className="text-ink-2 shrink-0 tabular-nums">
            {formatTimestamp(item.timestamp)}
          </time>
          <span
            className={item.status === "IN_GAME" ? "text-success" : "text-ink"}
          >
            {item.message}
          </span>
        </li>
      ))}
    </ol>
  );
