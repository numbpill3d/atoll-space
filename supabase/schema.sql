-- atoll.space — schema.sql
-- run in supabase SQL editor to bootstrap

-- ── extensions ──────────────────────────────

create extension if not exists "uuid-ossp";

-- ── islands ─────────────────────────────────

create table if not exists islands (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid references auth.users(id) on delete cascade,
  label        text not null check (length(label) between 1 and 24),
  x            real not null default 500,
  y            real not null default 400,
  size         real not null default 1.0 check (size between 0.4 and 1.5),
  last_drop_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (user_id),
  unique (label)
);

-- row-level security
alter table islands enable row level security;

create policy "islands are public" on islands
  for select using (true);

create policy "users own their island" on islands
  for all using (auth.uid() = user_id);

-- ── drops ────────────────────────────────────

create type drop_type as enum ('link', 'thought', 'flower', 'image');

create table if not exists drops (
  id         uuid primary key default uuid_generate_v4(),
  island_id  uuid references islands(id) on delete cascade not null,
  type       drop_type not null,
  label      text,                         -- short display name
  content    text check (length(content) <= 280),
  url        text,
  tags       text[] not null default '{}',
  offset_x   real not null default 0,      -- position offset from island center
  offset_y   real not null default 0,
  created_at timestamptz not null default now()
);

alter table drops enable row level security;

create policy "drops are public" on drops
  for select using (true);

create policy "island owner can manage drops" on drops
  for all using (
    island_id in (
      select id from islands where user_id = auth.uid()
    )
  );

-- ── tags (denormalised for drift queries) ────

create table if not exists tags (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null unique,
  island_count int  not null default 0
);

-- ── adjacencies (computed by drift job) ─────

create table if not exists adjacencies (
  island_a    uuid references islands(id) on delete cascade,
  island_b    uuid references islands(id) on delete cascade,
  shared_tags text[] not null default '{}',
  distance    real,
  updated_at  timestamptz not null default now(),
  primary key (island_a, island_b)
);

alter table adjacencies enable row level security;

create policy "adjacencies are public" on adjacencies
  for select using (true);

-- ── functions: auto-update last_drop_at ─────

create or replace function update_island_last_drop()
returns trigger language plpgsql as $$
begin
  update islands
  set last_drop_at = now()
  where id = NEW.island_id;
  return NEW;
end;
$$;

create trigger after_drop_insert
after insert on drops
for each row execute function update_island_last_drop();

-- ── function: create island on signup ───────

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  island_name text;
begin
  island_name := coalesce(
    new.raw_user_meta_data->>'island_name',
    split_part(new.email, '@', 1)
  );

  -- ensure uniqueness with suffix if needed
  if exists (select 1 from islands where label = island_name) then
    island_name := island_name || '_' || floor(random() * 900 + 100)::text;
  end if;

  insert into islands (user_id, label, x, y, size)
  values (
    new.id,
    island_name,
    200 + floor(random() * 2600)::real,
    200 + floor(random() * 1600)::real,
    0.7 + random() * 0.6
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- ── indexes ─────────────────────────────────

create index if not exists drops_island_id_idx on drops(island_id);
create index if not exists drops_tags_idx      on drops using gin(tags);
create index if not exists islands_label_idx   on islands(label);

-- ── drift cron job (run AFTER deploying the edge function) ───
-- enables pg_cron and schedules the drift tick every hour.
-- replace <project-ref> with your Supabase project reference id.
--
-- create extension if not exists pg_cron;
--
-- select cron.schedule(
--   'drift-tick',
--   '0 * * * *',
--   $$
--     select net.http_post(
--       url    := 'https://<project-ref>.supabase.co/functions/v1/drift',
--       headers := '{"Authorization": "Bearer <service-role-key>"}'::jsonb
--     );
--   $$
-- );
