-- EthioLiveScores: competitions, bilingual newsroom and web-push delivery
CREATE TABLE IF NOT EXISTS competitions (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL,
  name_en VARCHAR(150) NOT NULL,
  name_am VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'Domestic',
  season VARCHAR(40),
  team_count INT DEFAULT 0,
  accent VARCHAR(20) DEFAULT '#F5C400',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS news_articles (
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
  is_featured BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_news_published ON news_articles(status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_competition ON news_articles(competition_id, published_at DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT UNIQUE NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_push_user_active ON push_subscriptions(user_id, is_active);

CREATE TABLE IF NOT EXISTS notification_deliveries (
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

INSERT INTO competitions(slug,name_en,name_am,category,season,team_count,accent,sort_order)
VALUES
('ethiopian-premier-league','Ethiopian Premier League','የኢትዮጵያ ፕሪሚየር ሊግ','Domestic','2026/27',16,'#F5C400',10),
('ethiopian-higher-league','Ethiopian Higher League','የኢትዮጵያ ከፍተኛ ሊግ','Domestic','2026/27',24,'#2B63FF',20),
('ethiopian-cup','Ethiopian Cup','የኢትዮጵያ ዋንጫ','Cup','2026',32,'#F5C400',30),
('ethiopia-national-team','Ethiopia National Team','የኢትዮጵያ ብሔራዊ ቡድን','National','International',1,'#2B63FF',40),
('caf-champions-league','CAF Champions League','የካፍ ቻምፒዮንስ ሊግ','CAF','2026/27',64,'#F5C400',50),
('caf-confederation-cup','CAF Confederation Cup','የካፍ ኮንፌዴሬሽን ዋንጫ','CAF','2026/27',64,'#2B63FF',60)
ON CONFLICT(slug) DO UPDATE SET name_en=EXCLUDED.name_en,name_am=EXCLUDED.name_am,category=EXCLUDED.category,season=EXCLUDED.season,team_count=EXCLUDED.team_count,accent=EXCLUDED.accent,sort_order=EXCLUDED.sort_order;
