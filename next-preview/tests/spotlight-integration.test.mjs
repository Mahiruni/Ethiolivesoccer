import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const spotlight=readFileSync(new URL('../components/MatchSpotlight.tsx',import.meta.url),'utf8');
const matchday=readFileSync(new URL('../components/Matchday.tsx',import.meta.url),'utf8');
test('homepage renders the dynamic spotlight rather than static hero',()=>{assert.match(matchday,/MatchSpotlight matches=\{state\.fixtures\}/);assert.doesNotMatch(matchday,/className="hero"/)});
test('spotlight uses actual fixture fields and navigates to match center',()=>{for(const field of ['m.home','m.away','m.homeLogo','m.awayLogo','m.status','m.date'])assert.ok(spotlight.includes(field));assert.ok(spotlight.includes("href={'/match/'+m.id}"))});
test('spotlight limits slides and provides touch, keyboard-friendly controls',()=>{assert.match(spotlight,/slice\(0,4\)/);assert.match(spotlight,/onTouchStart/);assert.match(spotlight,/aria-label="Next spotlight"/);assert.match(spotlight,/aria-label="Previous spotlight"/)});
test('standings display every returned row',()=>{assert.match(matchday,/state\.standings\.map\(row=>/);assert.doesNotMatch(matchday,/state\.standings\.slice\(0,5\)/)});
