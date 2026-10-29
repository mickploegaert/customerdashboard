/**
 * App configuration read from environment variables.
 * Only NEXT_PUBLIC_* variables are available in the browser.
 *
 * Modes:
 * - Demo mode (NEXT_PUBLIC_DEMO_MODE=true): fictional data, stored in the browser.
 * - Live + Supabase: real providers, CRM in Supabase.
 * - Live without Supabase: OpenStreetMap search + local CRM in the browser.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseEnabled = !isDemoMode && Boolean(supabaseUrl && supabaseAnonKey);

export type DataMode = "demo" | "local" | "supabase";
export const dataMode: DataMode = isDemoMode ? "demo" : isSupabaseEnabled ? "supabase" : "local";
