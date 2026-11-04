import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig } from "./config";

// Per-request memoised: the dashboard layout and page both need the signed-in user and
// profile, and each would otherwise make its own round trip to Supabase.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return error ? null : user;
});

export const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  return supabase.from("profiles").select("display_name,currency").eq("id", userId).maybeSingle();
});

export async function createClient(): Promise<SupabaseClient<Database, "public">> {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  const cookieStore = await cookies();
  return createServerClient<Database, "public">(config.url, config.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // The library's no-store cache headers (second argument) aren't applied here: next/headers can't set
      // response headers, and these cookie writes only happen in server actions and route handlers, whose
      // responses are dynamic and never CDN-cached. The proxy applies them to session refreshes.
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot write cookies; the proxy refreshes sessions.
        }
      },
    },
  });
}
