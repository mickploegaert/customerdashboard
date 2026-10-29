import { FlaskConical, HardDrive } from "lucide-react";
import { dataMode } from "@/lib/config";

/** Always visible when data is not real/shared, so it's clear what you're looking at. */
export function DemoBanner() {
  if (dataMode === "demo") {
    return (
      <div className="flex items-center justify-center gap-2 border-b border-accent/20 bg-accent-soft px-4 py-1.5 text-center text-xs text-accent-text">
        <FlaskConical className="size-3.5 shrink-0" />
        <span>
          <strong className="font-semibold tracking-wide">DEMO</strong>
          <span className="text-accent-text/80"> · Verzonnen bedrijven. Gegevens staan alleen in deze browser.</span>
        </span>
      </div>
    );
  }
  if (dataMode === "local") {
    return (
      <div className="flex items-center justify-center gap-2 border-b border-warm/20 bg-warm/10 px-4 py-1.5 text-center text-xs text-warm">
        <HardDrive className="size-3.5 shrink-0" />
        <span>Leads en notities staan alleen in deze browser. Nog geen cloud-opslag.</span>
      </div>
    );
  }
  return null;
}
