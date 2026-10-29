import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/format";

/** Large KPI card for the most important numbers. */
export function StatCard({
  label,
  value,
  icon,
  sub,
  hint,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  sub?: ReactNode;
  hint?: string;
  tone?: "default" | "hot" | "accent" | "success";
}) {
  const iconTone = {
    default: "bg-tint text-muted",
    hot: "bg-hot/10 text-hot",
    accent: "bg-accent-soft text-accent-text",
    success: "bg-success/10 text-success",
  }[tone];

  return (
    <Card className="p-5 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
        </div>
        <span className={cn("flex size-10 items-center justify-center rounded-xl", iconTone)}>{icon}</span>
      </div>
      {(sub || hint) && (
        <div className="mt-3 flex items-center gap-2 text-xs text-subtle">
          {sub}
          {hint && (
            <Tooltip content={hint}>
              <span className="cursor-help underline decoration-dotted underline-offset-2">Estimated</span>
            </Tooltip>
          )}
        </div>
      )}
    </Card>
  );
}

/** Compact row of secondary numbers. */
export function MiniStats({ items }: { items: { label: string; value: ReactNode; icon: ReactNode }[] }) {
  return (
    <Card className="grid grid-cols-1 divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3 px-5 py-4">
          <span className="text-subtle">{item.icon}</span>
          <span className="flex-1 text-sm text-muted">{item.label}</span>
          <span className="text-lg font-semibold tabular-nums">{item.value}</span>
        </div>
      ))}
    </Card>
  );
}
