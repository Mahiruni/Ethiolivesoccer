'use strict';
// Read-only, public production smoke test. No credentials or provider secrets.
// Tests actual deployed responses, not the deployment's build status.
const BASE = 'https://ethiolivesoccer.vercel.app';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function read(path) {
  const response = await fetch(BASE + path, {
    signal: AbortSignal.timeout(25000),
    headers: { accept: 'application/json', 'cache-control': 'no-cache' }
  });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}
(async () => {
  let status;
  for (let n = 0; n < 12; n++) {
    status = await read('/api/provider/status?smoke=international');
    if (status.status === 200 && status.data?.provider === 'TheSportsDB') break;
    await pause(10000);
  }
  if (status?.data?.provider !== 'TheSportsDB') throw Error('Production is not serving the international free provider');
  console.log('LIVE_CHECK provider', JSON.stringify({
    status: status.status, provider: status.data.provider,
    leagueCount: status.data.leagues?.length, realtime: status.data.realtime,
    limited: status.data.limited
  }));

  const fixtures = await read('/api/matches?date=2026-10-31&league=english-premier-league');
  console.log('LIVE_CHECK fixtures', JSON.stringify({
    status: fixtures.status, count: Array.isArray(fixtures.data) ? fixtures.data.length : null,
    source: fixtures.data?.[0]?.data_source,
    code: fixtures.data?.code || null, error: fixtures.data?.error || null
  }));
  if (fixtures.status !== 200 || !Array.isArray(fixtures.data)
    || !fixtures.data.length || fixtures.data.some(m => m.data_source !== 'TheSportsDB')) {
    throw Error('Production Premier League fixture integration failed');
  }

  const standings = await read('/api/standings?league=la-liga');
  console.log('LIVE_CHECK standings', JSON.stringify({
    status: standings.status, count: Array.isArray(standings.data) ? standings.data.length : null,
    firstTeam: standings.data?.[0]?.name_en || null,
    error: standings.data?.error || null
  }));
  if (standings.status !== 200 || !Array.isArray(standings.data) || !standings.data.length) {
    throw Error('Production La Liga standings integration failed');
  }
  console.log('LIVE_CHECK PASSED international football website');
})().catch(error => {
  console.error('LIVE_CHECK FAILED:', error.message);
  process.exitCode = 1;
});
