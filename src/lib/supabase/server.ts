import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { readSessionToken, SESSION_COOKIE } from "../auth/session";
import { isSupabaseEnabled, supabaseAnonKey, supabaseUrl } from "../config";

/** Supabase client that acts as the signed-in user (via auth cookies). */
export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component – cookies are refreshed by middleware instead.
        }
      },
    },
  });
}

/**
 * Auth check for API routes.
 * Admin session cookie is always required. Supabase user is optional extra.
 */
export async function getRequestUser(): Promise<{ allowed: boolean; user: User | null }> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSessionToken(token);
  if (!session) return { allowed: false, user: null };

  if (!isSupabaseEnabled) return { allowed: true, user: null };
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return { allowed: true, user: data.user };
}
