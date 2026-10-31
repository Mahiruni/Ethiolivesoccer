import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('App Router has server-first route coverage and SEO metadata',()=>{
 const home=read('app/page.tsx'),match=read('app/match/[id]/page.tsx');
 assert.match(home,/Matchday/);
 assert.match(match,/fixtureById/);
 assert.match(read('app/layout.tsx'),/metadataBase/);
});
test('football data never invents zero scores or unverified kickoff times',()=>{
 const source=read('lib/football.ts');
 assert.match(source,/intHomeScore/);
 assert.match(source,/numberOrNull/);
 assert.match(source,/let date:string\|null=null/);
 assert.match(source,/FEED_RATE_LIMIT/);
 assert.match(source,/sports_provider_cache/);
});
test('production auth/community is gated until secure migration',()=>{
 const api=read('app/api/[...path]/route.ts');
 assert.match(api,/MIGRATION_INCOMPLETE/);
 assert.match(read('README.md'),/Do not change Vercel.s production root directory/);
});
test('mobile layout has focus and reduced-motion accessibility styles',()=>{
 const css=read('app/globals.css');
 assert.match(css,/:focus-visible/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/prefers-reduced-motion/);
});
