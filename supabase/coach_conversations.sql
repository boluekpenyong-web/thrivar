-- THRIVAR: separate coach conversations (new chat, history, delete one).
-- Run ONCE in Supabase -> SQL Editor -> New query. It only ADDS a table and a column,
-- and moves her existing messages into one conversation called "Earlier conversation".
-- Nothing is deleted.

create table if not exists public.coach_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coach_conversations enable row level security;

create policy "Users can view their own conversations"
  on public.coach_conversations for select using (auth.uid() = user_id);
create policy "Users can add their own conversations"
  on public.coach_conversations for insert with check (auth.uid() = user_id);
create policy "Users can update their own conversations"
  on public.coach_conversations for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own conversations"
  on public.coach_conversations for delete using (auth.uid() = user_id);

create index if not exists coach_conversations_user_updated_idx
  on public.coach_conversations (user_id, updated_at desc);

alter table public.coach_messages
  add column if not exists conversation_id uuid references public.coach_conversations(id) on delete cascade;

create index if not exists coach_messages_conversation_idx
  on public.coach_messages (conversation_id, created_at);

-- Keep what she already has: one conversation per person for messages saved before this update.
insert into public.coach_conversations (user_id, title, created_at, updated_at)
select user_id, 'Earlier conversation', min(created_at), max(created_at)
from public.coach_messages
where conversation_id is null
group by user_id;

update public.coach_messages m
set conversation_id = c.id
from public.coach_conversations c
where m.conversation_id is null
  and c.user_id = m.user_id
  and c.title = 'Earlier conversation';
