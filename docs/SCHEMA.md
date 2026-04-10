# SCHEMA.md — database schema

## tables

### `islands`

| column        | type        | notes                                      |
|---------------|-------------|--------------------------------------------|
| `id`          | uuid        | primary key                                |
| `user_id`     | uuid        | references `auth.users`, unique            |
| `label`       | text        | public island name, 1–24 chars, unique     |
| `x`           | real        | world x position (0–3000)                  |
| `y`           | real        | world y position (0–2000)                  |
| `size`        | real        | scale multiplier 0.4–1.5                   |
| `last_drop_at`| timestamptz | updated by trigger on drop insert          |
| `created_at`  | timestamptz | immutable                                  |

**rls**: public read. write only by owning user.

---

### `drops`

| column      | type        | notes                                  |
|-------------|-------------|----------------------------------------|
| `id`        | uuid        | primary key                            |
| `island_id` | uuid        | references `islands`                   |
| `type`      | drop_type   | enum: `link`, `thought`, `flower`, `image` |
| `label`     | text        | short display name (auto-derived or set) |
| `content`   | text        | max 280 chars                          |
| `url`       | text        | for link type                          |
| `tags`      | text[]      | array of lowercase strings             |
| `offset_x`  | real        | position offset from island center     |
| `offset_y`  | real        | position offset from island center     |
| `created_at`| timestamptz | immutable                              |

**rls**: public read. write only by island owner.

---

### `tags`

| column         | type | notes                              |
|----------------|------|------------------------------------|
| `id`           | uuid | primary key                        |
| `name`         | text | unique, lowercase                  |
| `island_count` | int  | denormalised count for tag cloud   |

used for tag suggestions in the drop form. updated by trigger (not yet implemented — manual for now).

---

### `adjacencies`

| column        | type        | notes                               |
|---------------|-------------|-------------------------------------|
| `island_a`    | uuid        | references `islands`                |
| `island_b`    | uuid        | references `islands`                |
| `shared_tags` | text[]      | tags in common                      |
| `distance`    | real        | current euclidean distance          |
| `updated_at`  | timestamptz | set by drift job                    |

composite primary key on `(island_a, island_b)`.
`island_a < island_b` always (enforced by drift job) to avoid duplicate pairs.

**rls**: public read. write only by service role (drift job).

---

## triggers

### `after_drop_insert`
fires after insert on `drops`.
updates `islands.last_drop_at = now()` for the relevant island.

### `on_auth_user_created`
fires after insert on `auth.users`.
creates a new island row with a random position and size.
island name comes from `raw_user_meta_data.island_name` or email prefix.

---

## indexes

```sql
drops_island_id_idx  on drops(island_id)
drops_tags_idx       on drops using gin(tags)   -- for tag queries
islands_label_idx    on islands(label)
```

---

## row level security summary

| table        | read     | write                    |
|--------------|----------|--------------------------|
| islands      | public   | owner only               |
| drops        | public   | island owner only        |
| tags         | public   | service role only        |
| adjacencies  | public   | service role only        |
