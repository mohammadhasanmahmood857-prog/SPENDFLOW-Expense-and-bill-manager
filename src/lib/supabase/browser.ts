"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getSupabaseConfig } from "./config";

let client: SupabaseClient<Database, "public"> | undefined;

export function createClient() {
  if (client) return client;
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase is not configured.");
  client = createBrowserClient<Database, "public">(config.url, config.key);
  return client;
}
