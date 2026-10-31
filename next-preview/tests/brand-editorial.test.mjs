import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
test('Fetan Global Sports Broadcast brand tokens are consistent',()=>{for(const token of ['--bg:#08090b','--surface:#20232a','--text:#ffffff','--lime:#ff453a'])assert.ok(css.includes(token),token)});
test('all major app surfaces share editorial palette',()=>{for(const selector of ['.site-header','.league-pill','.fixture-shell','.table-surface','.account-panel','.community-surface','.news-hero','.article-surface','.match-detail-hero'])assert.ok(css.includes(selector),selector)});
test('club logos remain frameless',()=>assert.match(css,/\.football-logo,\.football-logo-approved\{background:transparent!important;border:0!important/));

test('stylesheet uses only four Fetan hex brand colors',()=>{const allowed=new Set(['#08090b','#20232a','#ffffff','#ff453a']);const colors=[...css.matchAll(/#([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?(?![0-9a-fA-F])/g)].map(m=>'#'+m[1].toLowerCase());const unexpected=[...new Set(colors.filter(c=>!allowed.has(c)))];assert.deepEqual(unexpected,[])});
