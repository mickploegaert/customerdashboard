import type { ReactNode } from "react";
import { cn } from "@/lib/format";

export type BadgeTone = "neutral" | "accent" | "hot" | "warm" | "success" | "danger" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-tint text-muted border-line-strong",
  accent: "bg-accent-soft text-accent-text border-accent/30",
  hot: "bg-hot/10 text-hot border-hot/30",
  warm: "bg-warm/10 text-warm border-warm/30",
  success: "bg-success/10 text-success border-success/30",
  danger: "bg-danger/10 text-danger border-danger/30",
  info: "bg-info/10 text-info border-info/30",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
  title,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-4 whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
