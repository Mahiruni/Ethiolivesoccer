const express = require('express');
const crypto = require('crypto');
const catalog = require('./competition-catalog.json');

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
const GEMINI_API_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];
const TIMEZONE = 'Africa/Addis_Ababa';
const CURRENT_TTL_MS = 90 * 1000;
const HISTORIC_TTL_MS = 10 * 60 * 1000;
const feedCache = new Map();

const norm = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const slugify = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'football';
const sha = value => crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 12);
const nowIso = () => new Date().toISOString();
const asArray = value => Array.isArray(value) ? value : [];

function addisDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).reduce((acc, p) => (acc[p.type] = p.value, acc), {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : addisDate();
}

function canonicalCompetitionSlug(name = '', provided = '') {
  const p = slugify(provided || '');
  const n = norm(`${provided} ${name}`);
  const aliases = [
    ['ethiopian-premier-league', /ethiopia(n)? premier league|betking ethiopian premier league/],
    ['english-premier-league', /english premier league|premier league|epl/],
    ['la-liga', /la liga|laliga/],
    ['serie-a', /serie a/],
    ['bundesliga', /bundesliga/],
    ['ligue-1', /ligue 1|ligue one/],
    ['uefa-champions-league', /uefa champions league|champions league|ucl/],
    ['uefa-europa-league', /uefa europa league|europa league/],
    ['uefa-conference-league', /conference league/],
    ['caf-champions-league', /caf champions league/],
    ['caf-confederation-cup', /caf confederation cup/],
    ['africa-cup-of-nations', /africa cup of nations|afcon/],
    ['fifa-world-cup', /fifa world cup|world cup/]
  ];
  const hit = aliases.find(([, re]) => re.test(n));
  if (hit) return hit[0];
  if (catalog.some(item => item.slug === p)) return p;
  return p || slugify(name);
}

function statusCode(value = '') {
  const n = norm(value);
  if (/half time|\bht\b/.test(n)) return 'HT';
  if (/full time|\bft\b|finished/.test(n)) return 'FT';
  if (/postpon/.test(n)) return 'PST';
  if (/cancel/.test(n)) return 'CANC';
  if (/extra time/.test(n)) return 'ET';
  if (/penalt/.test(n)) return 'PEN';
  if (/live|1st half|first half/.test(n)) return '1H';
  if (/2nd half|second half/.test(n)) return '2H';
  return 'NS';
}

function scoreNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeMatch(raw = {}, targetDate) {
  const competition = raw.competition || raw.league || 'Football';
  const home = raw.home_team || raw.home || '';
  const away = raw.away_team || raw.away || '';
  if (!home || !away) return null;
  const slug = canonicalCompetitionSlug(competition, raw.competition_slug);
  const kickoff = raw.kickoff_iso || raw.kickoff || raw.match_date || `${targetDate}T12:00:00+03:00`;
  const id = `g-${sha(`${targetDate}|${slug}|${home}|${away}|${kickoff}`)}`;
  const status = statusCode(raw.status);
  return {
    id,
    league_id: slug,
    league_name: competition,
    country: raw.country || '',
    competition_slug: slug,
    competition_tier: /ethiopia/.test(norm(raw.country)) || slug === 'ethiopian-premier-league' ? 'Domestic' : 'International',
    competition_priority: slug === 'ethiopian-premier-league' ? 1 : 4,
    home_en: home,
    home_am: home,
    away_en: away,
    away_am: away,
    home_score: scoreNumber(raw.home_score),
    away_score: scoreNumber(raw.away_score),
    status,
    status_long: raw.status || status,
    current_minute: Number(raw.minute) || 0,
    match_date: kickoff,
    venue_name: raw.venue || null,
    data_source: 'Google Gemini',
    source_quality: 'google-search-grounded',
    source_url: raw.source_url || null,
    events: asArray(raw.events),
    provider_updated_at: nowIso()
  };
}

function standingsMap(feed) {
  const source = feed?.football?.standings || {};
  const out = {};
  for (const [key, rows] of Object.entries(source)) {
    const slug = canonicalCompetitionSlug(key, key);
    out[slug] = asArray(rows).map((r, i) => ({
      rank: Number(r.position || r.rank) || i + 1,
      team_id: `g-team-${sha(`${slug}|${r.team || r.name}`)}`,
      name_en: r.team || r.name || 'Team',
      name_am: r.team || r.name || 'Team',
      logo: '',
      mp: Number(r.played ?? r.mp) || 0,
      w: Number(r.won ?? r.w) || 0,
      d: Number(r.drawn ?? r.d) || 0,
      l: Number(r.lost ?? r.l) || 0,
      gd: Number(r.goal_difference ?? r.gd) || 0,
      pts: Number(r.points ?? r.pts) || 0,
      form: r.form || ''
    }));
  }
  return out;
}

function flattenMatches(feed, targetDate) {
  const f = feed?.football || {};
  const rows = [...asArray(f.live_matches), ...asArray(f.today_results), ...asArray(f.upcoming_matches)];
  const seen = new Set();
  return rows.map(x => normalizeMatch(x, targetDate)).filter(Boolean).filter(m => {
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  }).sort((a, b) => {
    const liveA = ['1H', 'HT', '2H', 'ET', 'PEN'].includes(a.status) ? 0 : 1;
    const liveB = ['1H', 'HT', '2H', 'ET', 'PEN'].includes(b.status) ? 0 : 1;
    return liveA - liveB || new Date(a.match_date) - new Date(b.match_date);
  });
}

function articleRows(feed) {
  const stories = asArray(feed?.football?.top_stories);
  const transfers = asArray(feed?.football?.transfers_and_rumours).map(x => ({ ...x, category: x.category || 'Transfers' }));
  return [...stories, ...transfers].map((a, i) => {
    const title = a.title || a.headline || '';
    if (!title) return null;
    const publishedAt = a.published_at || a.publishedAt || nowIso();
    const source = a.source_name || a.source || 'Google Search';
    const url = a.source_url || a.url || '';
    const slug = `${slugify(title).slice(0, 65)}-${sha(`${title}|${source}|${publishedAt}`)}`;
    return {
      slug,
      category: a.category || 'International',
      competitionSlug: canonicalCompetitionSlug(a.competition || '', a.competition_slug || ''),
      titleEn: title,
      titleAm: '',
      summaryEn: a.summary || a.description || '',
      summaryAm: '',
      bodyEn: a.summary || a.description || '',
      bodyAm: '',
      publishedAt,
      demo: false,
      source,
      sourceTier: 'google-search-grounded',
      externalUrl: url,
      confirmed: a.confirmed ?? null,
      index: i
    };
  }).filter(Boolean);
}

function extractGroundingSources(payload) {
  const chunks = payload?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set();
  const sources = [];
  for (const chunk of chunks) {
    const title = chunk?.web?.title || '';
    const url = chunk?.web?.uri || '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({ title, url });
  }
  return sources;
}

function parseModelJson(text = '') {
  const cleaned = String(text).trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  if (!cleaned) throw new Error('Gemini returned an empty response.');
  return JSON.parse(cleaned);
}

function normalizeFeed(value, sources, model, targetDate) {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const football = data.football && typeof data.football === 'object' ? data.football : {};
  return {
    timestamp: nowIso(),
    timezone: TIMEZONE,
    target_date: targetDate,
    football: {
      live_matches: asArray(football.live_matches),
      today_results: asArray(football.today_results),
      upcoming_matches: asArray(football.upcoming_matches),
      standings: football.standings && typeof football.standings === 'object' ? football.standings : {},
      transfers_and_rumours: asArray(football.transfers_and_rumours),
      top_stories: asArray(football.top_stories)
    },
    sources: sources.length ? sources : asArray(data.sources),
    _meta: { provider: 'Google Gemini', model, grounding: 'Google Search', authoritativeSportsFeed: false }
  };
}

function buildPrompt(targetDate) {
  const current = nowIso();
  const isToday = targetDate === addisDate();
  return `You are the sole upstream football-data engine for EthioLiveScores. Use Google Search grounding to verify current information before returning it.

Current server time: ${current}
Football timezone: ${TIMEZONE}
Target match date: ${targetDate}
Target date is today in Addis Ababa: ${isToday ? 'yes' : 'no'}

Return one valid JSON object with exactly this top-level shape:
{
  "timestamp": "ISO 8601",
  "football": {
    "live_matches": [],
    "today_results": [],
    "upcoming_matches": [],
    "standings": {
      "Ethiopian Premier League": [],
      "Premier League": [],
      "La Liga": [],
      "Serie A": [],
      "Bundesliga": [],
      "Ligue 1": [],
      "Champions League": []
    },
    "transfers_and_rumours": [],
    "top_stories": []
  },
  "sources": []
}

Each match object must use:
{
  "competition": "",
  "competition_slug": "",
  "country": "",
  "home_team": "",
  "away_team": "",
  "home_score": 0,
  "away_score": 0,
  "kickoff_iso": "ISO 8601 with timezone",
  "minute": 0,
  "status": "scheduled | live | HT | FT | postponed | cancelled",
  "venue": "",
  "events": [],
  "source_url": ""
}

Each standing row must use:
{
  "position": 1,
  "team": "",
  "played": 0,
  "won": 0,
  "drawn": 0,
  "lost": 0,
  "goal_difference": 0,
  "points": 0,
  "form": ""
}

Each news/transfer object must use:
{
  "title": "",
  "summary": "",
  "category": "Transfers | Injuries | Ethiopia | CAF | International",
  "competition_slug": "",
  "published_at": "ISO 8601",
  "source_name": "",
  "source_url": "",
  "confirmed": true
}

Coverage requirements:
- For ${targetDate}, search for all discoverable current live matches, completed results and scheduled/upcoming fixtures from major competitions, not just one league.
- Prioritize Ethiopian Premier League, Premier League, La Liga, Serie A, Bundesliga, Ligue 1, UEFA Champions League, UEFA Europa League, UEFA Conference League, CAF Champions League, CAF Confederation Cup, AFCON/major international matches, and Ethiopia national-team fixtures.
- For standings, return the latest verified table for every listed competition where a current table exists. Return [] if it cannot be verified.
- For a live match, include the latest verified score and minute. Never infer or predict the score/minute.
- Results must be completed matches for the target date. Upcoming matches must be scheduled for the target date or clearly identified near-term fixtures if the target date has no fixture.
- Prefer official competition/team sites and reputable sports publishers in search grounding.
- Never invent teams, scores, kickoffs, tables, injuries, transfers, or news.
- If sources disagree, prefer the most recent official/reputable source; if still uncertain, omit the item.
- If a field cannot be verified, use an empty string, 0, false, or [] as appropriate rather than guessing.
- Return JSON only. No markdown or commentary.`;
}

async function requestModel(model, targetDate) {
  const endpoint = `${GEMINI_API_BASE.replace(/\/$/, '')}/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: buildPrompt(targetDate) }] }],
      tools: [{ google_search: {} }],
      generationConfig: { responseMimeType: 'application/json' }
    }),
    signal: AbortSignal.timeout(45000)
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `Gemini request failed (${response.status}).`);
    error.status = response.status === 401 || response.status === 403 ? 502 : response.status;
    error.providerStatus = response.status;
    error.model = model;
    throw error;
  }
  const text = (payload?.candidates?.[0]?.content?.parts || []).map(p => p?.text || '').join('').trim();
  return normalizeFeed(parseModelJson(text), extractGroundingSources(payload), model, targetDate);
}

async function getFeed(date) {
  if (!GEMINI_API_KEY) {
    const error = new Error('Gemini is not configured. Add GEMINI_API_KEY to the deployment environment.');
    error.status = 503;
    throw error;
  }
  const targetDate = validDate(date);
  const ttl = targetDate === addisDate() ? CURRENT_TTL_MS : HISTORIC_TTL_MS;
  const cached = feedCache.get(targetDate);
  if (cached && Date.now() - cached.at < ttl) return cached.value;

  const models = [...new Set([GEMINI_MODEL, ...FALLBACK_MODELS])];
  let lastError;
  for (const model of models) {
    try {
      const value = await requestModel(model, targetDate);
      feedCache.set(targetDate, { at: Date.now(), value });
      return value;
    } catch (error) {
      lastError = error;
      if (Number(error.providerStatus) === 429) break;
      if (![404, 500, 502, 503, 504].includes(Number(error.providerStatus || error.status))) break;
    }
  }
  throw lastError || new Error('Unable to load Gemini football data.');
}

function sendError(res, error) {
  res.status(error.status || 502).json({
    error: error.message || 'Unable to load Gemini football data.',
    provider: 'Google Gemini',
    model: error.model || GEMINI_MODEL,
    configured: Boolean(GEMINI_API_KEY),
    live: false
  });
}

router.get('/gemini/status', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ configured: Boolean(GEMINI_API_KEY), provider: 'Google Gemini', model: GEMINI_MODEL, fallbackModels: FALLBACK_MODELS, googleSearchGrounding: true, footballDataSource: 'Gemini only', timezone: TIMEZONE });
});

router.get('/provider/status', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ configured: Boolean(GEMINI_API_KEY), healthy: Boolean(GEMINI_API_KEY), provider: 'Google Gemini', mode: 'Google Search grounding', footballDataSource: 'Gemini only', timezone: TIMEZONE });
});

router.get('/live-update', async (req, res) => {
  try {
    const feed = await getFeed(req.query.date);
    res.set('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=90');
    res.json(feed);
  } catch (error) { sendError(res, error); }
});

router.get('/matches', async (req, res) => {
  try {
    const date = validDate(req.query.date);
    const feed = await getFeed(date);
    const matches = flattenMatches(feed, date);
    res.set('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=90');
    res.json(matches);
  } catch (error) { sendError(res, error); }
});

router.get('/standings', async (req, res) => {
  try {
    const date = validDate(req.query.date);
    const feed = await getFeed(date);
    const tables = standingsMap(feed);
    const requested = canonicalCompetitionSlug(req.query.slug || '', req.query.slug || '');
    const preferred = requested && tables[requested] ? requested : (tables['ethiopian-premier-league']?.length ? 'ethiopian-premier-league' : 'english-premier-league');
    res.set('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=300');
    res.json(tables[preferred] || Object.values(tables).find(rows => rows.length) || []);
  } catch (error) { sendError(res, error); }
});

router.get('/competitions', (req, res) => {
  res.set('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.json(catalog.map(({ provider, ...item }) => ({ ...item, liveCapability: true, dataProvider: 'Google Gemini' })));
});

router.get('/competitions/:slug', async (req, res) => {
  const item = catalog.find(x => x.slug === String(req.params.slug || '').toLowerCase());
  if (!item) return res.status(404).json({ error: 'Competition not found.' });
  try {
    const date = validDate(req.query.date);
    const feed = await getFeed(date);
    const matches = flattenMatches(feed, date).filter(m => m.competition_slug === item.slug);
    const tables = standingsMap(feed);
    const competition = { ...item, dataProvider: 'Google Gemini' };
    delete competition.provider;
    res.set('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=180');
    res.json({ competition, matches, standings: tables[item.slug] || [], demo: false, live: true, source: 'Google Gemini + Search', updatedAt: feed.timestamp, sources: feed.sources });
  } catch (error) { sendError(res, error); }
});

router.get('/teams', async (req, res) => {
  try {
    const feed = await getFeed(req.query.date);
    const matches = flattenMatches(feed, feed.target_date);
    const tables = standingsMap(feed);
    const names = new Set();
    matches.forEach(m => { names.add(m.home_en); names.add(m.away_en); });
    Object.values(tables).flat().forEach(r => names.add(r.name_en));
    res.set('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=900');
    res.json([...names].filter(Boolean).map(name => ({ id: `g-team-${sha(name)}`, provider_team_id: null, name_en: name, name_am: name, short_name: '', logo_url: '', avatar_seed: slugify(name), data_source: 'Google Gemini' })));
  } catch (error) { sendError(res, error); }
});

router.get('/match/:id/details', async (req, res) => {
  try {
    const feed = await getFeed(req.query.date);
    const matches = flattenMatches(feed, feed.target_date);
    const match = matches.find(m => m.id === req.params.id);
    if (!match) return res.status(404).json({ error: 'Match not found in the latest Gemini-grounded football snapshot.', source: 'Google Gemini' });
    const tables = standingsMap(feed);
    res.set('Cache-Control', 'public, max-age=0, s-maxage=30, stale-while-revalidate=90');
    res.json({
      source: 'Google Gemini + Search', updated_at: feed.timestamp, local_match_id: null, match,
      events: match.events.map((event, i) => typeof event === 'string' ? ({ id: `${match.id}-e${i}`, minute: 0, type: 'Update', detail: event }) : event),
      statistics: [], lineups: [], h2h: [],
      standings: (tables[match.competition_slug] || []).map(r => ({ rank: r.rank, name: r.name_en, logo: r.logo, played: r.mp, gd: r.gd, points: r.pts, form: r.form })),
      coverage: { events: match.events.length > 0, statistics: false, lineups: false }, sources: feed.sources
    });
  } catch (error) { sendError(res, error); }
});

router.get('/news', async (req, res) => {
  try {
    const feed = await getFeed(req.query.date);
    let articles = articleRows(feed);
    if (req.query.competition) articles = articles.filter(a => a.competitionSlug === req.query.competition);
    if (req.query.category) articles = articles.filter(a => norm(a.category) === norm(req.query.category));
    res.set('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=300');
    res.json(articles);
  } catch (error) { sendError(res, error); }
});

router.get('/news/:slug', async (req, res) => {
  try {
    const feed = await getFeed(req.query.date);
    const article = articleRows(feed).find(a => a.slug === req.params.slug);
    if (!article) return res.status(404).json({ error: 'Gemini-grounded article not found in the current snapshot.' });
    res.set('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=300');
    res.json(article);
  } catch (error) { sendError(res, error); }
});

module.exports = router;
