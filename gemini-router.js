const express = require('express');

const router = express.Router();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
const GEMINI_API_BASE = process.env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com/v1beta';
const FALLBACK_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];
const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedUpdate = null;

const PROMPT = `
Provide the latest live update for my website API in this exact JSON format:

{
  "timestamp": "ISO 8601 current time",
  "football": {
    "live_matches": [],
    "today_results": [],
    "upcoming_matches": [],
    "standings_top": {
      "Premier League": [],
      "La Liga": [],
      "Serie A": [],
      "Bundesliga": [],
      "Champions League": []
    },
    "transfers_and_rumours": [],
    "top_stories": []
  },
  "other_sports": {
    "nba": [],
    "nfl": [],
    "other": []
  },
  "general_news": {
    "world": [],
    "politics": [],
    "technology": [],
    "business": []
  },
  "sources": []
}

Search Google for the latest available information.

Requirements:
- Never invent scores, fixtures, standings, injuries, transfers or news.
- Prefer information updated within the last 6–12 hours.
- If something cannot be verified, return an empty array for that field.
- Clearly distinguish confirmed transfers from rumours.
- Include only currently relevant major stories.
- Return only valid JSON.
`;

function emptyUpdate() {
  return {
    timestamp: new Date().toISOString(),
    football: {
      live_matches: [],
      today_results: [],
      upcoming_matches: [],
      standings_top: {
        'Premier League': [],
        'La Liga': [],
        'Serie A': [],
        Bundesliga: [],
        'Champions League': []
      },
      transfers_and_rumours: [],
      top_stories: []
    },
    other_sports: { nba: [], nfl: [], other: [] },
    general_news: { world: [], politics: [], technology: [], business: [] },
    sources: []
  };
}

function parseModelJson(text = '') {
  const cleaned = String(text)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  if (!cleaned) throw new Error('Gemini returned an empty response.');
  return JSON.parse(cleaned);
}

function extractSources(payload) {
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

function normalizeUpdate(value, sources, model) {
  const data = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const football = data.football && typeof data.football === 'object' ? data.football : {};
  const standings = football.standings_top && typeof football.standings_top === 'object' ? football.standings_top : {};
  const otherSports = data.other_sports && typeof data.other_sports === 'object' ? data.other_sports : {};
  const generalNews = data.general_news && typeof data.general_news === 'object' ? data.general_news : {};
  const asArray = value => Array.isArray(value) ? value : [];

  return {
    timestamp: new Date().toISOString(),
    football: {
      live_matches: asArray(football.live_matches),
      today_results: asArray(football.today_results),
      upcoming_matches: asArray(football.upcoming_matches),
      standings_top: {
        'Premier League': asArray(standings['Premier League']),
        'La Liga': asArray(standings['La Liga']),
        'Serie A': asArray(standings['Serie A']),
        Bundesliga: asArray(standings.Bundesliga),
        'Champions League': asArray(standings['Champions League'])
      },
      transfers_and_rumours: asArray(football.transfers_and_rumours),
      top_stories: asArray(football.top_stories)
    },
    other_sports: {
      nba: asArray(otherSports.nba),
      nfl: asArray(otherSports.nfl),
      other: asArray(otherSports.other)
    },
    general_news: {
      world: asArray(generalNews.world),
      politics: asArray(generalNews.politics),
      technology: asArray(generalNews.technology),
      business: asArray(generalNews.business)
    },
    sources: sources.length ? sources : asArray(data.sources),
    _meta: { provider: 'Google Gemini', model }
  };
}

async function requestModel(model) {
  const endpoint = `${GEMINI_API_BASE.replace(/\/$/, '')}/models/${encodeURIComponent(model)}:generateContent`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': GEMINI_API_KEY
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
      tools: [{ google_search: {} }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    }),
    signal: AbortSignal.timeout(30000)
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const providerMessage = payload?.error?.message || `Gemini request failed (${response.status}).`;
    const error = new Error(providerMessage);
    error.status = response.status === 401 || response.status === 403 ? 502 : response.status;
    error.providerStatus = response.status;
    error.model = model;
    throw error;
  }

  const text = (payload?.candidates?.[0]?.content?.parts || [])
    .map(part => part?.text || '')
    .join('')
    .trim();

  return normalizeUpdate(parseModelJson(text), extractSources(payload), model);
}

async function fetchGeminiUpdate() {
  if (!GEMINI_API_KEY) {
    const error = new Error('Gemini is not configured. Add GEMINI_API_KEY to the deployment environment.');
    error.status = 503;
    throw error;
  }

  if (cachedUpdate && Date.now() - cachedUpdate.at < CACHE_TTL_MS) {
    return cachedUpdate.value;
  }

  const models = [...new Set([GEMINI_MODEL, ...FALLBACK_MODELS])];
  let lastError;

  for (const model of models) {
    try {
      const data = await requestModel(model);
      cachedUpdate = { at: Date.now(), value: data };
      return data;
    } catch (error) {
      lastError = error;
      const retryable = [404, 429, 500, 502, 503, 504].includes(Number(error.providerStatus || error.status));
      if (!retryable) break;
    }
  }

  throw lastError || new Error('Unable to load a Gemini live update.');
}

router.get('/gemini/status', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    configured: Boolean(GEMINI_API_KEY),
    provider: 'Google Gemini',
    model: GEMINI_MODEL,
    fallbackModels: FALLBACK_MODELS,
    searchGrounding: true,
    action: GEMINI_API_KEY ? null : 'Add GEMINI_API_KEY to the deployment environment.'
  });
});

router.get('/live-update', async (req, res) => {
  try {
    const data = await fetchGeminiUpdate();
    res.set('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=300');
    res.json(data);
  } catch (error) {
    res.status(error.status || 502).json({
      error: error.message || 'Unable to load the grounded live update.',
      provider: 'Google Gemini',
      model: error.model || GEMINI_MODEL,
      configured: Boolean(GEMINI_API_KEY)
    });
  }
});

module.exports = router;
