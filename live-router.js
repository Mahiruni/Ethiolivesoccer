const express = require('express');
const crypto = require('crypto');
const catalog = require('./competition-catalog.json');

const router = express.Router();
const API_KEY = process.env.API_FOOTBALL_KEY || '';
const DIRECT_BASE = process.env.API_FOOTBALL_BASE || 'https://v3.football.api-sports.io';
const RAPID_BASE = process.env.API_FOOTBALL_RAPID_BASE || 'https://api-football-v1.p.rapidapi.com/v3';
const RAPID_HOST = process.env.API_FOOTBALL_RAPID_HOST || 'api-football-v1.p.rapidapi.com';
const TIMEZONE = 'Africa/Addis_Ababa';
const providerCache = new Map();
const newsCache = new Map();
let preferredProviderMode = null;

router.use((req,res,next)=>{
  res.set('Access-Control-Allow-Origin','*');
  res.set('X-Content-Type-Options','nosniff');
  next();
});

const norm = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ' ).trim();
const slugify = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90) || 'football-news';
const currentYear = () => new Date().getUTCFullYear();
const nowIso = () => new Date().toISOString();

function cacheGet(store,key,maxAge){
  const hit=store.get(key);
  if(!hit||Date.now()-hit.at>maxAge){store.delete(key);return null;}
  return hit.value;
}
function cacheSet(store,key,value){store.set(key,{at:Date.now(),value});return value;}
function publicCache(res,seconds=15,stale=30){res.set('Cache-Control',`public, max-age=0, s-maxage=${seconds}, stale-while-revalidate=${stale}`);}

async function providerRequest(mode,endpoint,params={}){
  const qs=new URLSearchParams(Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>[k,String(v)]));
  const rapid=mode==='rapid';
  const base=rapid?RAPID_BASE:DIRECT_BASE;
  const headers=rapid
    ? {'x-rapidapi-key':API_KEY,'x-rapidapi-host':RAPID_HOST,accept:'application/json'}
    : {'x-apisports-key':API_KEY,accept:'application/json'};
  const response=await fetch(`${base.replace(/\/$/,'')}/${endpoint}?${qs}`,{headers,signal:AbortSignal.timeout(9000)});
  const data=await response.json().catch(()=>null);
  if(!response.ok){
    const error=Object.assign(new Error(`Football provider request failed (${response.status}).`),{status:response.status,data,mode});
    throw error;
  }
  const errors=data?.errors && typeof data.errors==='object' && Object.keys(data.errors).length ? data.errors : null;
  if(errors)throw Object.assign(new Error('Football provider returned an error.'),{status:502,data:errors,mode});
  return data?.response ?? [];
}

async function footballApi(endpoint,params={},ttl=15000){
  if(!API_KEY)throw Object.assign(new Error('Live football provider is not configured.'),{status:503});
  const qs=new URLSearchParams(Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>[k,String(v)]));
  const key=`football:${endpoint}?${qs}`;
  const cached=cacheGet(providerCache,key,ttl);if(cached)return cached;
  const modes=preferredProviderMode?[preferredProviderMode]:['direct','rapid'];
  let lastError;
  for(const mode of modes){
    try{
      const value=await providerRequest(mode,endpoint,params);
      preferredProviderMode=mode;
      return cacheSet(providerCache,key,value);
    }catch(error){
      lastError=error;
      if(preferredProviderMode)preferredProviderMode=null;
      if(![401,403].includes(Number(error.status))&&mode==='direct')break;
    }
  }
  if(modes.length===1){
    const other=modes[0]==='direct'?'rapid':'direct';
    try{
      const value=await providerRequest(other,endpoint,params);
      preferredProviderMode=other;
      return cacheSet(providerCache,key,value);
    }catch(error){lastError=error;}
  }
  throw Object.assign(new Error(lastError?.message||'Football provider is unavailable.'),{status:lastError?.status===401||lastError?.status===403?502:(lastError?.status||502),data:lastError?.data});
}

function catalogForLeague(league={}){
  const lname=norm(league.name),country=norm(league.country);
  let best=null;
  for(const item of catalog){
    const p=item.provider||{};
    if(p.kind!=='league')continue;
    if(p.country&&country&&norm(p.country)!==country)continue;
    const aliases=[item.dbName,item.name,p.search,...(p.aliases||[])].filter(Boolean).map(norm);
    if(aliases.some(a=>a===lname)){best=item;break;}
    if(!best&&aliases.some(a=>a&&lname.includes(a)))best=item;
  }
  if(best)return best;
  if(country==='ethiopia'&&/premier league/.test(lname))return catalog.find(x=>x.slug==='ethiopian-premier-league');
  if(country==='ethiopia'&&/cup/.test(lname))return catalog.find(x=>x.slug==='ethiopian-cup');
  if(/caf champions league/.test(lname))return catalog.find(x=>x.slug==='caf-champions-league');
  if(/caf confederation cup/.test(lname))return catalog.find(x=>x.slug==='caf-confederation-cup');
  if(/africa cup of nations|african cup of nations/.test(lname))return catalog.find(x=>x.slug==='africa-cup-of-nations');
  return null;
}

function priorityFor(item,league={}){
  if(item?.tier==='Domestic'||norm(league.country)==='ethiopia')return 1;
  if(item?.tier==='CAF')return 2;
  if(item?.tier==='National')return 3;
  if(item?.tier==='International')return 4;
  return 9;
}

function mapFixture(x){
  const f=x.fixture||{},l=x.league||{},t=x.teams||{},g=x.goals||{},score=x.score||{};
  const item=catalogForLeague(l);
  return {
    id:`p-${f.id}`,provider_fixture_id:f.id,league_id:l.id,provider_league_id:l.id,
    league_name:l.name,league_name_am:l.name,country:l.country,league_logo:l.logo,season:l.season,round:l.round,
    competition_slug:item?.slug||slugify(l.name),competition_tier:item?.tier||'Other',competition_priority:priorityFor(item,l),
    home_provider_id:t.home?.id,away_provider_id:t.away?.id,home_en:t.home?.name,home_am:t.home?.name,away_en:t.away?.name,away_am:t.away?.name,
    home_logo:t.home?.logo,away_logo:t.away?.logo,home_score:g.home??0,away_score:g.away??0,
    home_halftime:score.halftime?.home,away_halftime:score.halftime?.away,
    status:String(f.status?.short||'NS').toUpperCase(),status_long:f.status?.long,current_minute:f.status?.elapsed??0,
    match_date:f.date,venue_name:f.venue?.name||null,venue_city:f.venue?.city||null,referee:f.referee||null,timezone:f.timezone||'UTC',
    data_source:'API-Football',source_quality:'structured-provider',provider_updated_at:nowIso()
  };
}

function isCuratedFixture(x){
  if(catalogForLeague(x.league))return true;
  const league=norm(x.league?.name),country=norm(x.league?.country);
  if(country==='ethiopia')return true;
  return /world cup|friendlies|world cup qualification caf|africa cup of nations/.test(league) && ((x.teams?.home?.name||'').toLowerCase().includes('ethiopia')||(x.teams?.away?.name||'').toLowerCase().includes('ethiopia'));
}
function scopeMatches(match,scope){
  if(!scope||scope==='all')return true;
  const tier=String(match.competition_tier||'').toLowerCase();
  if(scope==='domestic')return tier==='domestic';
  if(scope==='caf')return tier==='caf';
  if(scope==='national')return tier==='national'||match.home_en==='Ethiopia'||match.away_en==='Ethiopia';
  if(scope==='international')return tier==='international';
  return true;
}
function sortMatches(a,b){return (a.competition_priority-b.competition_priority)||new Date(a.match_date)-new Date(b.match_date)||(a.league_name||'').localeCompare(b.league_name||'');}

async function resolveLeague(item){
  if(!item||item.provider?.kind!=='league')return null;
  const key=`resolve:${item.slug}`;const cached=cacheGet(providerCache,key,6*60*60*1000);if(cached)return cached;
  const p=item.provider||{};
  const rows=await footballApi('leagues',{search:p.search||item.dbName||item.name,current:true},6*60*60*1000);
  const aliases=[item.dbName,item.name,p.search,...(p.aliases||[])].filter(Boolean).map(norm);
  let candidates=rows.filter(r=>!p.country||norm(r.country?.name||r.league?.country)===norm(p.country));
  if(!candidates.length)candidates=rows;
  const chosen=candidates.find(r=>aliases.includes(norm(r.league?.name)))||candidates.find(r=>aliases.some(a=>norm(r.league?.name).includes(a)))||candidates[0];
  if(!chosen)return null;
  const season=chosen.seasons?.find(s=>s.current)||chosen.seasons?.[chosen.seasons.length-1];
  return cacheSet(providerCache,key,{id:chosen.league?.id,name:chosen.league?.name,logo:chosen.league?.logo,country:chosen.country?.name||p.country||item.scope,season:season?.year||currentYear(),coverage:season?.coverage||{}});
}
async function resolveTeam(item){
  if(!item||item.provider?.kind!=='team')return null;
  const key=`team:${item.slug}`;const cached=cacheGet(providerCache,key,12*60*60*1000);if(cached)return cached;
  const p=item.provider||{};
  const rows=await footballApi('teams',{search:p.search||item.name,country:p.country||undefined},12*60*60*1000);
  const chosen=rows.find(r=>norm(r.team?.name)===norm(p.search))||rows[0];
  return chosen?cacheSet(providerCache,key,{id:chosen.team?.id,name:chosen.team?.name,logo:chosen.team?.logo,country:chosen.team?.country}):null;
}

function mapStanding(r){return{rank:r.rank,team_id:r.team?.id,name_en:r.team?.name,name_am:r.team?.name,logo:r.team?.logo,mp:r.all?.played,w:r.all?.win,d:r.all?.draw,l:r.all?.lose,gd:r.goalsDiff,pts:r.points,form:r.form,description:r.description||null};}
function flattenStandings(rows){const groups=rows?.[0]?.league?.standings||[];return groups.flat().map(mapStanding);}
function normalizeStatistics(rows){return(rows||[]).map(team=>({team:{id:team.team?.id,name:team.team?.name,logo:team.team?.logo},statistics:(team.statistics||[]).map(stat=>({name:stat.type,value:stat.value}))}));}
function normalizeLineups(rows){return(rows||[]).map(x=>({team:x.team,formation:x.formation,coach:x.coach,startXI:(x.startXI||[]).map(v=>v.player),substitutes:(x.substitutes||[]).map(v=>v.player)}));}
function normalizeEvents(rows){return(rows||[]).map((e,i)=>({id:e.id||`${e.time?.elapsed||0}-${i}`,minute:e.time?.elapsed||0,extra:e.time?.extra||null,team:e.team,player:e.player,assist:e.assist,type:e.type,detail:e.detail,comments:e.comments||null}));}

router.get('/provider/status',async(req,res)=>{
  publicCache(res,60,120);
  if(!API_KEY)return res.json({configured:false,provider:'API-Football',healthy:false,mode:null,action:'Add a valid API_FOOTBALL_KEY in the deployment environment.'});
  try{
    const rows=await footballApi('leagues',{country:'Ethiopia',current:true},5*60*1000);
    res.json({configured:true,healthy:true,provider:'API-Football',mode:preferredProviderMode||'direct',coverage:{ethiopia:rows.map(r=>r.league?.name).filter(Boolean)},catalog_competitions:catalog.length,timezone:TIMEZONE});
  }catch(error){
    res.status(502).json({configured:true,healthy:false,provider:'API-Football',mode:preferredProviderMode,error:error.message,action:'Replace API_FOOTBALL_KEY with an active API-Sports/API-Football credential. The app will not fabricate live scores while the provider is unavailable.'});
  }
});

router.get('/matches',async(req,res)=>{
  try{
    const live=String(req.query.live||'')==='1';
    const date=String(req.query.date||new Intl.DateTimeFormat('en-CA',{timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
    const scope=String(req.query.scope||'all').toLowerCase();
    const rows=await footballApi('fixtures',live?{live:'all',timezone:TIMEZONE}:{date,timezone:TIMEZONE},live?12000:18000);
    const matches=rows.filter(isCuratedFixture).map(mapFixture).filter(m=>scopeMatches(m,scope)).sort(sortMatches);
    publicCache(res,live?10:15,30);
    res.json(matches);
  }catch(error){res.status(error.status||502).json({error:error.message,source:'API-Football',live:false});}
});

router.get('/standings',async(req,res)=>{
  const slug=String(req.query.slug||'ethiopian-premier-league');
  const item=catalog.find(x=>x.slug===slug);
  if(!item)return res.status(404).json({error:'Competition not found.'});
  if(item.provider?.kind!=='league')return res.json([]);
  try{
    const league=await resolveLeague(item);if(!league)return res.json([]);
    const rows=await footballApi('standings',{league:league.id,season:league.season},60000);
    publicCache(res,60,120);res.json(flattenStandings(rows));
  }catch(error){res.status(error.status||502).json({error:error.message,competition:slug});}
});

router.get('/competitions',(req,res)=>{
  publicCache(res,3600,86400);
  res.json(catalog.map(({provider,...item})=>({...item,liveCapability:provider?.kind==='league'||provider?.kind==='team'})));
});

router.get('/competitions/:slug',async(req,res)=>{
  const item=catalog.find(x=>x.slug===String(req.params.slug||'').toLowerCase());
  if(!item)return res.status(404).json({error:'Competition not found.'});
  const competition={...item};delete competition.provider;
  if(!API_KEY||item.provider?.kind==='news-only'){
    publicCache(res,120,300);return res.json({competition,matches:[],standings:[],demo:false,live:false,source:item.provider?.kind==='news-only'?'local-news':'catalog'});
  }
  try{
    let matches=[],standings=[];
    if(item.provider?.kind==='league'){
      const league=await resolveLeague(item);
      if(league){
        const [past,next,standingRows]=await Promise.all([
          footballApi('fixtures',{league:league.id,season:league.season,last:15,timezone:TIMEZONE},30000).catch(()=>[]),
          footballApi('fixtures',{league:league.id,season:league.season,next:25,timezone:TIMEZONE},30000).catch(()=>[]),
          footballApi('standings',{league:league.id,season:league.season},60000).catch(()=>[])
        ]);
        const seen=new Set();matches=[...past,...next].filter(x=>x.fixture?.id&&!seen.has(x.fixture.id)&&seen.add(x.fixture.id)).map(mapFixture).sort((a,b)=>new Date(a.match_date)-new Date(b.match_date));
        standings=flattenStandings(standingRows);
        competition.logo=competition.logo||league.logo;competition.season=league.season;competition.coverage=league.coverage;
      }
    }else if(item.provider?.kind==='team'){
      const team=await resolveTeam(item);
      if(team){
        const [past,next]=await Promise.all([
          footballApi('fixtures',{team:team.id,last:12,timezone:TIMEZONE},30000).catch(()=>[]),
          footballApi('fixtures',{team:team.id,next:20,timezone:TIMEZONE},30000).catch(()=>[])
        ]);
        const seen=new Set();matches=[...past,...next].filter(x=>x.fixture?.id&&!seen.has(x.fixture.id)&&seen.add(x.fixture.id)).map(mapFixture).sort((a,b)=>new Date(a.match_date)-new Date(b.match_date));
        competition.logo=team.logo;
      }
    }
    publicCache(res,30,90);res.json({competition,matches,standings,demo:false,live:true,source:'API-Football',updatedAt:nowIso()});
  }catch(error){
    publicCache(res,30,60);res.json({competition,matches:[],standings:[],demo:false,live:false,source:'catalog',providerError:error.message});
  }
});

router.get('/match/:id/details',async(req,res)=>{
  const raw=String(req.params.id||'');const providerId=Number(raw.startsWith('p-')?raw.slice(2):raw);
  if(!providerId)return res.status(400).json({error:'A provider fixture id is required.'});
  try{
    const fixtureRows=await footballApi('fixtures',{id:providerId},10000);const fixture=fixtureRows[0];
    if(!fixture)return res.status(404).json({error:'Match not found at live data provider.'});
    const [eventRows,statRows,lineupRows,h2hRows,standingRows]=await Promise.all([
      footballApi('fixtures/events',{fixture:providerId},10000).catch(()=>[]),
      footballApi('fixtures/statistics',{fixture:providerId},15000).catch(()=>[]),
      footballApi('fixtures/lineups',{fixture:providerId},60000).catch(()=>[]),
      fixture.teams?.home?.id&&fixture.teams?.away?.id?footballApi('fixtures/headtohead',{h2h:`${fixture.teams.home.id}-${fixture.teams.away.id}`,last:5},60000).catch(()=>[]):Promise.resolve([]),
      footballApi('standings',{league:fixture.league?.id,season:fixture.league?.season},60000).catch(()=>[])
    ]);
    publicCache(res,10,20);
    res.json({source:'API-Football',updated_at:nowIso(),local_match_id:null,match:mapFixture(fixture),events:normalizeEvents(eventRows),statistics:normalizeStatistics(statRows),lineups:normalizeLineups(lineupRows),h2h:(h2hRows||[]).map(mapFixture),standings:flattenStandings(standingRows).map(r=>({rank:r.rank,name:r.name_en,logo:r.logo,played:r.mp,gd:r.gd,points:r.pts,form:r.form})),coverage:fixture.league?.coverage||null});
  }catch(error){res.status(error.status||502).json({error:error.message,source:'API-Football'});}
});

router.get('/teams',async(req,res)=>{
  try{
    const country=String(req.query.country||'Ethiopia');
    const rows=await footballApi('teams',{country},12*60*60*1000);
    publicCache(res,3600,86400);
    res.json(rows.map(r=>({id:r.team?.id,provider_team_id:r.team?.id,name_en:r.team?.name,name_am:r.team?.name,short_name:r.team?.code||'',logo_url:r.team?.logo,avatar_seed:slugify(r.team?.name)})));
  }catch(error){res.json([]);}
});

function decodeXml(value=''){
  return String(value).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>');
}
function stripHtml(value=''){return decodeXml(value).replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
function xmlTag(block,tag){const match=block.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`,'i'));return match?decodeXml(match[1]).trim():'';}
function sourceFromItem(block,fallback){return stripHtml(xmlTag(block,'source'))||fallback;}
function shortText(value,max=300){const text=stripHtml(value);return text.length>max?`${text.slice(0,max-1).trim()}…`:text;}
function newsSlug(title,date,source){const digest=crypto.createHash('sha1').update(`${title}|${date}|${source}`).digest('hex').slice(0,9);return `${slugify(title).slice(0,68)}-${digest}`;}
function inferCompetition(text=''){
  const n=norm(text);
  const checks=[
    ['ethiopian-premier-league',/ethiopia(n)? premier league|ethiopian premier league|sidama bunna|saint george|st george|ethiopian coffee|ethiopia bunna|fasil kenema/],
    ['ethiopia-national-team',/ethiopia national|walia|ethiopian national|ethiopia vs/],
    ['caf-champions-league',/caf champions league/],['caf-confederation-cup',/caf confederation cup/],['africa-cup-of-nations',/afcon|africa cup of nations/],
    ['uefa-champions-league',/champions league/],['uefa-europa-league',/europa league/],['english-premier-league',/premier league|arsenal|chelsea|liverpool|manchester city|manchester united|tottenham/],
    ['la-liga',/la liga|real madrid|barcelona|atletico madrid/],['serie-a',/serie a|juventus|inter milan|ac milan|napoli/],['bundesliga',/bundesliga|bayern|dortmund/],['ligue-1',/ligue 1|psg|paris saint germain/],['fifa-world-cup',/world cup/]
  ];
  return checks.find(([,re])=>re.test(n))?.[0]||'';
}
function categoryFor(text='',feedCategory=''){
  const n=norm(`${text} ${feedCategory}`);
  if(/transfer|signing|signed|contract|loan/.test(n))return 'Transfers';
  if(/injur|fitness|ruled out|sidelined/.test(n))return 'Injuries';
  if(/preview|vs |fixture|kick off|kickoff/.test(n))return 'Preview';
  if(/ethiopia|ethiopian|walia/.test(n))return 'Ethiopia';
  if(/caf|afcon|africa cup/.test(n))return 'CAF';
  return 'International';
}
function sourceTier(source=''){
  const n=norm(source);
  if(/caf|fifa|uefa|premier league/.test(n))return 'official';
  if(/soccer ethiopia/.test(n))return 'specialist';
  return 'publisher';
}
function parseRss(xml,feed){
  const blocks=String(xml||'').match(/<item[\s\S]*?<\/item>/gi)||[];
  return blocks.slice(0,35).map(block=>{
    const title=shortText(xmlTag(block,'title'),220);if(!title)return null;
    const link=stripHtml(xmlTag(block,'link'))||stripHtml(xmlTag(block,'guid'));
    const publishedAt=xmlTag(block,'pubDate')||xmlTag(block,'date')||nowIso();
    const source=sourceFromItem(block,feed.source);
    const summary=shortText(xmlTag(block,'description')||xmlTag(block,'content:encoded'),320);
    const competitionSlug=inferCompetition(`${title} ${summary}`);
    return {slug:newsSlug(title,publishedAt,source),category:categoryFor(`${title} ${summary}`,feed.category),competitionSlug,titleEn:title,titleAm:'',summaryEn:summary||`Latest football update from ${source}.`,summaryAm:'',bodyEn:summary||`Open the original source for the full report from ${source}.`,bodyAm:'',publishedAt:new Date(publishedAt).toString()==='Invalid Date'?nowIso():new Date(publishedAt).toISOString(),demo:false,source,sourceTier:sourceTier(source),externalUrl:link};
  }).filter(Boolean);
}
const NEWS_FEEDS=[
  {source:'Soccer Ethiopia',category:'Ethiopia',url:'https://soccer.et/feed/'},
  {source:'Google News · Ethiopia football',category:'Ethiopia',url:'https://news.google.com/rss/search?q=%22Ethiopian%20Premier%20League%22%20OR%20%22Ethiopia%20football%22&hl=en&gl=ET&ceid=ET:en'},
  {source:'Google News · CAF',category:'CAF',url:'https://news.google.com/rss/search?q=%22CAF%20Champions%20League%22%20OR%20%22CAF%20Confederation%20Cup%22%20OR%20AFCON&hl=en&gl=ZA&ceid=ZA:en'},
  {source:'BBC Sport Football',category:'International',url:'https://feeds.bbci.co.uk/sport/football/rss.xml'},
  {source:'Google News · World football',category:'International',url:'https://news.google.com/rss/search?q=football%20%28%22Premier%20League%22%20OR%20%22Champions%20League%22%20OR%20%22La%20Liga%22%20OR%20%22Serie%20A%22%29&hl=en&gl=GB&ceid=GB:en'}
];
async function fetchFeed(feed){
  try{
    const response=await fetch(feed.url,{headers:{accept:'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8','user-agent':'EthioLiveScores/2.2 (+football-news-aggregator)'},signal:AbortSignal.timeout(7000)});
    if(!response.ok)return[];return parseRss(await response.text(),feed);
  }catch{return[];}
}
async function aggregateNews(){
  const cached=cacheGet(newsCache,'all',5*60*1000);if(cached)return cached;
  const groups=await Promise.all(NEWS_FEEDS.map(fetchFeed));const seen=new Set();
  const articles=groups.flat().filter(a=>{const key=norm(a.titleEn);if(!key||seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>new Date(b.publishedAt)-new Date(a.publishedAt)).slice(0,80);
  return cacheSet(newsCache,'all',articles);
}
router.get('/news',async(req,res)=>{
  const articles=await aggregateNews();const competition=String(req.query.competition||'');const category=String(req.query.category||'');
  const filtered=articles.filter(a=>(!competition||a.competitionSlug===competition)&&(!category||norm(a.category)===norm(category)));
  publicCache(res,120,300);res.json(filtered);
});
router.get('/news/:slug',async(req,res)=>{
  const articles=await aggregateNews();const article=articles.find(a=>a.slug===req.params.slug);
  if(!article)return res.status(404).json({error:'Live article not found or has expired from the current news window.'});
  publicCache(res,120,300);res.json(article);
});

module.exports=router;
