"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CalendarClock, Menu, Search } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { FOLLOW_UP_LABEL } from "@/lib/constants";
import { formatDate, isSameDay } from "@/lib/format";
import { nextFollowUp, useLeadStore } from "@/lib/store/LeadStore";

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const router = useRouter();
  const { leads, settings } = useLeadStore();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Notifications = follow-ups that are due today or overdue.
  const now = new Date();
  const due = (settings.notifyFollowUps ? leads : [])
    .map((lead) => ({ lead, followUp: nextFollowUp(lead) }))
    .filter(({ followUp }) => followUp && (new Date(followUp.dueAt) < now || isSameDay(new Date(followUp.dueAt), now)))
    .slice(0, 6);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/leads?q=${encodeURIComponent(q)}` : "/leads");
  }

  return (
    <header className="sticky top-0 z-[800] flex h-[4.25rem] items-center gap-3 border-b border-line bg-canvas/80 px-4 backdrop-blur-md sm:px-8">
      <button onClick={onOpenMenu} className="rounded-md p-1.5 text-muted hover:bg-hover hover:text-fg lg:hidden" aria-label="Menu openen">
        <Menu className="size-5" />
      </button>

      <form onSubmit={onSubmit} className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek op naam, plaats of branche…"
          className="h-9 w-full rounded-lg border border-line bg-surface pr-3 pl-9 text-sm placeholder:text-subtle focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </form>

      <div className="ml-auto flex items-center gap-1.5">
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setOpen((v) => !v)}
            className="relative rounded-lg p-2 text-muted transition-colors hover:bg-hover hover:text-fg"
            aria-label="Meldingen"
          >
            <Bell className="size-[18px]" />
            {due.length > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-accent ring-2 ring-canvas" />}
          </button>
          {open && (
            <div className="absolute right-0 mt-2 w-80 animate-scale-in rounded-xl border border-line-strong bg-elevated shadow-2xl">
              <div className="border-b border-line px-4 py-3">
                <p className="text-sm font-semibold">Meldingen</p>
                <p className="text-xs text-subtle">Opvolging voor vandaag of te laat</p>
              </div>
              {due.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-subtle">Niets open.</p>
              ) : (
                <ul className="max-h-80 overflow-y-auto py-1">
                  {due.map(({ lead, followUp }) => (
                    <li key={lead.business.id}>
                      <Link
                        href={`/leads/${lead.business.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 px-4 py-2.5 hover:bg-hover"
                      >
                        <CalendarClock className="mt-0.5 size-4 text-accent-text" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm">{lead.business.name}</span>
                          <span className="block text-xs text-subtle">
                            {FOLLOW_UP_LABEL[followUp!.type]} · {formatDate(followUp!.dueAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <Link href="/settings" className="ml-1 flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-hover" aria-label="Profiel">
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-700 text-xs font-semibold text-white">
            {settings.userName.slice(0, 1).toUpperCase()}
          </span>
          <span className="hidden text-sm text-muted sm:inline">{settings.userName}</span>
        </Link>
      </div>
    </header>
  );
}
