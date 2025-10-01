// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

// If you don't have a Database type generated from Supabase yet,
// you can leave this untyped or add your own placeholder type.
// import type { Database } from "./types"; ❌ REMOVE THIS

// Instead, we’ll just let Supabase infer (or you can add a placeholder)
type Database = any;

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);
