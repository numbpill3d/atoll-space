# DRIFT.md — island drift algorithm

islands are not static. they move.

---

## the idea

every island accumulates a set of tags from its drops.
islands with overlapping tags are attracted to each other.
islands without shared tags are weakly repelled.
over time, the map self-organises into loose clusters of related islands.

this is not instant. drift is slow. a newly tagged island might take days to drift noticeably.

---

## when it runs

a supabase edge function (`supabase/functions/drift/index.ts`) runs on a cron:

```
every hour on the hour
```

each run performs one tick of position integration for all islands.

---

## forces

### spring attraction (per shared tag)

```
F_spring = k * shared_count * (distance - target_distance)
```

- `k = 0.005` — spring constant
- `shared_count` — number of tags in common between two islands
- `target_distance = max(120, 300 - shared_count * 40)` — islands with more shared tags aim to sit closer
- force is directed along the vector between islands

### repulsion (all pairs)

```
F_repel = C / distance²
```

- `C = 4000` — repulsion constant
- prevents total collapse into a single cluster
- always present between every pair of islands

### damping

```
velocity = force * 0.85
```

dampens oscillation. islands glide, they don't bounce.

### max step

```
max position change per tick = 8 world units
```

prevents islands from teleporting during a single tick.

---

## world coordinates

- world space: `3000 × 2000` units
- islands are clamped to `80–2920` (x) and `80–1920` (y)
- new islands are spawned at a random position in the centre region (`200–2800`, `200–1800`)

---

## position storage

island positions (`x`, `y`) are stored in the `islands` table.
the drift job reads all island positions + their tag arrays, computes one tick, and writes back updated positions.

the frontend reads positions from supabase on load.
realtime subscriptions (`supabase realtime`) push position updates to connected clients,
which smoothly interpolate islands to their new positions.

---

## interpolation (frontend)

when a position update arrives via realtime:

```js
// lerp island toward target over ~2 seconds
function lerpIsland(island, targetX, targetY) {
  const STEPS = 120; // at 60fps ~= 2s
  let step = 0;
  const startX = island.x, startY = island.y;
  const tick = () => {
    step++;
    island.x = startX + (targetX - startX) * (step / STEPS);
    island.y = startY + (targetY - startY) * (step / STEPS);
    if (step < STEPS) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
```

motion should feel like slow tidal drift, not snapping.

---

## edge cases

- **single island**: no forces, no movement
- **two islands, no shared tags**: only repulsion, they drift apart
- **island archived (>90 days)**: removed from drift computation entirely
- **new island**: spawns at random position, begins drifting on next hourly tick

---

## tuning

if clusters are too tight, increase `REPULSION_C`.
if clusters never form, increase `SPRING_K` or decrease `target_distance`.
if islands oscillate, increase `DAMPING` toward 1.0.

the goal: islands in the same tag-space should be clearly near each other,
but the map should still feel like an ocean — mostly empty.
