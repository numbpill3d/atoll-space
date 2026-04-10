# atoll.space — the floating archipelago

> Every user is a tiny isometric island in a vast digital ocean.

A spatial social web where you don't "post" — you **drop** a single item onto your island. Islands drift closer when they share tags. Islands that go quiet begin to sink.

---

## concept

- **islands** — each user owns one island, represented as a 1-bit isometric tile cluster
- **drops** — the only action is to drop one item: a link, a thought, or a pixel-art flower
- **nodes** — each dropped item becomes a visual node on your island with a hover tooltip and popup
- **drift** — islands with shared tags slowly drift toward each other on the map
- **sinking** — no activity in 30 days begins a fade; 60 days = invisible; 90 days = archived

---

## aesthetic rules

- monochrome only (no color, ever)
- 1-bit isometric pixel art islands
- lots of white space (water is silence)
- minimal ui — if it doesn't need to be visible, it isn't
- node shapes encode content type: `□` link · `○` thought · `✦` flower · `▷` image

---

## stack

| layer | choice | reason |
|---|---|---|
| frontend | vanilla js + web components | no framework overhead, ships as static |
| rendering | canvas 2d + svg overlay | islands on canvas, nodes/ui on svg |
| state | indexeddb (local) + supabase (remote) | offline-first |
| realtime | supabase realtime | island drift positions sync live |
| auth | supabase auth (magic link only) | no passwords |
| hosting | cloudflare pages | edge, free tier |

---

## project structure

```
atoll-space/
├── src/
│   ├── components/
│   │   ├── AtollMap.js        # main canvas map renderer
│   │   ├── Island.js          # isometric island draw logic
│   │   ├── NodeDot.js         # dropped item node
│   │   ├── Popup.js           # node detail popup
│   │   ├── Tooltip.js         # hover tooltip
│   │   ├── DropForm.js        # drop a new item form
│   │   └── Minimap.js         # minimap overlay
│   ├── store/
│   │   ├── islands.js         # island state + drift logic
│   │   ├── drops.js           # drop crud
│   │   └── session.js         # auth session
│   ├── utils/
│   │   ├── drift.js           # tag-based position algorithm
│   │   ├── isometric.js       # iso tile math
│   │   ├── db.js              # supabase client
│   │   └── pixel.js           # 1-bit pixel art helpers
│   └── styles/
│       ├── base.css           # resets, css vars, typography
│       ├── map.css            # ocean, canvas, island styles
│       └── ui.css             # tooltip, popup, nav, status bar
├── public/
│   ├── index.html
│   └── favicon.svg            # 1-bit atoll icon
├── docs/
│   ├── DESIGN.md              # aesthetic decisions + rules
│   ├── DRIFT.md               # drift algorithm spec
│   └── SCHEMA.md              # database schema
├── supabase/
│   └── schema.sql             # full db schema
├── .env.example
├── package.json
└── README.md
```

---

## getting started

```bash
git clone https://github.com/yourname/atoll-space
cd atoll-space
cp .env.example .env
# fill in your supabase url + anon key
npm install
npm run dev
```

---

## data model (brief)

```
islands     id, user_id, label, x, y, created_at, last_drop_at
drops       id, island_id, type, content, tags[], created_at
tags        id, name, island_count
adjacencies island_a, island_b, shared_tags, distance
```

full schema → `docs/SCHEMA.md`

---

## the drift algorithm

islands accumulate a tag affinity score. once per hour, a background job:

1. computes pairwise tag overlap between all islands
2. applies a spring force: `F = k * (overlap - distance)` toward islands with high overlap
3. applies a weak repulsion: `F = -c / distance²` to prevent total collapse
4. integrates position with damping

fully documented in `docs/DRIFT.md`.

---

## sinking

```
last_drop < 30d  →  opacity 1.0   (alive)
last_drop < 60d  →  opacity 0.5   (fading)
last_drop < 90d  →  opacity 0.15  (ghost)
last_drop > 90d  →  archived, removed from map
```

a sinking island still holds all its drops. it just becomes quieter.

---

## contributing

this is a deliberate slow project. one feature at a time. open an issue before a pr.

no roadmap. no milestones. no velocity.

---

## license

mit
