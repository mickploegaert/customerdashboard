import "server-only";

import { getSupabaseAdmin } from "../supabase/admin";
import { auditToRow, businessToRow, rowToAudit, rowToBusiness, type Row } from "../supabase/mappers";
import type { Business, WebsiteAudit } from "../types";

/**
 * Writes shared business data to Supabase (service role, server-only).
 *
 * Duplicate detection: an incoming business is merged into an existing row
 * when it has the same provider ID, website domain or phone number.
 */
export async function persistBusinesses(incoming: Business[]): Promise<{ businesses: Business[]; audits: WebsiteAudit[] }> {
  if (incoming.length === 0) return { businesses: [], audits: [] };
  const admin = getSupabaseAdmin();
  const rows = incoming.map(businessToRow);

  const extIds = [...new Set(rows.map((r) => r.external_id as string))];
  const domains = [...new Set(rows.map((r) => r.website_domain as string | null).filter((d): d is string => Boolean(d)))];
  const phones = [...new Set(rows.map((r) => r.phone_normalized as string | null).filter((p): p is string => Boolean(p)))];
  const cols = "id, source, external_id, website_domain, phone_normalized";

  // Separate .in() queries (no string-built filters) to look up possible duplicates.
  const [byExt, byDomain, byPhone] = await Promise.all([
    admin.from("businesses").select(cols).in("external_id", extIds),
    domains.length ? admin.from("businesses").select(cols).in("website_domain", domains) : Promise.resolve({ data: [], error: null }),
    phones.length ? admin.from("businesses").select(cols).in("phone_normalized", phones) : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [byExt, byDomain, byPhone]) if (r.error) throw new Error(r.error.message);
  const existing = new Map<string, Row>();
  for (const r of [...(byExt.data ?? []), ...(byDomain.data ?? []), ...(byPhone.data ?? [])] as Row[]) existing.set(r.id, r);

  const updates: Row[] = [];
  const inserts: Row[] = [];
  const order: { kind: "update" | "insert"; key: string }[] = [];

  for (const row of rows) {
    const match = [...existing.values()].find(
      (e) =>
        (e.source === row.source && e.external_id === row.external_id) ||
        (row.website_domain && e.website_domain === row.website_domain) ||
        (row.phone_normalized && e.phone_normalized === row.phone_normalized),
    );
    if (match) {
      // Keep the original identity of the existing row; refresh the rest.
      if (!updates.some((u) => u.id === match.id)) updates.push({ ...row, id: match.id, source: match.source, external_id: match.external_id });
      order.push({ kind: "update", key: match.id });
    } else {
      // Also de-duplicate within this batch.
      const dupe = inserts.find(
        (i) =>
          i.external_id === row.external_id ||
          (row.website_domain && i.website_domain === row.website_domain) ||
          (row.phone_normalized && i.phone_normalized === row.phone_normalized),
      );
      if (!dupe) inserts.push(row);
      order.push({ kind: "insert", key: (dupe ?? row).external_id });
    }
  }

  const saved: Row[] = [];
  if (updates.length) {
    const { data, error } = await admin.from("businesses").upsert(updates, { onConflict: "id" }).select();
    if (error) throw new Error(error.message);
    saved.push(...(data ?? []));
  }
  if (inserts.length) {
    const { data, error } = await admin.from("businesses").upsert(inserts, { onConflict: "source,external_id" }).select();
    if (error) throw new Error(error.message);
    saved.push(...(data ?? []));
  }

  const result: Business[] = [];
  const seen = new Set<string>();
  for (const o of order) {
    const row = o.kind === "update" ? saved.find((s) => s.id === o.key) : saved.find((s) => s.external_id === o.key);
    if (row && !seen.has(row.id)) {
      seen.add(row.id);
      result.push(rowToBusiness(row));
    }
  }

  const audits = await latestAudits(result.map((b) => b.id));
  return { businesses: result, audits };
}

export async function latestAudits(businessIds: string[]): Promise<WebsiteAudit[]> {
  if (businessIds.length === 0) return [];
  const { data, error } = await getSupabaseAdmin()
    .from("website_audits")
    .select("*")
    .in("business_id", businessIds)
    .order("analyzed_at", { ascending: false });
  if (error) throw new Error(error.message);
  const latest = new Map<string, WebsiteAudit>();
  for (const row of (data ?? []) as Row[]) if (!latest.has(row.business_id)) latest.set(row.business_id, rowToAudit(row));
  return [...latest.values()];
}

export async function getBusinessById(id: string): Promise<Business | null> {
  const { data, error } = await getSupabaseAdmin().from("businesses").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToBusiness(data) : null;
}

export async function saveAudit(audit: WebsiteAudit): Promise<void> {
  const { error } = await getSupabaseAdmin().from("website_audits").insert(auditToRow(audit));
  if (error) throw new Error(error.message);
}
