# DESIGN.md — atoll.space aesthetic decisions

## the one rule

**monochrome only. forever.**

no color. not as accent. not for hover states. not for errors.
if you're tempted to add color, use opacity instead.

---

## palette

```
--ink:        #1a1a1a   primary text, borders, filled nodes
--ink-dim:    #555555   secondary text, labels
--ink-ghost:  #aaaaaa   hints, muted borders, ghosts
--paper:      #f5f4f0   background (warm white, not pure #fff)
--paper-2:    #edecea   surface, input backgrounds
--paper-3:    #e0dfda   borders, dividers
```

the paper is slightly warm. not pure white. the ocean should feel like fog, not sterility.

---

## typography

- **display / logo**: VT323 — bitmap feel, readable at any size
- **ui / body**: Share Tech Mono — narrow, technical, honest
- no other fonts. ever.
- no italic. monospace italics are illegible at small sizes.
- labels: ALL CAPS + `letter-spacing: 0.12–0.18em`
- body: sentence case, 13px, line-height 1.6

---

## the island

islands are isometric tile clusters drawn on a canvas. no sprites, no images — pure canvas geometry.

- top face: lightest shade (`#c4c3bd` to `#d0cfca`)
- left face: darkest shade (`#a8a7a1`)
- right face: mid shade (`#bab9b3`)
- all stroke: `#999`, `0.5px`
- shadow: `rgba(0,0,0,0.06)` offset 2px below

island **size** varies per user (0.5–1.5 scale). no two islands are the same size.

---

## node shapes

each dropped item type has a distinct shape. shapes are simple and recognisable at 8px.

| type    | shape       | css approach         |
|---------|-------------|----------------------|
| link    | square      | `border-radius: 0`   |
| thought | circle      | `border-radius: 50%` |
| flower  | star        | `clip-path` polygon  |
| image   | folded rect | `clip-path` polygon  |

all nodes:
- `8px × 8px`
- stroke: `1px solid #1a1a1a`
- fill default: `#f5f4f0` (paper)
- fill hover: `#1a1a1a` (ink)
- scale on hover: `1.5×`

---

## sinking

sinking is visual entropy. it's not punitive — it's honest.

```
0–29 days since last drop  →  opacity 1.0  (full presence)
30–59 days                 →  opacity 0.5  (fading)
60–89 days                 →  opacity 0.15 (ghost)
90+ days                   →  archived (removed from map)
```

a sinking island is still real. it just becomes quieter.
the island's drops still exist. they just become harder to find.

---

## water / white space

the ocean is white space. it is not empty — it is silence.

water fills ~80% of the visible map at any time.
islands should feel sparse, scattered, like actual islands.

do not fill the map. resist the urge to cluster everything tightly.
the distance between islands is content.

---

## connections

tag connections are shown as dashed lines between adjacent islands.

```
stroke: rgba(0,0,0,0.08)
stroke-width: 0.5
stroke-dasharray: 3 5
```

barely visible. they should feel like currents, not roads.

---

## tag cluster labels

when 2+ islands share a tag, the centroid of that cluster gets a faint label.

```
font-size: 8px
color: rgba(0,0,0,0.15)
letter-spacing: 0.15em
```

barely readable. ambient. not navigation.

---

## ui chrome

the ui is a frame. it should almost disappear.

- top bar: 36px. one line. logo left, nav centre, tagline right.
- status bar: 24px. coordinates, island count, hover state.
- minimap: 90×60px. bottom left. just dots and a viewport rect.
- drop button: bottom right. `[ DROP ]` in VT323.

no sidebar. no feed. no notifications. no algorithm.

---

## popup windows

popups feel like terminal windows. fixed-width, bordered, plain.

```
border: 1px solid #1a1a1a
background: #f5f4f0
font: 11px Share Tech Mono
```

no drop shadows. no rounded corners. no animations (instant open/close).

---

## what we will never add

- colour
- likes, reactions, or any quantified engagement metric
- a feed or timeline
- notifications
- algorithmic sorting
- infinite scroll
- mobile layout (desktop only, by design)
- markdown rendering
- images larger than 64×64px
- sound
