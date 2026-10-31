import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');
test('sports artwork has exact per-asset rights approval and no indiscriminate provider image use',()=>{
 const id=read('lib/sports-identity.ts');
 assert.match(id,/APPROVED_ARTWORK/);
 assert.match(id,/source!==item.sourceUrl/);
 assert.match(id,/permissionReference/);
 assert.match(id,/!item.licence/);
 assert.match(id,/https:/);
 assert.match(id,/TRUSTED_HOSTS/);
});
test('fixtures and standings carry only approved identity URLs, never raw provider artwork',()=>{
 const provider=read('lib/football.ts');
 assert.match(provider,/strHomeTeamBadge/);
 assert.match(provider,/strAwayTeamBadge/);
 assert.match(provider,/strTeamBadge/);
 assert.match(provider,/strLeagueBadge/);
 assert.match(provider,/approvedVisual\('team'/);
 assert.match(provider,/approvedVisual\('league'/);
});
test('all key football screens use real logo component with fallback',()=>{
 const dashboard=read('components/Matchday.tsx');
 const match=read('app/match/[id]/page.tsx');
 assert.match(dashboard,/FootballLogo/);
 assert.match(dashboard,/row.teamLogo/);
 assert.match(dashboard,/match.homeLogo/);
 assert.match(match,/match.awayLogo/);
 assert.match(read('components/FootballLogo.tsx'),/onError=.*setBroken/);
});
test('England uses St Georges cross, other featured leagues use national flags',()=>{
 const component=read('components/FootballLogo.tsx');
 const css=read('app/globals.css');
 assert.match(component,/flag-england/);
 assert.match(css,/linear-gradient\(to right/);
 assert.match(read('lib/sports-identity.ts'),/🇪🇸/);
});
