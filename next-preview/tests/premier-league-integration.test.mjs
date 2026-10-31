import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../lib/premier-league.ts',import.meta.url),'utf8');
const api=readFileSync(new URL('../app/api/[...path]/route.ts',import.meta.url),'utf8');
const logo=readFileSync(new URL('../components/FootballLogo.tsx',import.meta.url),'utf8');

test('PL data is retrieved server-side using an environment-only secret',()=>{
 assert.match(source,/process\.env\.FOOTBALL_DATA_API_KEY/);
 assert.match(source,/['"]X-Auth-Token['"]:\s*key/);
 assert.doesNotMatch(source,/NEXT_PUBLIC_FOOTBALL_DATA_API_KEY/);
 assert.match(source,/\/competitions\/PL\/standings/);
 assert.match(source,/\/competitions\/PL\/matches\?dateFrom=/);
});
test('PL standings uses TOTAL table with no free-feed five-row truncation',()=>{
 assert.match(source,/s\.type==='TOTAL'/);
 assert.match(source,/\.map\(\(r:Obj\):Standing/);
 assert.match(source,/teamLogo:logo\(r\.team\?\.crest\)/);
 assert.match(source,/played:r\.playedGames/);
 assert.match(source,/points:r\.points/);
 assert.doesNotMatch(source,/\.slice\(0,\s*5\)/);
});
test('PL API routing remains separate from other leagues',()=>{
 assert.match(api,/league\.slug==='premier-league'&&process\.env\.FOOTBALL_DATA_API_KEY\?await premierStandings\(\):await standings\(league\)/);
 assert.match(api,/league\.slug==='premier-league'&&process\.env\.FOOTBALL_DATA_API_KEY\?await premierFixtures\(date\):await fixtures\(league,date\)/);
});
test('club crests are displayed without Next image domain restrictions',()=>{
 assert.match(logo,/unoptimized/);
 assert.match(logo,/objectFit:'contain'/);
});
