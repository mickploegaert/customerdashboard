"use client";

import { dataMode } from "../config";
import { createDemoCrm } from "../demo/demoCrm";
import { DEMO_BUSINESSES, toBusiness } from "../demo/demoBusinesses";
import { getInitialDemoAudits } from "../providers/demo/demoBusinessProvider";
import { mergeSettings } from "../settings";
import { getSupabaseBrowserClient } from "../supabase/client";
import { rowToAudit, rowToBusiness, rowToCrm, rowToSearch, type Row } from "../supabase/mappers";
import type {
  AppSettings,
  Business,
  CrmRecord,
  FollowUp,
  LeadContact,
  LeadNote,
  LeadStatus,
  LeadAiAnalysis,
  SearchHistoryEntry,
  WebsiteAudit,
} from "../types";

/**
 * Where the CRM data is stored.
 *
 * - localPersistence:    browser localStorage (demo mode, or live mode without Supabase)
 * - supabasePersistence: Supabase tables, protected by Row Level Security
 *
 * The store always updates its in-memory state first (instant UI) and then
 * calls these functions to save the change.
 */

export interface StoreState {
  businesses: Record<string, Business>;
  audits: Record<string, WebsiteAudit>;
  crm: Record<string, CrmRecord>;
  searches: SearchHistoryEntry[];
  settings: AppSettings;
}

export interface LeadFields {
  status?: LeadStatus;
  starred?: boolean;
  savedAt?: string | null;
  wonAt?: string | null;
  aiAnalysis?: LeadAiAnalysis | null;
}

export interface Persistence {
  load(): Promise<StoreState>;
  /** Local mode saves the full state after each change. */
  snapshot(state: StoreState): void;
  /** Makes sure lead rows exist. Returns businessId -> leadId. */
  ensureLeads(businessIds: string[]): Promise<Record<string, string>>;
  updateLead(leadId: string, fields: LeadFields): Promise<void>;
  addNote(leadId: string, note: LeadNote): Promise<void>;
  deleteNote(noteId: string): Promise<void>;
  addContact(leadId: string, contact: LeadContact): Promise<void>;
  addFollowUp(leadId: string, followUp: FollowUp): Promise<void>;
  completeFollowUp(followUpId: string): Promise<void>;
  saveSettings(settings: AppSettings): Promise<void>;
  addSearch(entry: SearchHistoryEntry): Promise<void>;
}

// ---------------------------------------------------------------------------
// Local (browser) persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = dataMode === "demo" ? "mkstudios.demo.v2" : "mkstudios.local.v2";

export function createInitialState(): StoreState {
  if (dataMode === "demo") {
    return {
      businesses: Object.fromEntries(DEMO_BUSINESSES.map((b) => [b.id, toBusiness(b)])),
      audits: Object.fromEntries(getInitialDemoAudits().map((a) => [a.businessId, a])),
      crm: createDemoCrm(),
      searches: [],
      settings: mergeSettings(null),
    };
  }
  return { businesses: {}, audits: {}, crm: {}, searches: [], settings: mergeSettings(null) };
}

const noop = async () => {};

const localPersistence: Persistence = {
  async load() {
    const initial = createInitialState();
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return initial;
      const saved = JSON.parse(raw) as Partial<StoreState>;
      return {
        businesses: { ...initial.businesses, ...saved.businesses },
        audits: { ...initial.audits, ...saved.audits },
        crm: saved.crm ?? initial.crm,
        searches: saved.searches ?? [],
        settings: mergeSettings(saved.settings),
      };
    } catch {
      return initial;
    }
  },
  snapshot(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or disabled – the app keeps working in memory.
    }
  },
  ensureLeads: async () => ({}),
  updateLead: noop,
  addNote: noop,
  deleteNote: noop,
  addContact: noop,
  addFollowUp: noop,
  completeFollowUp: noop,
  saveSettings: noop,
  addSearch: noop,
};

// ---------------------------------------------------------------------------
// Supabase persistence
// ---------------------------------------------------------------------------

async function check<T extends { error: { message: string } | null }>(promise: PromiseLike<T>): Promise<T> {
  const result = await promise;
  if (result.error) throw new Error(result.error.message);
  return result;
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const supabasePersistence: Persistence = {
  async load() {
    const sb = getSupabaseBrowserClient();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) throw new Error("Not signed in");

    const [leadsRes, profileRes, searchesRes] = await Promise.all([
      check(
        sb
          .from("leads")
          .select("*, business:businesses(*), lead_notes(*), lead_contacts(*), follow_ups(*)")
          .order("created_at", { ascending: false })
          .limit(5000),
      ),
      check(sb.from("profiles").select("*").eq("id", auth.user.id).maybeSingle()),
      check(sb.from("searches").select("*").order("created_at", { ascending: false }).limit(30)),
    ]);

    const businesses: StoreState["businesses"] = {};
    const crm: StoreState["crm"] = {};
    for (const row of (leadsRes.data ?? []) as Row[]) {
      if (!row.business) continue;
      businesses[row.business.id] = rowToBusiness(row.business);
      crm[row.business.id] = rowToCrm(row);
    }

    // Latest audit per business.
    const audits: StoreState["audits"] = {};
    for (const ids of chunk(Object.keys(businesses), 150)) {
      const { data } = await check(sb.from("website_audits").select("*").in("business_id", ids).order("analyzed_at", { ascending: false }));
      for (const row of (data ?? []) as Row[]) {
        if (!audits[row.business_id]) audits[row.business_id] = rowToAudit(row);
      }
    }

    const profile = profileRes.data as Row | null;
    const settings = mergeSettings({
      ...(profile?.settings ?? {}),
      userName: profile?.full_name || profile?.settings?.userName || auth.user.email?.split("@")[0] || "",
      email: auth.user.email ?? "",
    });

    return { businesses, audits, crm, searches: ((searchesRes.data ?? []) as Row[]).map(rowToSearch), settings };
  },

  snapshot() {},

  async ensureLeads(businessIds) {
    if (businessIds.length === 0) return {};
    const sb = getSupabaseBrowserClient();
    const map: Record<string, string> = {};
    for (const ids of chunk(businessIds, 150)) {
      await check(sb.from("leads").upsert(ids.map((business_id) => ({ business_id })), { onConflict: "user_id,business_id", ignoreDuplicates: true }));
      const { data } = await check(sb.from("leads").select("id, business_id").in("business_id", ids));
      for (const row of (data ?? []) as Row[]) map[row.business_id] = row.id;
    }
    return map;
  },

  async updateLead(leadId, fields) {
    const row: Row = {};
    if (fields.status !== undefined) row.status = fields.status;
    if (fields.starred !== undefined) row.starred = fields.starred;
    if (fields.savedAt !== undefined) row.saved_at = fields.savedAt;
    if (fields.wonAt !== undefined) row.won_at = fields.wonAt;
    if (fields.aiAnalysis !== undefined) row.ai_analysis = fields.aiAnalysis;
    await check(getSupabaseBrowserClient().from("leads").update(row).eq("id", leadId));
  },

  async addNote(leadId, note) {
    await check(getSupabaseBrowserClient().from("lead_notes").insert({ id: note.id, lead_id: leadId, body: note.body, created_at: note.createdAt }));
  },

  async deleteNote(noteId) {
    await check(getSupabaseBrowserClient().from("lead_notes").delete().eq("id", noteId));
  },

  async addContact(leadId, c) {
    await check(
      getSupabaseBrowserClient().from("lead_contacts").insert({ id: c.id, lead_id: leadId, channel: c.channel, note: c.note, contacted_at: c.contactedAt }),
    );
  },

  async addFollowUp(leadId, f) {
    await check(getSupabaseBrowserClient().from("follow_ups").insert({ id: f.id, lead_id: leadId, type: f.type, due_at: f.dueAt, done: f.done }));
  },

  async completeFollowUp(followUpId) {
    await check(getSupabaseBrowserClient().from("follow_ups").update({ done: true, completed_at: new Date().toISOString() }).eq("id", followUpId));
  },

  async saveSettings(settings) {
    const sb = getSupabaseBrowserClient();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return;
    const { email: _email, ...rest } = settings;
    await check(sb.from("profiles").update({ full_name: settings.userName.slice(0, 100), settings: rest }).eq("id", auth.user.id));
  },

  async addSearch(entry) {
    await check(
      getSupabaseBrowserClient().from("searches").insert({
        id: entry.id,
        filters: entry.filters,
        result_count: entry.resultCount,
        provider: entry.provider,
        created_at: entry.createdAt,
      }),
    );
  },
};

export const persistence: Persistence = dataMode === "supabase" ? supabasePersistence : localPersistence;
