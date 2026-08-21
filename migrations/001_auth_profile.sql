-- EthioLiveScores v2: account/profile features
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(80);
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
UPDATE users SET display_name = username WHERE display_name IS NULL;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  preferred_language VARCHAR(2) NOT NULL DEFAULT 'en' CHECK (preferred_language IN ('en','am')),
  theme VARCHAR(10) NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark')),
  notify_goals BOOLEAN NOT NULL DEFAULT true,
  notify_kickoff BOOLEAN NOT NULL DEFAULT true,
  notify_halftime BOOLEAN NOT NULL DEFAULT false,
  notify_fulltime BOOLEAN NOT NULL DEFAULT true,
  notify_red_cards BOOLEAN NOT NULL DEFAULT true,
  notify_news BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_favorite_teams (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  team_id INT REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, team_id)
);

INSERT INTO user_preferences (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;
