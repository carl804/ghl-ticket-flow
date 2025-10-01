import { createClient } from "@supabase/supabase-js";

// Instead of importing Database type (not defined in ./types), we’ll just use `any`
// If later you generate supabase types, reintroduce them here.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
