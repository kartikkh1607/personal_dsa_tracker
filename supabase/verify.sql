-- Run after 0001_progress.sql to confirm the schema landed as intended.
-- Every row below should match what the comments say.

-- 1. Row level security must be ON. If this says false, stop: the table is
--    readable by anyone holding the publishable key, which ships in the app.
select relname, relrowsecurity as rls_enabled
from pg_class
where oid = 'public.progress'::regclass;

-- 2. Four policies, one per command (r = select, a = insert, w = update, d = delete).
select polname, polcmd
from pg_policy
where polrelid = 'public.progress'::regclass
order by polname;

-- 3. The updated_at trigger must exist and fire before insert or update.
select tgname, tgenabled
from pg_trigger
where tgrelid = 'public.progress'::regclass and not tgisinternal;

-- 4. The anon role must hold no privileges on the table. Expect zero rows.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'progress' and grantee = 'anon';

-- 5. Columns and types.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'progress'
order by ordinal_position;
