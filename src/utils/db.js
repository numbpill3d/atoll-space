/**
 * db.js — supabase client singleton
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL  = import.meta.env?.VITE_SUPABASE_URL  ?? '';
const SUPABASE_ANON = import.meta.env?.VITE_SUPABASE_ANON ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('[atoll] supabase env vars not set — running in demo mode');
}

export const db = createClient(SUPABASE_URL, SUPABASE_ANON);
