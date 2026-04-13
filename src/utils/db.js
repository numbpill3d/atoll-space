/**
 * db.js — supabase client singleton
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = __SUPABASE_URL__  || 'https://placeholder.supabase.co';
const SUPABASE_ANON = __SUPABASE_ANON__ || 'placeholder-anon-key';

if (!__SUPABASE_URL__) {
  console.warn('[atoll] supabase env vars not set — running in demo mode (no backend)');
}

export const db = createClient(SUPABASE_URL, SUPABASE_ANON);
