-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Collections (Folders)
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Sets (belong to a Collection or Uncategorized when collection_id is NULL)
create table if not exists public.sets (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.collections(id) on delete set null,
  title text not null,
  created_at timestamptz not null default now()
);

-- Cards (belong to a Set)
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.sets(id) on delete cascade,
  english_word text not null,
  vietnamese_meaning text not null,
  example_usage text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_sets_collection_id on public.sets(collection_id);
create index if not exists idx_cards_set_id on public.cards(set_id);

-- Row Level Security: public read-only access for students; writes go through server-side API with service role key
alter table public.collections enable row level security;
alter table public.sets enable row level security;
alter table public.cards enable row level security;

drop policy if exists "Public read collections" on public.collections;
create policy "Public read collections"
  on public.collections for select
  using (true);

drop policy if exists "Public read sets" on public.sets;
create policy "Public read sets"
  on public.sets for select
  using (true);

drop policy if exists "Public read cards" on public.cards;
create policy "Public read cards"
  on public.cards for select
  using (true);
