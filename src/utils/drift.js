/**
 * drift.js — tag-based island drift algorithm
 *
 * runs as a supabase edge function (or cron job).
 * islands with shared tags are pulled toward each other.
 * all islands have a weak repulsion to prevent collapse.
 *
 * to run locally: `node src/utils/drift.js`
 */

const SPRING_K    = 0.005;  // attraction strength per shared tag
const REPULSION_C = 4000;   // repulsion constant
const DAMPING     = 0.85;   // velocity damping
const MAX_STEP    = 8;       // max position change per tick

/**
 * computes one tick of island drift
 * @param {Array} islands  [{ id, x, y, tags[] }]
 * @returns {Array}        [{ id, x, y }] — updated positions
 */
export function driftTick(islands) {
  const forces = Object.fromEntries(islands.map(i => [i.id, { fx: 0, fy: 0 }]));

  // spring attraction between islands with shared tags
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      const a = islands[i], b = islands[j];
      const sharedCount = countSharedTags(a.tags, b.tags);
      if (sharedCount === 0) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // target distance: farther islands with more shared tags pull harder
      const targetDist = Math.max(120, 300 - sharedCount * 40);
      const stretch    = dist - targetDist;
      const f          = SPRING_K * sharedCount * stretch;
      const fx = (f * dx / dist);
      const fy = (f * dy / dist);

      forces[a.id].fx += fx;
      forces[a.id].fy += fy;
      forces[b.id].fx -= fx;
      forces[b.id].fy -= fy;
    }
  }

  // weak repulsion between all islands
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

      forces[a.id].fx -= fx;
      forces[a.id].fy -= fy;
      forces[b.id].fx += fx;
      forces[b.id].fy += fy;
    }
  }

  // integrate positions
  return islands.map(isl => {
    const f  = forces[isl.id];
    const dx = clamp(f.fx * DAMPING, -MAX_STEP, MAX_STEP);
    const dy = clamp(f.fy * DAMPING, -MAX_STEP, MAX_STEP);
    return {
      id: isl.id,
      x:  clamp(isl.x + dx, 80, 2920),
      y:  clamp(isl.y + dy, 80, 1920),
    };
  });
}

function countSharedTags(a = [], b = []) {
  const setB = new Set(b);
  return a.filter(t => setB.has(t)).length;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ── edge function entrypoint (supabase) ──────

export default async function handler(req) {
  const { createClient } = await import('@supabase/supabase-js');
  const db = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_KEY')
  );

  const { data: islands, error } = await db
    .from('islands')
    .select('id, x, y, drops(tags)');

  if (error) return new Response(JSON.stringify({ error }), { status: 500 });

  const mapped = islands.map(i => ({
    id:   i.id,
    x:    i.x,
    y:    i.y,
    tags: (i.drops ?? []).flatMap(d => d.tags ?? []),
  }));

  const updated = driftTick(mapped);

  for (const upd of updated) {
    await db.from('islands').update({ x: upd.x, y: upd.y }).eq('id', upd.id);
  }

  return new Response(JSON.stringify({ updated: updated.length }), { status: 200 });
}
