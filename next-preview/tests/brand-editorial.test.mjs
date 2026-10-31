import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../app/globals.css',import.meta.url),'utf8');
test('Football Editorial brand tokens are consistent',()=>{for(const token of ['--bg:#101010','--surface:#1d1d1d','--text:#f5f5f2','--lime:#d9ff43'])assert.ok(css.includes(token),token)});
test('all major app surfaces share editorial palette',()=>{for(const selector of ['.site-header','.league-pill','.fixture-shell','.table-surface','.account-panel','.community-surface','.news-hero','.article-surface','.match-detail-hero'])assert.ok(css.includes(selector),selector)});
test('club logos remain frameless',()=>assert.match(css,/\.football-logo,\.football-logo-approved\{background:transparent!important;border:0!important/));
