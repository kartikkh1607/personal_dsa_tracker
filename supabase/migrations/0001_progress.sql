-- DSA Tracker - cloud sync schema
--
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- It is idempotent: running it again is safe and changes nothing.
--
-- One row per (user, question). Progress is local-first, so this table is a
-- mirror that devices merge against, not the source of truth for the UI.

create table if not exists public.progress (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  question_id integer     not null check (question_id > 0),

  -- The sanitized progress entry, exactly as the app stores it locally:
  -- { solved, solvedAt, reviewedAt, reviews, bookmarked, notes, images, link,
  --   history, updatedAt }. Holding it as one document means adding a field
  -- later (as `history` was) needs no migration, and conflicts are resolved
  -- per entry rather than per field anyway.
  data        jsonb       not null default '{}'::jsonb,

  -- The server's clock, not the device's. The trigger below sets it on every
  -- write, so a device with a wrong clock cannot place its rows outside the
  -- window another device is pulling. Incremental pulls page through this.
  updated_at  timestamptz not null default now(),

  -- Tombstone. Set when an entry is cleared so the deletion propagates,
  -- instead of the row quietly reappearing on the next pull.
  deleted_at  timestamptz,

  primary key (user_id, question_id)
);

-- The pull cursor's index: "everything of mine that changed after X".
create index if not exists progress_user_updated_at_idx
  on public.progress (user_id, updated_at);

-- updated_at belongs to the server. Any value a client sends is overwritten.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists progress_touch_updated_at on public.progress;
create trigger progress_touch_updated_at
  before insert or update on public.progress
  for each row execute function public.touch_updated_at();

-- Row level security. The publishable key ships inside the app bundle and is
-- readable by anyone, so these policies are the only thing standing between
-- one user's progress and another's. Without them the table would be wide open.
alter table public.progress enable row level security;

drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own" on public.progress
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own" on public.progress
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own" on public.progress
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "progress_delete_own" on public.progress;
create policy "progress_delete_own" on public.progress
  for delete to authenticated
  using (auth.uid() = user_id);

-- Signed-out visitors have no business here. Supabase grants the anon role
-- access to new public tables by default, so that grant is taken back.
grant select, insert, update, delete on table public.progress to authenticated;
revoke all on table public.progress from anon;
