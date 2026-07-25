import { createClient } from "@supabase/supabase-js";

// Fallbacks keep the client constructible when env vars aren't injected yet
// (e.g. Next.js evaluating this module during the build's prerender pass).
// Real values always come from NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY at runtime.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
