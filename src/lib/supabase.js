import { createClient } from "@supabase/supabase-js";
import { boundedFetch } from "./request";

// Vite only exposes env vars prefixed VITE_ to the browser bundle. Both names
// are accepted because Supabase renamed the browser key from "anon" to
// "publishable" — whichever your project shows in Settings > API will work.
const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

// This key is meant to be public. It grants nothing on its own — every table
// has Row Level Security enabled (see supabase/schema.sql), so Postgres, not
// this client, decides which rows the signed-in user may read.
export const isSupabaseConfigured = Boolean(url && key);

// Deliberately null rather than throwing when the env vars are missing. The
// marketing site and the portal ship in one app; a missing key should degrade
// the portal to a clear "not configured" message, never take down the
// homepage for every visitor.
export const supabase = isSupabaseConfigured
  ? createClient(url, key, {
      global: { fetch: boundedFetch },
      auth: {
        persistSession: true,      // stay signed in across visits
        autoRefreshToken: true,    // renew before expiry, no surprise logouts
        detectSessionInUrl: true,  // needed for email confirm + password reset links
      },
    })
  : null;
