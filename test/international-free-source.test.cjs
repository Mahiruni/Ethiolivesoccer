'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.FOOTBALL_SOURCE = 'thesportsdb';
process.env.API_FOOTBALL_KEY = 'test-legacy-key-should-not-be-used';
delete process.env.DATABASE_URL;
const actualFetch = globalThis.fetch;
const externalCalls = [];
const sample = {
  idEvent: '2494081', idLeague: '4328', strSeason: '2026-2027',
  strHomeTeam: 'Bournemouth', strAwayTeam: 'Leeds United',
  idHomeTeam: '134301', idAwayTeam: '134302',
  dateEvent: '2026-10-31', strTimestamp: '2026-10-31T15:00:00+00:00',
  intHomeScore: null, intAwayScore: null, strStatus: 'Not Started'
};
globalThis.fetch = async url => {
  if (!String(url).startsWith('https://www.thesportsdb.com/')) {
    throw new Error('The score API must not call Gemini, API-Football or unknown providers');
  }
  externalCalls.push(String(url));
  const rows = String(url).includes('eventsday.php')
    ? { events: [sample] }
    : String(url).includes('lookuptable.php')
      ? { table: [{ idTeam: '133601', strTeam: 'Barcelona', intRank: '1', intPlayed: '10', intWin: '9', intDraw: '1', intLoss: '0', intPoints: '28', intGoalDifference: '15' }] }
      : String(url).includes('lookupevent.php')
        ? { events: [sample] } : null;
  if (!rows) throw new Error('Unexpected free-provider endpoint: ' + url);
  return { ok: true, status: 200, json: async () => rows };
};
const app = require('../bootstrap');

test('international free score API selects leagues and preserves unknown scores', async t => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => {
    globalThis.fetch = actualFetch;
    return new Promise((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
  });
  const origin = 'http://127.0.0.1:' + server.address().port;
  const get = path => actualFetch(origin + path);

  const status = await get('/api/provider/status');
  assert.equal(status.status, 200);
  const provider = await status.json();
  assert.equal(provider.provider, 'TheSportsDB');
  assert.equal(provider.limited, true);
  assert.equal(provider.realtime, false);
  assert.equal(provider.leagues.length, 5);
  assert.equal(externalCalls.length, 0, 'provider status must not spend API calls');

  const matchesResponse = await get('/api/matches?date=2026-10-31&league=english-premier-league');
  assert.equal(matchesResponse.status, 200);
  const matches = await matchesResponse.json();
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, 'tsdb-2494081');
  assert.equal(matches[0].home_en, 'Bournemouth');
  assert.equal(matches[0].home_score, null);
  assert.equal(matches[0].away_score, null);
  assert.equal(matches[0].competition_slug, 'english-premier-league');
  assert.equal(matches[0].status, 'NS');
  assert.equal(matches[0].data_source, 'TheSportsDB');

  const cached = await get('/api/matches?date=2026-10-31&league=english-premier-league');
  assert.equal(cached.status, 200);
  assert.equal(externalCalls.filter(url => url.includes('eventsday.php')).length, 1);

  const standings = await get('/api/standings?league=la-liga');
  assert.equal(standings.status, 200);
  const table = await standings.json();
  assert.equal(table[0].name_en, 'Barcelona');
  assert.equal(table[0].pts, 28);
  assert.equal(externalCalls.filter(url => url.includes('lookuptable.php')).length, 1);

  const details = await get('/api/match/tsdb-2494081/details');
  assert.equal(details.status, 200);
  const detailBody = await details.json();
  assert.equal(detailBody.source, 'TheSportsDB');
  assert.equal(detailBody.match.id, 'tsdb-2494081');
  assert.equal(detailBody.coverage.liveEvents, false);

  const leagues = await get('/api/competitions');
  assert.equal(leagues.status, 200);
  assert.equal((await leagues.json()).length, 5);

  const invalid = await get('/api/matches?date=2026-02-30');
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).code, 'INVALID_DATE');

  assert.ok(externalCalls.every(url => url.includes('/api/v1/json/123/')));
});
