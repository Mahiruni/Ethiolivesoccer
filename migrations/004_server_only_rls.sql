-- EthioLiveScores: this application uses its own Express API and direct PostgreSQL access.
-- Supabase Data API clients must not read user password hashes, personal
-- preferences, subscriptions or other tables directly.
-- Run on fresh installs after schema.sql and migrations/003_live_provider_match_details.sql.
DO $$
DECLARE tbl record;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname='public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tbl.tablename);
    EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, authenticated',tbl.tablename);
  END LOOP;
END $$;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER VIEW public.league_standings SET (security_invoker=true);
REVOKE ALL PRIVILEGES ON TABLE public.league_standings FROM anon, authenticated;

-- The linter may flag "RLS enabled, no policy" informational notices.
-- This is deliberate: all Data API access is denied. Do not grant blanket
-- access to anon/authenticated; privileged server API enforces account access.
