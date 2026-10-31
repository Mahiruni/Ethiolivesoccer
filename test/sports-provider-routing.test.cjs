'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.API_FOOTBALL_KEY = 'fake-test-key';
process.env.GEMINI_API_KEY = '';
delete process.env.DATABASE_URL;
const originalFetch = globalThis.fetch;
const outbound = [];
globalThis.fetch = async (url, options) => {
  const target = String(url);
  if (!target.startsWith('https://v3.football.api-sports.io/')) return originalFetch(url, options);
  outbound.push(target);
  const response = target.includes('/leagues?') ? [
    { league: { id: 777, name: 'Premier League', logo: null },
      seasons: [{ year: 2026, current: true, coverage: { standings: true } }] }
  ] : target.includes('/fixtures?') ? [
    {
      fixture: { id: 123456, date: '2026-10-31T19:00:00+03:00',
        status: { short: 'NS', long: 'Not Started', elapsed: null } },
      league: { id: 777, name: 'Premier League', country: 'Ethiopia', season: 2026 },
      teams: { home: { id: 1, name: 'Home FC' }, away: { id: 2, name: 'Away FC' } },
      goals: { home: null, away: null }, score: { halftime: { home: null, away: null } }
    }
  ] : target.includes('/standings?') ? [
    { league: { standings: [[{
      rank: 1, team: { id: 1, name: 'Home FC' }, all: { played: 1, win: 1, draw: 0, lose: 0 },
      goalsDiff: 1, points: 3, form: 'W'
    }]] } }
  ] : [];
  return { ok: true, status: 200, json: async () => ({ response, errors: [] }) };
};

const app = require('../bootstrap');

test('trusted provider wins over Gemini for live scores when its key is configured', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => {
    globalThis.fetch = originalFetch;
    return new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  });
  const origin = `http://127.0.0.1:${server.address().port}`;

  const status = await originalFetch(origin + '/api/provider/status');
  assert.equal(status.status, 200);
  assert.equal((await status.json()).provider, 'API-Football');

  const first = await originalFetch(origin + '/api/matches?date=2026-10-31');
  assert.equal(first.status, 200);
  const matches = await first.json();
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, 'p-123456');
  assert.equal(matches[0].data_source, 'API-Football');

  const second = await originalFetch(origin + '/api/matches?date=2026-10-31');
  assert.equal(second.status, 200);
  assert.equal(outbound.filter(x => x.includes('/fixtures?')).length, 1, 'fixture request must be cached');

  const standing = await originalFetch(origin + '/api/standings?date=2026-10-31');
  assert.equal(standing.status, 200);
  assert.equal((await standing.json())[0].name_en, 'Home FC');
  assert.equal(outbound.filter(x => x.includes('/leagues?')).length, 1, 'league discovery must be cached');
  assert.ok(outbound.every(x => !x.includes('generativelanguage.googleapis.com')), 'scoreboard must not call Gemini');
});
