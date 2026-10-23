-- THRIVAR: privacy rules for the weekly pages.
-- Run once in Supabase -> SQL Editor -> New query -> Run.
-- It only adds rules (row-level security) to weekly_assignments and weekly_reviews so each
-- person can only ever see and change their own rows. It does not change or delete any data.
-- Safe to run more than once.

alter table public.weekly_assignments enable row level security;
alter table public.weekly_reviews enable row level security;

drop policy if exists "weekly_assignments select own" on public.weekly_assignments;
drop policy if exists "weekly_assignments insert own" on public.weekly_assignments;
drop policy if exists "weekly_assignments update own" on public.weekly_assignments;
drop policy if exists "weekly_assignments delete own" on public.weekly_assignments;

create policy "weekly_assignments select own" on public.weekly_assignments
  for select using (auth.uid() = user_id);
create policy "weekly_assignments insert own" on public.weekly_assignments
  for insert with check (auth.uid() = user_id);
create policy "weekly_assignments update own" on public.weekly_assignments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekly_assignments delete own" on public.weekly_assignments
  for delete using (auth.uid() = user_id);

drop policy if exists "weekly_reviews select own" on public.weekly_reviews;
drop policy if exists "weekly_reviews insert own" on public.weekly_reviews;
drop policy if exists "weekly_reviews update own" on public.weekly_reviews;
drop policy if exists "weekly_reviews delete own" on public.weekly_reviews;

create policy "weekly_reviews select own" on public.weekly_reviews
  for select using (auth.uid() = user_id);
create policy "weekly_reviews insert own" on public.weekly_reviews
  for insert with check (auth.uid() = user_id);
create policy "weekly_reviews update own" on public.weekly_reviews
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "weekly_reviews delete own" on public.weekly_reviews
  for delete using (auth.uid() = user_id);
