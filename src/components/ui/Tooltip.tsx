import type { ReactNode } from "react";

/** Lightweight CSS-only tooltip (shows on hover and keyboard focus). */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-md border border-line-strong bg-elevated px-2 py-1 text-xs text-muted opacity-0 shadow-lg transition-opacity duration-150 group-focus-within/tip:opacity-100 group-hover/tip:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
