import { createClient } from "@supabase/supabase-js"; 
 
let client = null; 
 
export function getSupabase() { 
  if (client) return client; 
  const url = process.env.SUPABASE_URL; 
  const key = process.env.SUPABASE_ANON_KEY; 
  if (!url || !key) return null; 
  client = createClient(url, key); 
  return client; 
} 
 
export function isSupabaseConfigured() { 
  const url = process.env.SUPABASE_URL; 
  const key = process.env.SUPABASE_ANON_KEY; 
  return !!(url && key); 
} 
