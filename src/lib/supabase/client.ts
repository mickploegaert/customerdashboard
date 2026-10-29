"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "../config";

let client: SupabaseClient | null = null;

/** Browser Supabase client. Uses the public anon key – RLS protects the data. */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (!client) client = createBrowserClient(supabaseUrl, supabaseAnonKey);
  return client;
}
