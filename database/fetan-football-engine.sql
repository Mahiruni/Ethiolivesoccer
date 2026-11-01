-- FETAN-owned football data; run against a dedicated FETAN Postgres database.
CREATE TABLE IF NOT EXISTS fetan_sources (
 id BIGSERIAL PRIMARY KEY, code TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
 kind TEXT NOT NULL CHECK (kind IN ('licensed_feed','official','reporter','editorial')),
 rights_verified BOOLEAN NOT NULL DEFAULT false, license_reference TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fetan_competitions (
 id BIGSERIAL PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL, country TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS fetan_clubs (
 id BIGSERIAL PRIMARY KEY, slug TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
 competition_id BIGINT REFERENCES fetan_competitions(id), crest_url TEXT
);
CREATE TABLE IF NOT EXISTS fetan_fixtures (
 id BIGSERIAL PRIMARY KEY, source_id BIGINT NOT NULL REFERENCES fetan_sources(id),
 external_id TEXT NOT NULL, competition_id BIGINT REFERENCES fetan_competitions(id),
 home_club_id BIGINT REFERENCES fetan_clubs(id), away_club_id BIGINT REFERENCES fetan_clubs(id),
 kickoff_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'scheduled',
 home_score INTEGER CHECK (home_score>=0), away_score INTEGER CHECK (away_score>=0),
 verified_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(source_id,external_id)
);
CREATE INDEX IF NOT EXISTS fetan_fixtures_kickoff ON fetan_fixtures(kickoff_at DESC);
CREATE TABLE IF NOT EXISTS fetan_match_events (
 id BIGSERIAL PRIMARY KEY, fixture_id BIGINT NOT NULL REFERENCES fetan_fixtures(id),
 source_id BIGINT NOT NULL REFERENCES fetan_sources(id), external_id TEXT NOT NULL,
 event_type TEXT NOT NULL, minute INTEGER, payload JSONB NOT NULL DEFAULT '{}'::jsonb,
 verified_at TIMESTAMPTZ, UNIQUE(source_id,external_id)
);
CREATE TABLE IF NOT EXISTS fetan_articles (
 id BIGSERIAL PRIMARY KEY, slug TEXT UNIQUE NOT NULL, headline TEXT NOT NULL,
 summary TEXT NOT NULL DEFAULT '', body TEXT NOT NULL, author TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','published')),
 source_notes TEXT, published_at TIMESTAMPTZ, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (status <> 'published' OR published_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS fetan_articles_published ON fetan_articles(published_at DESC) WHERE status='published';
CREATE TABLE IF NOT EXISTS fetan_ingest_audit (
 id BIGSERIAL PRIMARY KEY, source_id BIGINT REFERENCES fetan_sources(id),
 kind TEXT NOT NULL, external_id TEXT, outcome TEXT NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- No public client grants: FETAN accesses these tables only through its server API.
