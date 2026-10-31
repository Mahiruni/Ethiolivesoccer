'use strict';
// Public, read-only verification of candidate free football-data APIs.
// No credentials, cookies, bypasses, undocumented APIs, or bulk scraping.
const endpoints = [
  { name: 'TheSportsDB league 4959', url: 'https://www.thesportsdb.com/api/v1/json/123/lookupleague.php?id=4959', field: 'leagues' },
  { name: 'TheSportsDB 2026-27 matches', url: 'https://www.thesportsdb.com/api/v1/json/123/eventsseason.php?id=4959&s=2026-2027', field: 'events' },
  { name: 'TheSportsDB 2026-27 table', url: 'https://www.thesportsdb.com/api/v1/json/123/lookuptable.php?l=4959&s=2026-2027', field: 'table' },
  { name: 'SportScore Ethiopia table slug A', url: 'https://sportscore.com/api/widget/standings/?sport=football&slug=ethiopian-premier-league', field: 'standings' },
  { name: 'SportScore Ethiopia table slug B', url: 'https://sportscore.com/api/widget/standings/?sport=football&slug=ethiopia-premier-league', field: 'standings' },
  { name: 'SportScore club recent matches', url: 'https://sportscore.com/api/widget/team/?sport=football&slug=sheger-ketema&limit=20', field: 'matches' },
  { name: 'SportScore live matches', url: 'https://sportscore.com/api/widget/matches/?sport=football&limit=50', field: 'matches' },
  { name: 'SportScore OpenAPI', url: 'https://sportscore.com/developers/openapi.yaml', format: 'text' }
];
async function check(test) {
  try {
    const response = await fetch(test.url, {
      headers: { 'User-Agent': 'EthioLiveSoccer/1.0 public data verification' },
      signal: AbortSignal.timeout(15000)
    });
    const body = await response.text();
    let data;
    try { data = JSON.parse(body); } catch { data = null; }
    if (test.format === 'text') {
      const paths = body.split('\n').filter(line => /^  \/[^ ]+/.test(line)).slice(0, 35);
      return { name: test.name, status: response.status, format: response.headers.get('content-type'), size: body.length, paths };
    }
    const keys = data && typeof data === 'object' ? Object.keys(data) : [];
    const rows = data?.[test.field];
    const samples = Array.isArray(rows) ? rows.slice(0, 3).map(x => ({
      id: x.idEvent || x.idLeague || x.idStanding || x.idTeam || x.id || null,
      name: x.strLeague || x.strEvent || x.strTeam || x.name || x.team?.name || null,
      date: x.dateEvent || x.startDate || x.date || x.fixture?.date || null,
      season: x.strSeason || x.season || null,
      topLevelKeys: Object.keys(x).slice(0, 20)
    })) : [];
    return {
      name: test.name, status: response.status, bytes: body.length,
      dataKeys: keys, targetType: Array.isArray(rows) ? 'array' : typeof rows,
      count: Array.isArray(rows) ? rows.length : null, samples,
      error: data?.error || data?.message || null,
      responsePreview: !data ? body.slice(0, 160) : null
    };
  } catch (error) {
    return { name: test.name, error: error.message };
  }
}
(async () => {
  for (const test of endpoints) {
    console.log('PUBLIC_PROVIDER_PROBE ' + JSON.stringify(await check(test)));
  }
})().catch(e => { console.error('Public provider probe failed:', e.message); process.exitCode = 1; });
