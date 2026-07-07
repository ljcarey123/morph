-- Notes table: one row per note, tabs stored as JSONB.
-- Run this in the Supabase dashboard SQL Editor, or via `supabase db push`
-- if you have the Supabase CLI set up.

create table public.notes (
  id                text        primary key,   -- client-generated UUID strings
  user_id           uuid        not null references auth.users(id) on delete cascade,
  title             text        not null default 'Untitled note',
  content           text        not null default '',
  tabs              jsonb       not null default '[]',
  active_tab_id     text,
  suggested_options jsonb       not null default '[]',
  sort_order        integer     not null default 0,
  created_at        timestamptz not null,
  updated_at        timestamptz not null
);

-- Row Level Security: users can only see and modify their own notes.
alter table public.notes enable row level security;

create policy "Users manage their own notes"
  on public.notes
  for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());
