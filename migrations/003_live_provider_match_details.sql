-- EthioLiveScores: real football provider mapping + match detail metadata
-- Safe to run after schema.sql, migrations/001_auth_profile.sql and 002_content_competitions_push.sql.

ALTER TABLE leagues ADD COLUMN IF NOT EXISTS provider_name VARCHAR(40);
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS provider_league_id INT;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS season VARCHAR(20);
CREATE UNIQUE INDEX IF NOT EXISTS ux_leagues_provider_league_id ON leagues(provider_league_id) WHERE provider_league_id IS NOT NULL;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS provider_team_id INT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS logo_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS ux_teams_provider_team_id ON teams(provider_team_id) WHERE provider_team_id IS NOT NULL;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS provider_fixture_id BIGINT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS round VARCHAR(120);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS venue_name VARCHAR(180);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS venue_city VARCHAR(120);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS referee VARCHAR(180);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS timezone VARCHAR(80);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS home_halftime INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS away_halftime INT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS provider_updated_at TIMESTAMP WITH TIME ZONE;
CREATE UNIQUE INDEX IF NOT EXISTS ux_matches_provider_fixture_id ON matches(provider_fixture_id) WHERE provider_fixture_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_matches_date_status ON matches(match_date, status);

ALTER TABLE match_events ADD COLUMN IF NOT EXISTS provider_event_id VARCHAR(120);
ALTER TABLE match_events ADD COLUMN IF NOT EXISTS team_name VARCHAR(160);
ALTER TABLE match_events ADD COLUMN IF NOT EXISTS player_name VARCHAR(160);
ALTER TABLE match_events ADD COLUMN IF NOT EXISTS assist_name VARCHAR(160);
ALTER TABLE match_events ADD COLUMN IF NOT EXISTS event_detail VARCHAR(160);

CREATE TABLE IF NOT EXISTS provider_match_cache (
  provider_fixture_id BIGINT PRIMARY KEY,
  provider_name VARCHAR(40) NOT NULL DEFAULT 'api-football',
  fixture_payload JSONB,
  events_payload JSONB,
  statistics_payload JSONB,
  lineups_payload JSONB,
  refreshed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN matches.provider_fixture_id IS 'Stable fixture ID from configured external football data provider.';
COMMENT ON TABLE provider_match_cache IS 'Optional normalized cache for provider match-detail payloads; live reads can still work without it.';
