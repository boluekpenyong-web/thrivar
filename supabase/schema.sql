-- Thrivar — Six Pillars schema.
-- Run in Supabase Dashboard -> SQL Editor -> New query.
-- Safe as a clean rebuild: no real users signed up yet.

drop table if exists public.profiles;

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Six Pillars of Human Orientation: identity, belonging, purpose,
  -- capacity, direction, agency. Each 0-100, internal signal only.
  pillar_scores jsonb not null,

  -- Per-pillar Current State, independently assigned - not a linear
  -- progression, not forced to agree across pillars.
  pillar_states jsonb not null,

  -- Nullable on purpose: only set when there's real evidence of a
  -- want-vs-protect friction. Filled in by the AI narrative layer later,
  -- not by this initial rule-based pass.
  current_tension jsonb,

  -- Nullable on purpose: "not enough evidence yet" is a valid, honest
  -- outcome, not a bug.
  primary_edge text,
  secondary_tension text,

  completed_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profiles"
  on public.profiles for select
  using (auth.uid() = user_id);

create policy "Users can insert their own profiles"
  on public.profiles for insert
  with check (auth.uid() = user_id);

create index profiles_user_id_idx on public.profiles(user_id);
