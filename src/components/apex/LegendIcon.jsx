import React, { useState } from "react";
import { getLegendAssets } from "../../services/apexAssets";

/**
 * Square legend portrait from the icon URLs the API sends; the legend's
 * initial when no icon has been seen yet or it fails to load.
 * className sets the size and border colour.
 */
export const LegendIcon = ({ legend, className = "size-10 border-line" }) => {
  const icon = getLegendAssets(legend)?.icon;
  const [failedSrc, setFailedSrc] = useState(null);

  if (!icon || failedSrc === icon) {
    return (
      <span
        aria-hidden="true"
        className={`${className} inline-flex items-center justify-center rounded-sm border bg-surface-3 font-display text-ink-2 shrink-0 select-none`}
      >
        {(legend || "?").charAt(0)}
      </span>
    );
  }

  return (
    <img
      src={icon}
      alt=""
      onError={() => setFailedSrc(icon)}
      className={`${className} rounded-sm border object-cover bg-surface-3 shrink-0`}
    />
  );
};
