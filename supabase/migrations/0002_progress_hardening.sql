-- DSA Tracker - hardening for the progress table
--
-- Two changes to what 0001 created, neither of which alters what the table
-- holds or who can reach it:
--
--   1. touch_updated_at resolved its names through whatever search_path the
--      calling session had. A trigger function that does is a standing
--      invitation to be pointed at someone else's now(), so the path is pinned
--      to empty. Nothing in the body needs a schema: now() lives in pg_catalog,
--      which stays on the path no matter what.
--
--   2. auth.uid() written bare in a policy is re-evaluated once per row
--      scanned. Wrapped as (select auth.uid()) the planner hoists it into an
--      InitPlan and runs it once per statement instead, which is the difference
--      between one call and one per row on a full pull.
--
-- Idempotent in the same way 0001 is: replace the function, drop and recreate
-- each policy. The trigger is left alone - it resolves the function by name, so
-- replacing the body is enough.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy if exists "progress_select_own" on public.progress;
create policy "progress_select_own" on public.progress
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "progress_insert_own" on public.progress;
create policy "progress_insert_own" on public.progress
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "progress_update_own" on public.progress;
create policy "progress_update_own" on public.progress
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "progress_delete_own" on public.progress;
create policy "progress_delete_own" on public.progress
  for delete to authenticated
  using ((select auth.uid()) = user_id);
