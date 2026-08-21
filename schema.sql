-- EthioLiveScores v2 Database Schema
CREATE TABLE leagues (
  id SERIAL PRIMARY KEY,
  name_en VARCHAR(100) NOT NULL,
  name_am VARCHAR(100) NOT NULL,
  country VARCHAR(50) DEFAULT 'Ethiopia'
);
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name_en VARCHAR(100) NOT NULL,
  name_am VARCHAR(100) NOT NULL,
  short_name VARCHAR(10),
  avatar_seed VARCHAR(100) DEFAULT 'initial'
);
CREATE TABLE matches (
  id SERIAL PRIMARY KEY,
  league_id INT REFERENCES leagues(id) ON DELETE CASCADE,
  home_team_id INT REFERENCES teams(id),
  away_team_id INT REFERENCES teams(id),
  status VARCHAR(20) DEFAULT 'Scheduled',
  home_score INT DEFAULT 0,
  away_score INT DEFAULT 0,
  current_minute INT DEFAULT 0,
  match_date TIMESTAMP WITH TIME ZONE
);
CREATE TABLE match_events (
  id BIGSERIAL PRIMARY KEY,
  match_id INT REFERENCES matches(id) ON DELETE CASCADE,
  minute INT NOT NULL,
  event_type VARCHAR(30) NOT NULL,
  description_en TEXT NOT NULL,
  description_am TEXT NOT NULL
);
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(80),
  avatar_seed VARCHAR(100) DEFAULT 'initial',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE user_preferences (
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
CREATE TABLE user_favorite_teams (
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  team_id INT REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, team_id)
);
CREATE TABLE banned_users (
  id SERIAL PRIMARY KEY,
  banned_user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  reason TEXT
);
CREATE TABLE match_comments (
  id SERIAL PRIMARY KEY,
  match_id INT REFERENCES matches(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE live_chat_messages (
  id SERIAL PRIMARY KEY,
  match_id INT REFERENCES matches(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  message_text VARCHAR(280) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE match_polls (
  match_id INT REFERENCES matches(id) ON DELETE CASCADE PRIMARY KEY,
  home_votes INT DEFAULT 0,
  draw_votes INT DEFAULT 0,
  away_votes INT DEFAULT 0
);
CREATE TABLE poll_votes (
  id SERIAL PRIMARY KEY,
  match_id INT REFERENCES matches(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  vote_choice VARCHAR(10) NOT NULL CHECK (vote_choice IN ('home','draw','away')),
  UNIQUE(match_id,user_id)
);
CREATE TABLE sponsorships (
  id SERIAL PRIMARY KEY,
  sponsor_name VARCHAR(100) NOT NULL,
  banner_image_url TEXT NOT NULL,
  target_link_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  click_count INT DEFAULT 0
);
CREATE OR REPLACE VIEW league_standings AS
WITH match_results AS (
  SELECT home_team_id AS team_id, COUNT(*) AS played,
    SUM(CASE WHEN home_score>away_score THEN 1 ELSE 0 END) AS won,
    SUM(CASE WHEN home_score=away_score THEN 1 ELSE 0 END) AS drawn,
    SUM(CASE WHEN home_score<away_score THEN 1 ELSE 0 END) AS lost,
    SUM(home_score) AS goals_for,SUM(away_score) AS goals_against,
    SUM(CASE WHEN home_score>away_score THEN 3 WHEN home_score=away_score THEN 1 ELSE 0 END) AS points
  FROM matches WHERE status='FT' GROUP BY home_team_id
  UNION ALL
  SELECT away_team_id AS team_id, COUNT(*) AS played,
    SUM(CASE WHEN away_score>home_score THEN 1 ELSE 0 END),
    SUM(CASE WHEN away_score=home_score THEN 1 ELSE 0 END),
    SUM(CASE WHEN away_score<home_score THEN 1 ELSE 0 END),
    SUM(away_score),SUM(home_score),
    SUM(CASE WHEN away_score>home_score THEN 3 WHEN away_score=home_score THEN 1 ELSE 0 END)
  FROM matches WHERE status='FT' GROUP BY away_team_id
)
SELECT t.id AS team_id,t.name_en,t.name_am,SUM(r.played) AS mp,SUM(r.won) AS w,SUM(r.drawn) AS d,SUM(r.lost) AS l,
  (SUM(r.goals_for)-SUM(r.goals_against)) AS gd,SUM(r.points) AS pts
FROM match_results r JOIN teams t ON r.team_id=t.id
GROUP BY t.id,t.name_en,t.name_am ORDER BY pts DESC,gd DESC;
