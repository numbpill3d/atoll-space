/**
 * drift edge function
 * runs on a schedule (pg_cron) — moves islands based on shared tag affinity
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SPRING_K    = 0.005;
const REPULSION_C = 4000;
const DAMPING     = 0.85;
const MAX_STEP    = 8;

Deno.serve(async () => {
  const db = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: islands, error } = await db
    .from('islands')
    .select('id, x, y, drops(tags)');

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 500 });
  }

  const mapped = (islands ?? []).map((i: any) => ({
    id:   i.id,
    x:    i.x,
    y:    i.y,
    tags: (i.drops ?? []).flatMap((d: any) => d.tags ?? []),
  }));

  const updated = driftTick(mapped);

  for (const upd of updated) {
    await db.from('islands').update({ x: upd.x, y: upd.y }).eq('id', upd.id);
  }

  return new Response(JSON.stringify({ ticked: updated.length }), { status: 200 });
});

// ── physics ──────────────────────────────────

function driftTick(islands: { id: string; x: number; y: number; tags: string[] }[]) {
  const forces: Record<string, { fx: number; fy: number }> = {};
  for (const i of islands) forces[i.id] = { fx: 0, fy: 0 };

  // spring attraction — shared tags pull islands together
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      const a = islands[i], b = islands[j];
      const shared = countShared(a.tags, b.tags);
      if (shared === 0) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = Math.max(120, 300 - shared * 40);
      const f = SPRING_K * shared * (dist - target);
      const fx = f * dx / dist;
      const fy = f * dy / dist;

      forces[a.id].fx += fx;  forces[a.id].fy += fy;
      forces[b.id].fx -= fx;  forces[b.id].fy -= fy;
    }
  }

  // weak repulsion — all islands push apart
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      const a = islands[i], b = islands[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist2 = dx * dx + dy * dy || 1;
      const dist  = Math.sqrt(dist2);
      const f  = REPULSION_C / dist2;
      const fx = f * dx / dist;
      const fy = f * dy / dist;

      forces[a.id].fx -= fx;  forces[a.id].fy -= fy;
      forces[b.id].fx += fx;  forces[b.id].fy += fy;
    }
  }

  return islands.map(isl => ({
    id: isl.id,
    x:  clamp(isl.x + clamp(forces[isl.id].fx * DAMPING, -MAX_STEP, MAX_STEP), 80, 2920),
    y:  clamp(isl.y + clamp(forces[isl.id].fy * DAMPING, -MAX_STEP, MAX_STEP), 80, 1920),
  }));
}

function countShared(a: string[], b: string[]) {
  const s = new Set(b);
  return a.filter(t => s.has(t)).length;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}
