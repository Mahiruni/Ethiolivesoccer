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

test('approved logos are also addressable by immutable provider ID on all screens',()=>{
 const source=read('lib/sports-identity.ts');
 assert.match(source,/approvedById/);
 assert.match(source,/return approvedVisual\(kind,providerId,item.sourceUrl,alt\)/);
 const api=read('app/api/[...path]/route.ts');
 assert.match(api,/assets\/coverage/);
 assert.match(api,/logo:approvedById\('league'/);
 const dashboard=read('components/Matchday.tsx');
 assert.match(dashboard,/src=\{verifiedLeagueLogos\[l.slug\]\}/);
 assert.match(dashboard,/src=\{verifiedLeagueLogos\[selected.slug\]\}/);
});
test('asset candidate audit does not download or publish unknown trademark artwork',()=>{
 const script=read('scripts/audit-football-artwork.mjs');
 assert.match(script,/reviewStatus:'unverified'/);
 assert.match(script,/publish:false/);
 assert.match(script,/permissionReference:null/);
 assert.match(script,/idHomeTeam/);
 assert.match(script,/idAwayTeam/);
});
