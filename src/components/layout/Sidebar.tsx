"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, X } from "lucide-react";
import { cn } from "@/lib/format";
import { useLeadStore } from "@/lib/store/LeadStore";
import { Logo } from "./Logo";
import { isActive, NAV_GROUPS } from "./navigation";

export function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { leads, settings } = useLeadStore();
  const counts: Record<string, number> = {
    "/saved": leads.filter((l) => l.crm.starred).length,
    "/leads": leads.length,
  };

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {/* Backdrop for the mobile drawer */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-[900] bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-[950] flex w-64 flex-col border-r border-line bg-surface transition-transform duration-200 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-[4.25rem] items-center justify-between border-b border-line px-4">
          <Link href="/" onClick={onClose}>
            <Logo />
          </Link>
          <button onClick={onClose} className="rounded-md p-1 text-subtle hover:text-fg lg:hidden" aria-label="Menu sluiten">
            <X className="size-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-wider text-subtle uppercase">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  const count = counts[item.href];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                        active ? "bg-accent-soft font-medium text-fg" : "text-muted hover:bg-hover hover:text-fg",
                      )}
                    >
                      {active && <span className="absolute top-2 bottom-2 left-0 w-0.5 rounded-full bg-accent" />}
                      <Icon className={cn("size-4", active ? "text-accent-text" : "text-subtle group-hover:text-muted")} />
                      <span className="flex-1">{item.label}</span>
                      {count > 0 && <span className="rounded-md bg-tint px-1.5 text-[11px] text-subtle tabular-nums">{count}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Link href="/settings" onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-sm font-semibold text-white">
                {(settings.userName || "M").slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{settings.userName || "Account"}</span>
                <span className="block truncate text-xs text-subtle">{settings.email || "admin"}</span>
              </span>
            </Link>
            <button onClick={signOut} className="rounded-md p-1.5 text-subtle hover:bg-hover hover:text-fg" aria-label="Uitloggen" title="Uitloggen">
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
