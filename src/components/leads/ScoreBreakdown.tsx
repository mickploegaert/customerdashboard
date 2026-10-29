import { cn } from "@/lib/format";
import type { Lead } from "@/lib/types";
import { LeadScoreBadge } from "./LeadBadges";

/** "Why this is a good lead" – shows every factor that contributed to the score. */
export function ScoreBreakdown({ lead }: { lead: Lead }) {
  const { score } = lead;
  const raw = score.factors.reduce((s, f) => s + f.points, 0);

  return (
    <div>
      <ul className="space-y-1.5">
        {score.factors.map((f) => (
          <li key={f.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted">{f.label}</span>
            <span className={cn("font-mono text-xs tabular-nums", f.points >= 0 ? "text-success" : "text-danger")}>
              {f.points >= 0 ? "+" : ""}
              {f.points}
            </span>
          </li>
        ))}
        {score.factors.length === 0 && <li className="text-sm text-subtle">Nog geen scorepunten.</li>}
      </ul>

      {lead.business.website && !lead.audit && (
        <p className="mt-3 rounded-lg border border-line bg-canvas px-3 py-2 text-xs text-subtle">
          De website is nog niet bekeken, dus die punten tellen nog niet mee. Gebruik “Website bekijken”.
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-sm font-medium">
          Leadscore: <span className="tabular-nums">{score.total}/100</span>
          {raw > 100 && <span className="ml-2 text-xs text-subtle">(afgetopt van {raw})</span>}
        </span>
        <LeadScoreBadge score={score} size="sm" />
      </div>
    </div>
  );
}
