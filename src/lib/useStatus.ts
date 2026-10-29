"use client";

import { useEffect, useState } from "react";
import type { DataMode } from "./config";

export interface IntegrationStatus {
  mode: DataMode;
  demo: boolean;
  supabase: boolean;
  supabaseServiceRole: boolean;
  googlePlaces: boolean;
  geoapify: boolean;
  openStreetMap: boolean;
  websiteAnalyzer: boolean;
  pageSpeed: boolean;
  ai: boolean;
  aiProvider: "openai" | "facts" | "none";
}

let cached: Promise<IntegrationStatus | null> | null = null;

/** Loads /api/status once per page load. */
export function useIntegrationStatus(): IntegrationStatus | null {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  useEffect(() => {
    cached ??= fetch("/api/status")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
    cached.then(setStatus);
  }, []);
  return status;
}
