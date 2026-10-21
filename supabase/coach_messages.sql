-- THRIVAR: saves coach conversations so they are still there when she comes back.
-- Safe to run once in Supabase -> SQL Editor -> New query. It only ADDS a new table
-- and does not touch any existing data. Running it a second time will show
-- "already exists" errors, which are harmless.

create table if not exists public.coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.coach_messages enable row level security;

create policy "Users can view their own coach messages"
  on public.coach_messages for select
  using (auth.uid() = user_id);

create policy "Users can add their own coach messages"
  on public.coach_messages for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own coach messages"
  on public.coach_messages for delete
  using (auth.uid() = user_id);

create index if not exists coach_messages_user_created_idx
  on public.coach_messages (user_id, created_at);
