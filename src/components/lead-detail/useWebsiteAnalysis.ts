"use client";

import { useState } from "react";
import { useLeadStore } from "@/lib/store/LeadStore";
import type { Lead, WebsiteAudit } from "@/lib/types";

/** Calls the server-side analyzer and stores the result on the lead. */
export function useWebsiteAnalysis(lead: Lead | undefined) {
  const { saveAudit } = useLeadStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyze() {
    if (!lead?.business.website) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-website", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: lead.business.id, url: lead.business.website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      saveAudit(data.audit as WebsiteAudit);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return { analyze, loading, error };
}
