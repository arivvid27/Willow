// lib/supabase.ts — Supabase browser client for Willow

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Singleton for use outside of components
let _client: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!_client) _client = createClient();
  return _client;
}
