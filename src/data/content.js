import catalog from '../../competition-catalog.json';

// International-first product: only leagues independently verified on the free feed.
const internationalSlugs=new Set(['english-premier-league','la-liga','bundesliga','serie-a','ligue-1']);
export const competitions=catalog.filter(item=>internationalSlugs.has(item.slug));

// Editorial placeholders are retained only as an offline/fallback presentation layer.
// Real newsroom data is fetched from /api/news and replaces these when available.
// Do not publish outdated Ethiopian demo news as international reporting.
export const demoArticles=[];

export function findCompetition(slug){return competitions.find(item=>item.slug===slug)}
export function leagueToSlug(name=''){
  const n=name.toLowerCase();
  const exact=competitions.find(item=>item.name.toLowerCase()===n||item.dbName.toLowerCase()===n||(item.provider?.aliases||[]).some(alias=>alias.toLowerCase()===n));
  return exact?exact.slug:n.replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
