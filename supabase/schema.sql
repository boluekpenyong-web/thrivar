-- Thrivar — Six Pillars + Transformation Map schema.
-- Run in Supabase Dashboard -> SQL Editor -> New query.
-- Safe as a clean rebuild: no real users signed up yet.

drop table if exists public.profiles;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  pillar_scores jsonb not null,
  pillar_states jsonb not null,

  current_tension jsonb,
  primary_edge text,
  secondary_tension text,

  -- The AI-generated Transformation Map narrative, cached here after
  -- generation so it isn't regenerated on every dashboard view.
  transformation_map jsonb,

  completed_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profiles"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profiles"
  on public.profiles for insert
  with check (auth.uid() = user_id);

-- Needed now: the generate-map route updates this row with the narrative
-- after it's created, which requires an UPDATE policy that didn't exist
-- before (the schema only had select/insert until now).
create policy "Users can update their own profiles"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index profiles_user_id_idx on public.profiles(user_id);
