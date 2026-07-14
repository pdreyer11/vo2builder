// Browser Supabase client (anon key). Safe to use in client components.
// Reads are also served through the app's own /api routes, so this is provided
// for completeness / future realtime use.

"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
