'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// Mock upstream Gemini only, while exercising real HTTP routes locally.
process.env.GEMINI_API_KEY = 'test-only-not-a-real-key';
process.env.NODE_ENV = 'test';
const originalFetch = globalThis.fetch;
let sentRequest;
let includeKickoff = true;

globalThis.fetch = async (url, options) => {
  if (!String(url).startsWith('https://generativelanguage.googleapis.com/')) {
    return originalFetch(url, options);
  }
  sentRequest = JSON.parse(options.body);
  const match = {
    competition: 'Test Competition',
    home_team: 'Test Home',
    away_team: 'Test Away',
    status: 'live',
    home_score: 1,
    away_score: 0,
    ...(includeKickoff ? { kickoff_iso: '2026-10-31T17:00:00+03:00' } : {})
  };
  const feed = { football: {
    live_matches: [match], today_results: [], upcoming_matches: [],
    standings: {}, transfers_and_rumours: [], top_stories: []
  }};
  return { ok: true, status: 200, json: async () => ({
    candidates: [{ content: { parts: [{ text: 'Verified results:\n' + JSON.stringify(feed) }] },
      groundingMetadata: { groundingChunks: [] } }]
  }) };
};

const app = require('../bootstrap');

test('grounded Gemini API requests do not force incompatible JSON response mode', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => {
    globalThis.fetch = originalFetch;
    return new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  });
  const origin = `http://127.0.0.1:${server.address().port}`;

  const response = await originalFetch(origin + '/api/matches?date=2026-10-31');
  assert.equal(response.status, 200);
  const matches = await response.json();
  assert.equal(matches.length, 1);
  assert.equal(matches[0].home_score, 1);
  assert.equal(matches[0].status, '1H');
  assert.deepEqual(sentRequest.tools, [{ google_search: {} }]);
  assert.equal(sentRequest.generationConfig?.responseMimeType, undefined);

  const status = await originalFetch(origin + '/api/provider/status');
  assert.equal(status.status, 200);
  const state = await status.json();
  assert.equal(state.configured, true);
  assert.equal(state.healthy, true);

  includeKickoff = false;
  const noKickoff = await originalFetch(origin + '/api/matches?date=2026-10-30');
  assert.equal(noKickoff.status, 200);
  assert.deepEqual(await noKickoff.json(), []);
});
