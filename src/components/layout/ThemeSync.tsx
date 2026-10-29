"use client";

import { useEffect } from "react";
import { useLeadStore } from "@/lib/store/LeadStore";
import { applyTheme } from "@/lib/theme";

/** Keeps the page theme in step with the saved setting. */
export function ThemeSync() {
  const { ready, settings } = useLeadStore();

  useEffect(() => {
    if (!ready) return;
    applyTheme(settings.theme);
  }, [ready, settings.theme]);

  return null;
}
