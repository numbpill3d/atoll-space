/**
 * db.js — supabase client singleton
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env?.VITE_SUPABASE_URL  || 'https://placeholder.supabase.co';
const SUPABASE_ANON = import.meta.env?.VITE_SUPABASE_ANON || 'placeholder-anon-key';

if (SUPABASE_URL === 'https://placeholder.supabase.co') {
  console.warn('[atoll] supabase env vars not set — running in demo mode (no backend)');
}

export const db = createClient(SUPABASE_URL, SUPABASE_ANON);
