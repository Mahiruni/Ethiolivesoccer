'use strict';
// Documented TheSportsDB v1 free API (shared public key 123).
// Free endpoints return a maximum of 3 day fixtures and 5 standings rows.
// This is a partial, possibly delayed score feed; not guaranteed real-time.
const express = require('express');
const { Pool } = require('pg');

const router = express.Router();
const BASE = 'https://www.thesportsdb.com/api/v1/json/123';
const LEAGUES = Object.freeze([
  { slug: 'english-premier-league', id: 4328, name: 'Premier League', country: 'England', code: 'PL' },
  { slug: 'la-liga', id: 4335, name: 'La Liga', country: 'Spain', code: 'PD' },
  { slug: 'bundesliga', id: 4331, name: 'Bundesliga', country: 'Germany', code: 'BL1' },
  { slug: 'serie-a', id: 4332, name: 'Serie A', country: 'Italy', code: 'SA' },
  { slug: 'ligue-1', id: 4334, name: 'Ligue 1', country: 'France', code: 'FL1' }
]);
const SHORT_FREE_NOTICE = 'Free feed: up to 3 fixtures per date/league and top 5 standings; updates may be delayed.';
const memory = new Map();
const pending = new Map();
let cooldownUntil = 0;
let pool;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    max: 3, idleTimeoutMillis: 15000, connectionTimeoutMillis: 4000
  });
  return pool;
}
function getLeague(value) {
  const requested = String(value || '').trim().toLowerCase();
  return LEAGUES.find(item => requested === item.slug || requested === item.code.toLowerCase() || requested === String(item.id)) || LEAGUES[0];
}
function currentSeason() {
  const now = new Date();
  const year = now.getUTCFullYear() - (now.getUTCMonth() < 6 ? 1 : 0);
  return year + '-' + (year + 1);
}
function validDate(value) {
  const date = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const checked = new Date(date + 'T12:00:00Z');
  return !Number.isNaN(checked.getTime()) && checked.toISOString().slice(0, 10) === date;
}
function today() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Addis_Ababa', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date());
  const part = key => parts.find(x => x.type === key).value;
  return part('year') + '-' + part('month') + '-' + part('day');
}
function intOrNull(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}
function kickoff(raw) {
  if (raw.strTimestamp && !Number.isNaN(Date.parse(raw.strTimestamp))) {
    return new Date(raw.strTimestamp).toISOString();
  }
  const date = String(raw.dateEvent || '');
  const time = String(raw.strTime || '');
  if (validDate(date) && /^\d{2}:\d{2}/.test(time)) {
    const parts = time.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);
    const iso = date + 'T' + parts[1] + ':' + parts[2] + ':' + (parts[3] || '00') + 'Z';
    if (!Number.isNaN(Date.parse(iso))) return new Date(iso).toISOString();
  }
  return null; // Never invent a kickoff time.
}
function eventStatus(raw) {
  const status = String(raw.strStatus || '').toLowerCase();
  if (/finish|full.?time|after.?extra|^ft$|^aet$/.test(status)) return 'FT';
  if (/live|first half|second half|half.?time|in progress/.test(status)) return 'LIVE';
  if (/postpon|cancel/.test(status)) return 'PST';
  if (/not started|scheduled|upcoming/.test(status)) return 'NS';
  // If we received a score without a definitive status, display the score
  // without incorrectly asserting that the match is final or live.
  return intOrNull(raw.intHomeScore) !== null && intOrNull(raw.intAwayScore) !== null ? 'SCORED' : 'NS';
}
function mapEvent(raw, league) {
  if (!raw || !/^\d+$/.test(String(raw.idEvent || ''))) return null;
  if (!raw.strHomeTeam || !raw.strAwayTeam) return null;
  const status = eventStatus(raw);
  return {
    id: 'tsdb-' + raw.idEvent,
    provider_fixture_id: Number(raw.idEvent),
    league_id: league.id,
    provider_league_id: league.id,
    competition_slug: league.slug,
    league_name: league.name,
    league_name_am: league.name,
    country: league.country,
    league_logo: null,
    season: raw.strSeason || currentSeason(),
    home_provider_id: intOrNull(raw.idHomeTeam),
    away_provider_id: intOrNull(raw.idAwayTeam),
    home_en: raw.strHomeTeam,
    home_am: raw.strHomeTeam,
    away_en: raw.strAwayTeam,
    away_am: raw.strAwayTeam,
    home_logo: null,
    away_logo: null,
    home_score: intOrNull(raw.intHomeScore),
    away_score: intOrNull(raw.intAwayScore),
    status,
    status_long: raw.strStatus || (status === 'SCORED' ? 'Score reported; status unconfirmed' : 'Scheduled'),
    current_minute: 0,
    match_date: kickoff(raw),
    venue_name: raw.strVenue || null,
    data_source: 'TheSportsDB',
    coverage: 'partial-free',
    local_match_id: null
  };
}
function mapStanding(raw, i) {
  return {
    rank: Number(raw.intRank || i + 1),
    team_id: intOrNull(raw.idTeam),
    name_en: String(raw.strTeam || 'Team'),
    name_am: String(raw.strTeam || 'Team'),
    logo: null,
    mp: intOrNull(raw.intPlayed),
    w: intOrNull(raw.intWin),
    d: intOrNull(raw.intDraw),
    l: intOrNull(raw.intLoss),
    gd: raw.intGoalDifference == null ? null : Number(raw.intGoalDifference),
    pts: intOrNull(raw.intPoints),
    form: raw.strForm || null
  };
}
function error(status, code, message, action) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  e.action = action;
  return e;
}
async function fetchCollection(endpoint, field, ttl) {
  const key = 'tsdb:v1:' + endpoint;
  const existing = memory.get(key);
  if (existing && Date.now() < existing.expires) return existing.value;
  if (pending.has(key)) return pending.get(key);
  const job = (async () => {
    const db = getPool();
    if (db) {
      try {
        const result = await db.query('SELECT payload FROM public.sports_provider_cache WHERE cache_key=$1 AND expires_at>NOW()', [key]);
        if (result.rows.length) {
          const value = result.rows[0].payload;
          memory.set(key, { value, expires: Date.now() + Math.min(ttl, 60000) });
          return value;
        }
      } catch (e) { console.warn('International feed cache read:', e.message); }
    }
    if (Date.now() < cooldownUntil) {
      throw error(429, 'FREE_FEED_RATE_LIMIT', 'Free sports data is temporarily rate-limited.', 'Retry in about a minute.');
    }
    const response = await fetch(BASE + '/' + endpoint, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (response.status === 429) {
      cooldownUntil = Date.now() + 60000;
      throw error(429, 'FREE_FEED_RATE_LIMIT', 'The free sports-data provider has reached its rate limit.', 'Wait one minute before refreshing.');
    }
    if (!response.ok) {
      throw error(502, 'FREE_FEED_UNAVAILABLE', 'The free sports-data provider is temporarily unavailable.', 'Retry later.');
    }
    const payload = await response.json().catch(() => null);
    if (!payload || typeof payload !== 'object' || !Object.prototype.hasOwnProperty.call(payload, field)) {
      throw error(502, 'FREE_FEED_INVALID', 'The sports-data provider returned an unexpected response.', 'Retry later.');
    }
    const value = Array.isArray(payload[field]) ? payload[field] : [];
    memory.set(key, { value, expires: Date.now() + ttl });
    if (db) {
      try {
        await db.query(
          'INSERT INTO public.sports_provider_cache(cache_key,payload,expires_at) VALUES ($1,$2::jsonb,NOW()+($3::bigint*INTERVAL \'1 millisecond\')) ON CONFLICT(cache_key) DO UPDATE SET payload=EXCLUDED.payload,expires_at=EXCLUDED.expires_at,fetched_at=NOW()',
          [key, JSON.stringify(value), ttl]
        );
      } catch (e) { console.warn('International feed cache write:', e.message); }
    }
    return value;
  })();
  pending.set(key, job);
  try { return await job; }
  finally { pending.delete(key); }
}
async function matchesForDate(league, date) {
  const endpoint = 'eventsday.php?d=' + encodeURIComponent(date) + '&l=' + league.id;
  const rows = await fetchCollection(endpoint, 'events', date === today() ? 15 * 60 * 1000 : 6 * 60 * 60 * 1000);
  return rows.map(row => ({ raw: row, mapped: mapEvent(row, league) })).filter(item => item.mapped);
}
async function standingsFor(league) {
  const endpoint = 'lookuptable.php?l=' + league.id + '&s=' + encodeURIComponent(currentSeason());
  const rows = await fetchCollection(endpoint, 'table', 60 * 60 * 1000);
  return rows.map(mapStanding);
}
async function attachLocalIds(items, league) {
  const db = getPool();
  if (!db || !items.length) return items.map(item => item.mapped);
  const results = [];
  for (const item of items) {
    const m = item.mapped;
    const teamHome = Number(m.home_provider_id), teamAway = Number(m.away_provider_id);
    const fixture = Number(m.provider_fixture_id);
    if (!Number.isSafeInteger(teamHome) || !Number.isSafeInteger(teamAway) || !Number.isSafeInteger(fixture)) {
      results.push(m);
      continue;
    }
    let conn;
    try {
      conn = await db.connect();
      await conn.query('BEGIN');
      const leagueRow = await conn.query(
        'INSERT INTO leagues(name_en,name_am,country,provider_name,provider_league_id,season) VALUES($1,$1,$2,$3,$4,$5) ON CONFLICT(provider_league_id) DO UPDATE SET name_en=EXCLUDED.name_en,season=EXCLUDED.season RETURNING id',
        [league.name, league.country, 'thesportsdb', 2000000 + league.id, currentSeason()]
      );
      const teams = [];
      for (const data of [[teamHome, m.home_en], [teamAway, m.away_en]]) {
        const row = await conn.query(
          'INSERT INTO teams(name_en,name_am,provider_team_id) VALUES($1,$1,$2) ON CONFLICT(provider_team_id) DO UPDATE SET name_en=EXCLUDED.name_en RETURNING id',
          [data[1], 200000000 + data[0]]
        );
        teams.push(row.rows[0].id);
      }
      const result = await conn.query(
        'INSERT INTO matches(league_id,home_team_id,away_team_id,status,home_score,away_score,current_minute,match_date,provider_fixture_id,timezone,provider_updated_at) VALUES($1,$2,$3,$4,$5,$6,0,$7,$8,$9,NOW()) ON CONFLICT(provider_fixture_id) DO UPDATE SET status=EXCLUDED.status,home_score=EXCLUDED.home_score,away_score=EXCLUDED.away_score,match_date=EXCLUDED.match_date,provider_updated_at=NOW() RETURNING id',
        [leagueRow.rows[0].id, teams[0], teams[1], m.status, m.home_score, m.away_score, m.match_date, 900000000000 + fixture, 'UTC']
      );
      await conn.query('COMMIT');
      results.push({ ...m, local_match_id: result.rows[0].id });
    } catch (e) {
      if (conn) await conn.query('ROLLBACK').catch(() => {});
      console.warn('Could not link free provider event to community database:', e.message);
      results.push(m);
    } finally { if (conn) conn.release(); }
  }
  return results;
}
function safeRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}
router.get('/provider/status', (req, res) => {
  res.set('Cache-Control', 'no-store').json({
    configured: true, provider: 'TheSportsDB', plan: 'Free v1', limited: true,
    realtime: false, season: currentSeason(), league: getLeague(req.query.league),
    leagues: LEAGUES, notice: SHORT_FREE_NOTICE, attribution: 'https://www.thesportsdb.com/'
  });
});
router.get('/matches', safeRoute(async (req, res) => {
  const date = req.query.date == null ? today() : String(req.query.date);
  if (!validDate(date)) throw error(400, 'INVALID_DATE', 'Date must use YYYY-MM-DD.', 'Choose a valid calendar date.');
  const league = getLeague(req.query.league);
  const items = await matchesForDate(league, date);
  return res.json(await attachLocalIds(items, league));
}));
router.get('/standings', safeRoute(async (req, res) => {
  res.json(await standingsFor(getLeague(req.query.league)));
}));
router.get('/match/:id/details', safeRoute(async (req, res, next) => {
  const match = /^tsdb-(\d+)$/.exec(String(req.params.id || ''));
  if (!match) return next();
  const rows = await fetchCollection('lookupevent.php?id=' + match[1], 'events', 30 * 60 * 1000);
  const raw = rows.find(x => String(x.idEvent) === match[1]);
  if (!raw) return res.status(404).json({ error: 'Verified match details unavailable.' });
  const league = LEAGUES.find(x => x.id === Number(raw.idLeague)) || LEAGUES[0];
  const mapped = mapEvent(raw, league);
  if (!mapped) return res.status(404).json({ error: 'Match details are incomplete.' });
  const [linked] = await attachLocalIds([{ raw, mapped }], league);
  return res.json({
    source: 'TheSportsDB', updated_at: new Date().toISOString(),
    local_match_id: linked.local_match_id, match: linked,
    events: [], statistics: [], lineups: [], h2h: [], standings: [],
    coverage: { partialFree: true, liveEvents: false },
    notice: SHORT_FREE_NOTICE
  });
}));
router.get('/competitions', (req, res) => res.json(LEAGUES.map(x => ({
  slug: x.slug, code: x.code, name_en: x.name, name_am: x.name,
  category: 'International', scope: x.country, season: currentSeason(),
  team_count: null, accent: '#3775e8'
}))));
router.get('/competitions/:slug', safeRoute(async (req, res) => {
  const league = LEAGUES.find(x => x.slug === String(req.params.slug || ''));
  if (!league) return res.status(404).json({ error: 'International league unavailable in free feed.' });
  const [fixtures, table] = await Promise.allSettled([matchesForDate(league, today()), standingsFor(league)]);
  const matches = fixtures.status === 'fulfilled' ? await attachLocalIds(fixtures.value, league) : [];
  const standings = table.status === 'fulfilled' ? table.value : [];
  return res.json({
    competition: { slug: league.slug, name: league.name, nameAm: league.name,
      code: league.code, scope: league.country, type: 'League',
      description: SHORT_FREE_NOTICE, descriptionAm: SHORT_FREE_NOTICE },
    matches, standings, demo: false, live: false, source: 'TheSportsDB',
    partialFree: true, providerError: fixtures.status === 'rejected' || table.status === 'rejected'
  });
}));
router.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error('Free international football API error:', err.message);
  res.status(err.status || 502).json({
    error: err.message || 'Free international football data unavailable.',
    code: err.code || 'FREE_FEED_UNAVAILABLE',
    action: err.action || 'Try again later.'
  });
});
module.exports = router;
