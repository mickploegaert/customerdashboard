"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dataMode } from "../config";
import { createId } from "../format";
import { buildLead, emptyCrmRecord, isSameBusiness } from "../leads";
import { DEFAULT_SETTINGS } from "../settings";
import type {
  AppSettings,
  Business,
  ContactChannel,
  CrmRecord,
  FollowUpType,
  Lead,
  LeadAiAnalysis,
  LeadStatus,
  SearchFilters,
  SearchHistoryEntry,
  SearchResponse,
  WebsiteAudit,
} from "../types";
import { createInitialState, persistence, type LeadFields, type StoreState } from "./persistence";

/**
 * Central client-side store for leads and CRM data.
 *
 * Every action updates the in-memory state first (so the UI is instant) and
 * then saves the change via `persistence` (localStorage or Supabase).
 * Save errors are shown to the user via `syncError`.
 */

interface LeadStoreValue {
  ready: boolean;
  loadError: string | null;
  syncError: string | null;
  dismissSyncError: () => void;
  leads: Lead[];
  searches: SearchHistoryEntry[];
  settings: AppSettings;
  getLead: (id: string) => Lead | undefined;
  toggleStar: (id: string) => void;
  setStatus: (id: string, status: LeadStatus) => void;
  addNote: (id: string, body: string) => void;
  deleteNote: (id: string, noteId: string) => void;
  logContact: (id: string, input: { channel: ContactChannel; note: string; followUpAt?: string; followUpType?: FollowUpType }) => void;
  addFollowUp: (id: string, type: FollowUpType, dueAt: string) => void;
  completeFollowUp: (id: string, followUpId: string) => void;
  saveAudit: (audit: WebsiteAudit) => void;
  saveAiAnalysis: (id: string, analysis: LeadAiAnalysis) => void;
  /** Adds search results to the store (duplicates are merged) and records the search. Returns lead IDs. */
  addSearchResults: (filters: SearchFilters, response: SearchResponse) => Promise<string[]>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  resetDemoData: () => void;
}

const LeadStoreContext = createContext<LeadStoreValue | null>(null);

export function LeadStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoreState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const stateRef = useRef<StoreState | null>(null);
  stateRef.current = state;

  useEffect(() => {
    persistence
      .load()
      .then(setState)
      .catch((e: Error) => {
        // "Not signed in" is expected on the login page – middleware handles redirects.
        if (e.message !== "Not signed in") setLoadError(e.message);
        setState(createInitialState());
      });
  }, []);

  // Local mode: save a full snapshot after every change.
  useEffect(() => {
    if (state) persistence.snapshot(state);
  }, [state]);

  /** Runs a save in the background and reports failures. */
  const sync = useCallback((task: () => Promise<unknown>) => {
    task().catch((e: Error) => setSyncError(`Could not save change: ${e.message}`));
  }, []);

  /** Gets (or creates) the database lead id for a business – Supabase mode only. */
  const leadIdFor = useCallback(async (businessId: string): Promise<string | null> => {
    if (dataMode !== "supabase") return null;
    const existing = stateRef.current?.crm[businessId]?.leadId;
    if (existing) return existing;
    const map = await persistence.ensureLeads([businessId]);
    const leadId = map[businessId] ?? null;
    if (leadId) {
      setState((prev) =>
        prev ? { ...prev, crm: { ...prev.crm, [businessId]: { ...(prev.crm[businessId] ?? emptyCrmRecord()), leadId } } } : prev,
      );
    }
    return leadId;
  }, []);

  const updateCrm = useCallback((id: string, update: (record: CrmRecord) => CrmRecord) => {
    setState((prev) => {
      if (!prev) return prev;
      const current = prev.crm[id] ?? emptyCrmRecord();
      return { ...prev, crm: { ...prev.crm, [id]: { ...update(current), updatedAt: new Date().toISOString() } } };
    });
  }, []);

  const saveLeadFields = useCallback(
    (id: string, fields: LeadFields) =>
      sync(async () => {
        const leadId = await leadIdFor(id);
        if (leadId) await persistence.updateLead(leadId, fields);
      }),
    [sync, leadIdFor],
  );

  const settings = state?.settings ?? DEFAULT_SETTINGS;

  const leads = useMemo(() => {
    if (!state) return [];
    return Object.values(state.businesses).map((b) =>
      buildLead(b, state.audits[b.id] ?? null, state.crm[b.id] ?? emptyCrmRecord(), state.settings.scoring),
    );
  }, [state]);

  const leadById = useMemo(() => new Map(leads.map((l) => [l.business.id, l])), [leads]);

  // Debounced settings save (settings inputs change on every keystroke).
  const settingsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const value: LeadStoreValue = {
    ready: state !== null,
    loadError,
    syncError,
    dismissSyncError: () => setSyncError(null),
    leads,
    searches: state?.searches ?? [],
    settings,
    getLead: (id) => leadById.get(id),

    toggleStar: (id) => {
      const current = stateRef.current?.crm[id] ?? emptyCrmRecord();
      const starred = !current.starred;
      // Saving a brand-new lead moves it to "Saved" in the pipeline.
      const status: LeadStatus = starred && current.status === "new" ? "saved" : current.status;
      const savedAt = starred ? new Date().toISOString() : current.savedAt;
      updateCrm(id, (r) => ({ ...r, starred, status, savedAt }));
      saveLeadFields(id, { starred, status, savedAt });
    },

    setStatus: (id, status) => {
      const current = stateRef.current?.crm[id] ?? emptyCrmRecord();
      const wonAt = status === "won" ? (current.wonAt ?? new Date().toISOString()) : current.wonAt;
      updateCrm(id, (r) => ({ ...r, status, wonAt }));
      saveLeadFields(id, { status, wonAt });
    },

    addNote: (id, body) => {
      const note = { id: createId(), body: body.trim().slice(0, 5000), createdAt: new Date().toISOString() };
      if (!note.body) return;
      updateCrm(id, (r) => ({ ...r, notes: [note, ...r.notes] }));
      sync(async () => {
        const leadId = await leadIdFor(id);
        if (leadId) await persistence.addNote(leadId, note);
      });
    },

    deleteNote: (id, noteId) => {
      updateCrm(id, (r) => ({ ...r, notes: r.notes.filter((n) => n.id !== noteId) }));
      sync(() => persistence.deleteNote(noteId));
    },

    logContact: (id, { channel, note, followUpAt, followUpType }) => {
      const current = stateRef.current?.crm[id] ?? emptyCrmRecord();
      const contact = { id: createId(), channel, note: note.trim().slice(0, 2000), contactedAt: new Date().toISOString() };
      const followUp = followUpAt ? { id: createId(), type: followUpType ?? "follow_up", dueAt: followUpAt, done: false } : null;
      const status: LeadStatus = ["new", "researching", "saved"].includes(current.status) ? "contacted" : current.status;
      updateCrm(id, (r) => ({
        ...r,
        status,
        contacts: [contact, ...r.contacts],
        followUps: followUp ? [...r.followUps, followUp] : r.followUps,
      }));
      sync(async () => {
        const leadId = await leadIdFor(id);
        if (!leadId) return;
        await persistence.addContact(leadId, contact);
        if (followUp) await persistence.addFollowUp(leadId, followUp);
        if (status !== current.status) await persistence.updateLead(leadId, { status });
      });
    },

    addFollowUp: (id, type, dueAt) => {
      const followUp = { id: createId(), type, dueAt, done: false };
      updateCrm(id, (r) => ({ ...r, followUps: [...r.followUps, followUp] }));
      sync(async () => {
        const leadId = await leadIdFor(id);
        if (leadId) await persistence.addFollowUp(leadId, followUp);
      });
    },

    completeFollowUp: (id, followUpId) => {
      updateCrm(id, (r) => ({ ...r, followUps: r.followUps.map((f) => (f.id === followUpId ? { ...f, done: true } : f)) }));
      sync(() => persistence.completeFollowUp(followUpId));
    },

    // Audits are written to the database by the server (/api/analyze-website).
    saveAudit: (audit) => setState((prev) => (prev ? { ...prev, audits: { ...prev.audits, [audit.businessId]: audit } } : prev)),

    saveAiAnalysis: (id, analysis) => {
      updateCrm(id, (r) => ({ ...r, aiAnalysis: analysis }));
      saveLeadFields(id, { aiAnalysis: analysis });
    },

    addSearchResults: async (filters, response) => {
      const current = stateRef.current;
      if (!current) return [];
      const businesses = { ...current.businesses };
      const audits = { ...current.audits };
      const ids: string[] = [];
      for (const business of response.businesses) {
        // Duplicate detection: reuse the existing record (and its CRM data) when it's the same business.
        const existing = businesses[business.id] ?? Object.values(businesses).find((b) => isSameBusiness(b, business));
        const id = existing?.id ?? business.id;
        businesses[id] = { ...business, id };
        const audit = response.audits.find((a) => a.businessId === business.id);
        if (audit && (!audits[id] || audits[id].analyzedAt < audit.analyzedAt)) audits[id] = { ...audit, businessId: id };
        ids.push(id);
      }

      const entry: SearchHistoryEntry = {
        id: createId(),
        filters,
        resultCount: ids.length,
        provider: response.provider,
        createdAt: new Date().toISOString(),
      };

      // Supabase: create lead rows for the found businesses.
      let leadIds: Record<string, string> = {};
      if (dataMode === "supabase") {
        try {
          leadIds = await persistence.ensureLeads(ids);
        } catch (e) {
          setSyncError(`Could not save leads: ${(e as Error).message}`);
        }
      }

      setState((prev) => {
        if (!prev) return prev;
        const crm = { ...prev.crm };
        for (const id of ids) {
          const record = crm[id] ?? emptyCrmRecord();
          crm[id] = leadIds[id] ? { ...record, leadId: leadIds[id] } : record;
        }
        return { ...prev, businesses: { ...prev.businesses, ...businesses }, audits, crm, searches: [entry, ...prev.searches].slice(0, 30) };
      });
      sync(() => persistence.addSearch(entry));
      return ids;
    },

    updateSettings: (partial) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = { ...prev.settings, ...partial };
        if (settingsTimer.current) clearTimeout(settingsTimer.current);
        settingsTimer.current = setTimeout(() => sync(() => persistence.saveSettings(next)), 600);
        return { ...prev, settings: next };
      });
    },

    resetDemoData: () => setState(createInitialState()),
  };

  return <LeadStoreContext.Provider value={value}>{children}</LeadStoreContext.Provider>;
}

export function useLeadStore(): LeadStoreValue {
  const ctx = useContext(LeadStoreContext);
  if (!ctx) throw new Error("useLeadStore must be used inside <LeadStoreProvider>");
  return ctx;
}

/** Helpers used on several pages. */
export function lastContactedAt(lead: Lead): string | null {
  return lead.crm.contacts.reduce<string | null>((latest, c) => (!latest || c.contactedAt > latest ? c.contactedAt : latest), null);
}

export function nextFollowUp(lead: Lead) {
  return lead.crm.followUps.filter((f) => !f.done).sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0] ?? null;
}
