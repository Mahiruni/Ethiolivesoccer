-- EthioLiveScores v2.1 Database Schema
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
  PRIMARY KEY (user_id,team_id)
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

CREATE TABLE competitions (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL,
  name_en VARCHAR(150) NOT NULL,
  name_am VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Domestic',
  season VARCHAR(40),
  team_count INT DEFAULT 0,
  accent VARCHAR(20) DEFAULT '#0B46A8',
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0
);

CREATE TABLE news_articles (
  id BIGSERIAL PRIMARY KEY,
  competition_id INT REFERENCES competitions(id) ON DELETE SET NULL,
  author_user_id INT REFERENCES users(id) ON DELETE SET NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'News',
  slug VARCHAR(180) UNIQUE NOT NULL,
  title_en VARCHAR(220) NOT NULL,
  title_am VARCHAR(220) NOT NULL,
  summary_en TEXT NOT NULL,
  summary_am TEXT NOT NULL,
  body_en TEXT,
  body_am TEXT,
  hero_image_url TEXT,
  source_label VARCHAR(120),
  source_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  is_featured BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_news_published ON news_articles(status,published_at DESC);
CREATE INDEX idx_news_competition ON news_articles(competition_id,published_at DESC);

CREATE TABLE push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_push_user_active ON push_subscriptions(user_id,is_active);

CREATE TABLE notification_deliveries (
  id BIGSERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  match_id INT REFERENCES matches(id) ON DELETE CASCADE,
  notification_type VARCHAR(30) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO competitions(slug,name_en,name_am,category,season,team_count,accent,sort_order) VALUES
('ethiopian-premier-league','Ethiopian Premier League','የኢትዮጵያ ፕሪሚየር ሊግ','Domestic',NULL,0,'#FFD21F',10),
('ethiopian-higher-league','Ethiopian Higher League','የኢትዮጵያ ከፍተኛ ሊግ','Domestic',NULL,0,'#0B46A8',20),
('ethiopian-cup','Ethiopian Cup','የኢትዮጵያ ዋንጫ','Cup',NULL,0,'#FFD21F',30),
('ethiopia-national-team','Ethiopia National Team','የኢትዮጵያ ብሔራዊ ቡድን','National',NULL,0,'#0B46A8',40),
('caf-champions-league','CAF Champions League','የCAF ቻምፒዮንስ ሊግ','CAF',NULL,0,'#FFD21F',50),
('caf-confederation-cup','CAF Confederation Cup','የCAF ኮንፌዴሬሽን ዋንጫ','CAF',NULL,0,'#0B46A8',60),
('uefa-champions-league','UEFA Champions League','የUEFA ቻምፒዮንስ ሊግ','International',NULL,0,'#FFD21F',70),
('english-premier-league','English Premier League','የእንግሊዝ ፕሪሚየር ሊግ','International',NULL,0,'#0B46A8',80),
('la-liga','La Liga','ላ ሊጋ','International',NULL,0,'#FFD21F',90),
('serie-a','Serie A','ሴሪ ኤ','International',NULL,0,'#0B46A8',100)
ON CONFLICT(slug) DO UPDATE SET name_en=EXCLUDED.name_en,name_am=EXCLUDED.name_am,category=EXCLUDED.category,accent=EXCLUDED.accent,sort_order=EXCLUDED.sort_order;

CREATE OR REPLACE VIEW league_standings AS
WITH match_results AS (
  SELECT home_team_id AS team_id,COUNT(*) AS played,
    SUM(CASE WHEN home_score>away_score THEN 1 ELSE 0 END) AS won,
    SUM(CASE WHEN home_score=away_score THEN 1 ELSE 0 END) AS drawn,
    SUM(CASE WHEN home_score<away_score THEN 1 ELSE 0 END) AS lost,
    SUM(home_score) AS goals_for,SUM(away_score) AS goals_against,
    SUM(CASE WHEN home_score>away_score THEN 3 WHEN home_score=away_score THEN 1 ELSE 0 END) AS points
  FROM matches WHERE status='FT' GROUP BY home_team_id
  UNION ALL
  SELECT away_team_id AS team_id,COUNT(*) AS played,
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
