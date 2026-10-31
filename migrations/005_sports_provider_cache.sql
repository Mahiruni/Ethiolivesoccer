-- Shared API-Football response cache for serverless deployments.
-- This reduces paid-provider calls across Vercel instances and page refreshes.
CREATE TABLE IF NOT EXISTS public.sports_provider_cache (
  cache_key TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sports_provider_cache_expires
  ON public.sports_provider_cache (expires_at);

-- Only Express/PostgreSQL backend can access this table.
ALTER TABLE public.sports_provider_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.sports_provider_cache FROM anon, authenticated;
