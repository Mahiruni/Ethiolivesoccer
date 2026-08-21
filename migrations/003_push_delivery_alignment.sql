-- EthioLiveScores v2.1 alignment: international competition directory + notification defaults
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS notify_news BOOLEAN NOT NULL DEFAULT false;

-- Keep the competition directory extensible without inventing live fixtures.
INSERT INTO competitions(slug,name_en,name_am,category,season,team_count,accent,sort_order) VALUES
('uefa-champions-league','UEFA Champions League','የUEFA ቻምፒዮንስ ሊግ','International',NULL,0,'#FFD21F',70),
('english-premier-league','English Premier League','የእንግሊዝ ፕሪሚየር ሊግ','International',NULL,0,'#0B46A8',80),
('la-liga','La Liga','ላ ሊጋ','International',NULL,0,'#FFD21F',90),
('serie-a','Serie A','ሴሪ ኤ','International',NULL,0,'#0B46A8',100)
ON CONFLICT(slug) DO UPDATE SET
  name_en=EXCLUDED.name_en,
  name_am=EXCLUDED.name_am,
  category=EXCLUDED.category,
  accent=EXCLUDED.accent,
  sort_order=EXCLUDED.sort_order,
  is_active=true;

-- Existing subscriptions created by v2 remain usable by the v2.1 web-push dispatcher.
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE push_subscriptions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
UPDATE push_subscriptions SET is_active=true WHERE is_active IS NULL;

-- The newsroom deliberately keeps editorial provenance fields for verified reporting.
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS source_label VARCHAR(120);
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT false;
