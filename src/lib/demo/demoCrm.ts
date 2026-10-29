import type { CrmRecord, FollowUpType, LeadStatus } from "../types";

/**
 * FICTIONAL starting CRM data for demo mode, so the pipeline, saved leads and
 * follow-ups are not empty on first launch. Dates are relative to "today".
 */

function daysFromNow(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

interface DemoCrmInput {
  status: LeadStatus;
  starred?: boolean;
  notes?: string[];
  contactedDaysAgo?: number;
  channel?: CrmRecord["contacts"][number]["channel"];
  followUp?: { inDays: number; type: FollowUpType };
}

function record(id: string, input: DemoCrmInput): [string, CrmRecord] {
  return [
    id,
    {
      status: input.status,
      starred: input.starred ?? false,
      notes: (input.notes ?? []).map((body, i) => ({
        id: `${id}-note-${i}`,
        body,
        createdAt: daysFromNow(-(i + 1) * 2),
      })),
      contacts:
        input.contactedDaysAgo !== undefined
          ? [
              {
                id: `${id}-contact-0`,
                channel: input.channel ?? "phone",
                contactedAt: daysFromNow(-input.contactedDaysAgo),
                note: "First contact (demo).",
              },
            ]
          : [],
      followUps: input.followUp
        ? [{ id: `${id}-fu-0`, type: input.followUp.type, dueAt: daysFromNow(input.followUp.inDays), done: false }]
        : [],
      aiAnalysis: null,
      createdAt: daysFromNow(-((input.contactedDaysAgo ?? 0) + 3)),
      savedAt: input.starred ? daysFromNow(-((input.contactedDaysAgo ?? 0) + 1)) : null,
      wonAt: input.status === "won" ? daysFromNow(-2) : null,
      updatedAt: daysFromNow(-1),
    },
  ];
}

export function createDemoCrm(): Record<string, CrmRecord> {
  return Object.fromEntries([
    record("demo-01", {
      status: "contacted",
      starred: true,
      notes: ["Owner seemed open to a website. Busy shop, call before 10:00."],
      contactedDaysAgo: 3,
      followUp: { inDays: 0, type: "call" },
    }),
    record("demo-02", {
      status: "follow_up",
      starred: true,
      notes: ["Website ziet er oud uit.", "Sent example of a detailing site."],
      contactedDaysAgo: 6,
      channel: "instagram",
      followUp: { inDays: 0, type: "email" },
    }),
    record("demo-03", { status: "saved", starred: true }),
    record("demo-07", { status: "researching" }),
    record("demo-09", {
      status: "meeting",
      starred: true,
      notes: ["Eigenaar gesproken. Meeting scheduled."],
      contactedDaysAgo: 8,
      followUp: { inDays: 2, type: "meeting" },
    }),
    record("demo-10", {
      status: "contacted",
      contactedDaysAgo: 2,
      channel: "email",
      followUp: { inDays: 0, type: "follow_up" },
    }),
    record("demo-12", { status: "proposal", starred: true, contactedDaysAgo: 14, channel: "email", notes: ["Ze zijn geïnteresseerd in een nieuwe website."] }),
    record("demo-15", { status: "saved", starred: true }),
    record("demo-16", { status: "contacted", contactedDaysAgo: 5, channel: "phone", followUp: { inDays: 3, type: "call" } }),
    record("demo-19", { status: "won", starred: true, contactedDaysAgo: 30, channel: "phone", notes: ["Deal closed – new site + local SEO."] }),
    record("demo-21", { status: "saved", starred: true, notes: ["Bel volgende week terug."], followUp: { inDays: 5, type: "call" } }),
    record("demo-22", { status: "lost", contactedDaysAgo: 20, channel: "email", notes: ["Not interested this year."] }),
    record("demo-25", { status: "researching" }),
  ]);
}
