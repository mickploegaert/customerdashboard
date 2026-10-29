"use client";

import { usePathname } from "next/navigation";
import { TriangleAlert, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useLeadStore } from "@/lib/store/LeadStore";
import { DemoBanner } from "./DemoBanner";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

/** Pages that are shown without sidebar/topbar. */
const BARE_PATHS = ["/login"];

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { ready, loadError, syncError, dismissSyncError } = useLeadStore();

  // Close the mobile menu after navigating.
  useEffect(() => setMenuOpen(false), [pathname]);

  if (BARE_PATHS.includes(pathname)) return <main className="min-h-screen">{children}</main>;

  return (
    <div className="min-h-screen">
      <Sidebar mobileOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <DemoBanner />
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        {loadError && (
          <div className="flex items-center gap-2 border-b border-danger/30 bg-danger/10 px-6 py-2 text-sm text-danger">
            <TriangleAlert className="size-4 shrink-0" /> Gegevens laden mislukt: {loadError}
          </div>
        )}
        <main className="flex flex-1 flex-col">
          {ready ? (
            children
          ) : (
            <div className="flex h-[60vh] items-center justify-center">
              <div className="size-5 animate-spin rounded-full border-2 border-line-strong border-t-accent" aria-label="Laden" />
            </div>
          )}
        </main>
      </div>

      {syncError && (
        <div role="alert" className="fixed right-4 bottom-4 z-[1100] flex max-w-sm animate-scale-in items-start gap-3 rounded-xl border border-danger/30 bg-elevated px-4 py-3 text-sm shadow-2xl">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger" />
          <span className="flex-1 text-muted">{syncError}</span>
          <button onClick={dismissSyncError} className="text-subtle hover:text-fg" aria-label="Sluiten">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** Standard page padding + max width. */
export function PageContainer({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  return <div className={wide ? "w-full px-4 py-6 sm:px-8 lg:py-8" : "mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-8 lg:py-8"}>{children}</div>;
}
