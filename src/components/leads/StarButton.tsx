"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/format";
import { useLeadStore } from "@/lib/store/LeadStore";

export function StarButton({ id, starred, className }: { id: string; starred: boolean; className?: string }) {
  const { toggleStar } = useLeadStore();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        toggleStar(id);
      }}
      className={cn("rounded-md p-1 transition-colors hover:bg-hover", starred ? "text-warm" : "text-subtle hover:text-muted", className)}
      aria-label={starred ? "Remove from saved leads" : "Save lead"}
      aria-pressed={starred}
    >
      <Star className={cn("size-4", starred && "fill-warm")} />
    </button>
  );
}
