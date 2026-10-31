'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.API_FOOTBALL_KEY = 'test-key-not-real';
delete process.env.DATABASE_URL;
const fetchOriginal = globalThis.fetch;
const requests = [];
globalThis.fetch = async (url, options = {}) => {
  if (!String(url).startsWith('https://v3.football.api-sports.io/')) {
    return fetchOriginal(url, options);
  }
  requests.push({ url: String(url), headers: options.headers });
  if (String(url).includes('/status')) return {
    ok: true, status: 200, json: async () => ({
      response: { subscription: { plan: 'Free', active: true },
        requests: { current: 4, limit_day: 100 } }
    })
  };
  if (String(url).includes('/leagues?')) return {
    ok: true, status: 200, json: async () => ({
      response: [{
        league: { id: 363, name: 'Premier League' },
        seasons: [{ year: 2026, current: true, coverage: { fixtures: { events: true }, standings: true } }]
      }], errors: []
    })
  };
  throw new Error('The free-plan season guard must not call metered fixtures or standings endpoints.');
};
const app = require('../bootstrap');

test('API-Football Free plan reports unavailable 2026 season without wasting requests', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => {
    globalThis.fetch = fetchOriginal;
    return new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  });
  const url = `http://127.0.0.1:${server.address().port}`;

  const providerResponse = await fetchOriginal(url + '/api/provider/status');
  assert.equal(providerResponse.status, 200);
  const provider = await providerResponse.json();
  assert.equal(provider.provider, 'API-Football');
  assert.equal(provider.subscription.plan, 'Free');
  assert.equal(provider.league.season, 2026);
  assert.equal(provider.currentSeasonAccessible, false);

  const fixturesResponse = await fetchOriginal(url + '/api/matches?date=2026-10-31');
  assert.equal(fixturesResponse.status, 403);
  const fixtures = await fixturesResponse.json();
  assert.equal(fixtures.code, 'PROVIDER_SEASON_RESTRICTED');
  assert.match(fixtures.error, /free plan/i);
  assert.match(fixtures.action, /plan/i);

  const standingsResponse = await fetchOriginal(url + '/api/standings');
  assert.equal(standingsResponse.status, 403);
  assert.equal((await standingsResponse.json()).code, 'PROVIDER_SEASON_RESTRICTED');

  assert.ok(requests.some(r => r.url.endsWith('/status')));
  assert.ok(requests.some(r => r.url.includes('/leagues?')));
  assert.equal(requests.some(r => r.url.includes('/fixtures?') || r.url.includes('/standings?')), false);
  assert.ok(requests.every(r => Object.keys(r.headers).join(',') === 'x-apisports-key'));
});
