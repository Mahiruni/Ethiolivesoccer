const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const webpush = require('web-push');
require('dotenv').config();

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '128kb' }));

const JWT_SECRET = process.env.JWT_SECRET || 'ethio_dev_secret_change_me';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@ethiolivescores.local';
const PUSH_DISPATCH_SECRET = process.env.PUSH_DISPATCH_SECRET || '';
const FOOTBALL_API_KEY = process.env.API_FOOTBALL_KEY || '';
const FOOTBALL_API_BASE = process.env.API_FOOTBALL_BASE || 'https://v3.football.api-sports.io';
const FOOTBALL_COUNTRY = process.env.API_FOOTBALL_COUNTRY || 'Ethiopia';
const FOOTBALL_LEAGUE_ID = process.env.API_FOOTBALL_LEAGUE_ID || '';
const FOOTBALL_SEASON = process.env.API_FOOTBALL_SEASON || '';
const providerEnabled = Boolean(FOOTBALL_API_KEY);
const pushEnabled = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (pushEnabled) webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

let pool;
const providerCache = new Map();
function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined, max: 5, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 });
  return pool;
}
function requireDatabase(req,res,next){const db=getPool();if(!db)return res.status(503).json({error:'Database is not configured.',action:'Add DATABASE_URL in Vercel environment variables.'});req.db=db;next();}
function asyncRoute(handler){return(req,res,next)=>Promise.resolve(handler(req,res,next)).catch(next);}
function readToken(req){const auth=req.header('Authorization')||'';const[scheme,token]=auth.split(' ');if(scheme!=='Bearer'||!token)return null;try{return jwt.verify(token,JWT_SECRET)}catch{return null}}
function verifyToken(req,res,next){const user=readToken(req);if(!user)return res.status(401).json({error:'Authentication required.'});req.user=user;next();}
function signUser(userId){return jwt.sign({userId},JWT_SECRET,{expiresIn:'7d'});}
async function tableExists(db,table){const{rows}=await db.query('SELECT to_regclass($1) AS relation',[`public.${table}`]);return Boolean(rows[0]?.relation);}

async function getProfile(db,userId){
  const{rows}=await db.query(`SELECT u.id,u.username,u.email,u.display_name,u.avatar_seed,u.created_at,p.preferred_language,p.theme,p.notify_goals,p.notify_kickoff,p.notify_halftime,p.notify_fulltime,p.notify_red_cards,p.notify_news FROM users u LEFT JOIN user_preferences p ON p.user_id=u.id WHERE u.id=$1`,[userId]);
  if(!rows.length)return null;const r=rows[0];
  return{user:{id:r.id,username:r.username,email:r.email,display_name:r.display_name,avatar_seed:r.avatar_seed,created_at:r.created_at},preferences:{preferred_language:r.preferred_language||'en',theme:r.theme||'system',notify_goals:r.notify_goals??true,notify_kickoff:r.notify_kickoff??true,notify_halftime:r.notify_halftime??false,notify_fulltime:r.notify_fulltime??true,notify_red_cards:r.notify_red_cards??true,notify_news:r.notify_news??false}};
}

function cacheGet(key,maxAgeMs){const hit=providerCache.get(key);if(!hit||Date.now()-hit.at>maxAgeMs){providerCache.delete(key);return null;}return hit.value;}
function cacheSet(key,value){providerCache.set(key,{at:Date.now(),value});return value;}
async function footballApi(endpoint,params={},ttl=15000){
  if(!providerEnabled)throw Object.assign(new Error('Live football provider is not configured.'),{status:503});
  const qs=new URLSearchParams(Object.entries(params).filter(([,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>[k,String(v)]));
  const key=`${endpoint}?${qs}`;const cached=cacheGet(key,ttl);if(cached)return cached;
  const response=await fetch(`${FOOTBALL_API_BASE}/${endpoint}?${qs}`,{headers:{'x-apisports-key':FOOTBALL_API_KEY,'accept':'application/json'}});
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw Object.assign(new Error(`Football provider request failed (${response.status}).`),{status:502,data});
  const errors=data?.errors&&Object.keys(data.errors).length?data.errors:null;
  if(errors)throw Object.assign(new Error('Football provider returned an error.'),{status:502,data:errors});
  return cacheSet(key,data?.response??[]);
}
async function resolveProviderLeague(){
  if(FOOTBALL_LEAGUE_ID)return{id:Number(FOOTBALL_LEAGUE_ID),season:Number(FOOTBALL_SEASON)||new Date().getUTCFullYear(),name:'Ethiopian Premier League'};
  const leagues=await footballApi('leagues',{country:FOOTBALL_COUNTRY,current:true},6*60*60*1000);
  const chosen=leagues.find(x=>/premier/i.test(x?.league?.name||''))||leagues.find(x=>/league/i.test(x?.league?.name||''))||leagues[0];
  if(!chosen)throw Object.assign(new Error(`No current football competition found for ${FOOTBALL_COUNTRY}.`),{status:404});
  const current=chosen.seasons?.find(s=>s.current)||chosen.seasons?.[chosen.seasons.length-1];
  return{id:chosen.league.id,season:Number(FOOTBALL_SEASON)||current?.year||new Date().getUTCFullYear(),name:chosen.league.name,logo:chosen.league.logo,coverage:current?.coverage||{}};
}
const providerStatus=s=>String(s||'NS').toUpperCase();
function mapProviderFixture(x){
  const f=x.fixture||{},l=x.league||{},t=x.teams||{},g=x.goals||{},score=x.score||{};
  return{id:`p-${f.id}`,provider_fixture_id:f.id,league_id:l.id,provider_league_id:l.id,league_name:l.name,league_name_am:l.name,country:l.country,league_logo:l.logo,season:l.season,round:l.round,home_provider_id:t.home?.id,away_provider_id:t.away?.id,home_en:t.home?.name,home_am:t.home?.name,away_en:t.away?.name,away_am:t.away?.name,home_logo:t.home?.logo,away_logo:t.away?.logo,home_score:g.home??0,away_score:g.away??0,home_halftime:score.halftime?.home,away_halftime:score.halftime?.away,status:providerStatus(f.status?.short),status_long:f.status?.long,current_minute:f.status?.elapsed??0,match_date:f.date,venue_name:f.venue?.name||null,venue_city:f.venue?.city||null,referee:f.referee||null,timezone:f.timezone||'UTC',data_source:'API-Football',provider_updated_at:new Date().toISOString()};
}
function normalizeStatRow(stat){return{name:stat.type,value:stat.value};}
function normalizeStatistics(rows){return(rows||[]).map(team=>({team:{id:team.team?.id,name:team.team?.name,logo:team.team?.logo},statistics:(team.statistics||[]).map(normalizeStatRow)}));}
function normalizeLineups(rows){return(rows||[]).map(x=>({team:x.team,formation:x.formation,coach:x.coach,startXI:(x.startXI||[]).map(v=>v.player),substitutes:(x.substitutes||[]).map(v=>v.player)}));}
function normalizeEvents(rows){return(rows||[]).map((e,i)=>({id:e.id||`${e.time?.elapsed||0}-${i}`,minute:e.time?.elapsed||0,extra:e.time?.extra||null,team:e.team,player:e.player,assist:e.assist,type:e.type,detail:e.detail,comments:e.comments||null}));}

async function providerFixturesForDate(date){const league=await resolveProviderLeague();const rows=await footballApi('fixtures',{league:league.id,season:league.season,date},15000);return{league,rows,matches:rows.map(mapProviderFixture)};}
async function providerLiveFixtures(){const league=await resolveProviderLeague();const rows=await footballApi('fixtures',{live:league.id},12000);return{league,rows,matches:rows.map(mapProviderFixture)};}

async function persistProviderFixtures(db,fixtures){
  if(!db||!fixtures?.length)return new Map();
  if(!(await tableExists(db,'matches')))return new Map();
  const columns=await db.query(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='matches'`);
  if(!columns.rows.some(r=>r.column_name==='provider_fixture_id'))return new Map();
  const client=await db.connect(),localIds=new Map();
  try{
    await client.query('BEGIN');
    for(const x of fixtures){const f=x.fixture,l=x.league,h=x.teams.home,a=x.teams.away,g=x.goals,sc=x.score||{};
      const leagueRow=await client.query(`INSERT INTO leagues(name_en,name_am,country,provider_name,provider_league_id,logo_url,season) VALUES($1,$1,$2,'api-football',$3,$4,$5) ON CONFLICT(provider_league_id) DO UPDATE SET name_en=EXCLUDED.name_en,country=EXCLUDED.country,logo_url=EXCLUDED.logo_url,season=EXCLUDED.season RETURNING id`,[l.name,l.country||FOOTBALL_COUNTRY,l.id,l.logo||null,String(l.season||'')]);
      const upsertTeam=async team=>(await client.query(`INSERT INTO teams(name_en,name_am,short_name,avatar_seed,provider_team_id,logo_url) VALUES($1,$1,$2,$3,$4,$5) ON CONFLICT(provider_team_id) DO UPDATE SET name_en=EXCLUDED.name_en,short_name=EXCLUDED.short_name,logo_url=EXCLUDED.logo_url RETURNING id`,[team.name,String(team.name||'').split(/\s+/).map(s=>s[0]).join('').slice(0,5).toUpperCase(),String(team.name||'team').toLowerCase().replace(/[^a-z0-9]+/g,'-'),team.id,team.logo||null])).rows[0].id;
      const homeId=await upsertTeam(h),awayId=await upsertTeam(a);
      const match=await client.query(`INSERT INTO matches(league_id,home_team_id,away_team_id,status,home_score,away_score,current_minute,match_date,provider_fixture_id,round,venue_name,venue_city,referee,timezone,home_halftime,away_halftime,provider_updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW()) ON CONFLICT(provider_fixture_id) DO UPDATE SET status=EXCLUDED.status,home_score=EXCLUDED.home_score,away_score=EXCLUDED.away_score,current_minute=EXCLUDED.current_minute,match_date=EXCLUDED.match_date,round=EXCLUDED.round,venue_name=EXCLUDED.venue_name,venue_city=EXCLUDED.venue_city,referee=EXCLUDED.referee,timezone=EXCLUDED.timezone,home_halftime=EXCLUDED.home_halftime,away_halftime=EXCLUDED.away_halftime,provider_updated_at=NOW() RETURNING id`,[leagueRow.rows[0].id,homeId,awayId,providerStatus(f.status?.short),g.home??0,g.away??0,f.status?.elapsed??0,f.date,f.id,l.round||null,f.venue?.name||null,f.venue?.city||null,f.referee||null,f.timezone||'UTC',sc.halftime?.home??null,sc.halftime?.away??null]);
      localIds.set(Number(f.id),match.rows[0].id);
    }
    await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK');console.error('Provider persistence skipped:',error.message);}finally{client.release();}
  return localIds;
}

app.get('/api/health',asyncRoute(async(req,res)=>{const db=getPool();if(!db)return res.status(503).json({ok:false,service:'EthioLiveScores API',database:'not-configured',provider:providerEnabled?'configured':'not-configured',push:pushEnabled?'configured':'not-configured'});await db.query('SELECT 1');res.json({ok:true,service:'EthioLiveScores API',database:'connected',provider:providerEnabled?'configured':'not-configured',push:pushEnabled?'configured':'not-configured'});}));
app.get('/api/provider/status',asyncRoute(async(req,res)=>{if(!providerEnabled)return res.json({configured:false,provider:'API-Football',action:'Add API_FOOTBALL_KEY to Vercel environment variables.'});try{const league=await resolveProviderLeague();res.json({configured:true,provider:'API-Football',country:FOOTBALL_COUNTRY,league});}catch(error){res.status(error.status||502).json({configured:true,provider:'API-Football',error:error.message});}}));

app.get('/api/matches',asyncRoute(async(req,res)=>{
  if(providerEnabled){
    const date=String(req.query.date||new Date().toISOString().slice(0,10));
    const result=req.query.live==='1'?await providerLiveFixtures():await providerFixturesForDate(date);
    const db=getPool();const localIds=await persistProviderFixtures(db,result.rows);
    return res.json(result.matches.map(m=>({...m,local_match_id:localIds.get(Number(m.provider_fixture_id))||null})));
  }
  const db=getPool();if(!db)return res.status(503).json({error:'Live football data is not configured.',action:'Add API_FOOTBALL_KEY or DATABASE_URL.'});
  const date=String(req.query.date||'');const params=[];let where='';if(date){params.push(date);where=`WHERE (m.match_date AT TIME ZONE 'Africa/Addis_Ababa')::date=$1::date`;}
  const{rows}=await db.query(`SELECT m.*,l.name_en AS league_name,l.name_am AS league_name_am,l.logo_url AS league_logo,t1.name_en AS home_en,t1.name_am AS home_am,t1.short_name AS home_short,t1.logo_url AS home_logo,t2.name_en AS away_en,t2.name_am AS away_am,t2.short_name AS away_short,t2.logo_url AS away_logo FROM matches m JOIN leagues l ON m.league_id=l.id JOIN teams t1 ON m.home_team_id=t1.id JOIN teams t2 ON m.away_team_id=t2.id ${where} ORDER BY m.match_date ASC`,params);res.json(rows);
}));

app.get('/api/standings',asyncRoute(async(req,res)=>{
  if(providerEnabled){const league=await resolveProviderLeague();const rows=await footballApi('standings',{league:league.id,season:league.season},60000);const table=rows?.[0]?.league?.standings?.[0]||[];return res.json(table.map(r=>({rank:r.rank,team_id:r.team?.id,name_en:r.team?.name,name_am:r.team?.name,logo:r.team?.logo,mp:r.all?.played,w:r.all?.win,d:r.all?.draw,l:r.all?.lose,gd:r.goalsDiff,pts:r.points,form:r.form})))}
  const db=getPool();if(!db)return res.status(503).json({error:'Standings data is not configured.'});const{rows}=await db.query('SELECT * FROM league_standings');res.json(rows);
}));
app.get('/api/teams',requireDatabase,asyncRoute(async(req,res)=>{const{rows}=await req.db.query('SELECT id,name_en,name_am,short_name,avatar_seed,logo_url,provider_team_id FROM teams ORDER BY name_en');res.json(rows);}));

app.get('/api/match/:id/details',asyncRoute(async(req,res)=>{
  const raw=String(req.params.id||'');const db=getPool();let providerId=raw.startsWith('p-')?Number(raw.slice(2)):0,localId=null,localMatch=null;
  if(!providerId&&db&&/^\d+$/.test(raw)){const found=await db.query(`SELECT m.*,l.name_en AS league_name,l.name_am AS league_name_am,l.provider_league_id,l.season,h.name_en AS home_en,h.name_am AS home_am,h.logo_url AS home_logo,h.provider_team_id AS home_provider_id,a.name_en AS away_en,a.name_am AS away_am,a.logo_url AS away_logo,a.provider_team_id AS away_provider_id FROM matches m JOIN leagues l ON l.id=m.league_id JOIN teams h ON h.id=m.home_team_id JOIN teams a ON a.id=m.away_team_id WHERE m.id=$1 LIMIT 1`,[Number(raw)]);localMatch=found.rows[0]||null;localId=localMatch?.id||null;providerId=Number(localMatch?.provider_fixture_id||0);}
  if(providerEnabled&&providerId){
    const fixtureRows=await footballApi('fixtures',{id:providerId},10000);const fixture=fixtureRows[0];if(!fixture)return res.status(404).json({error:'Match not found at live data provider.'});
    const mapped=mapProviderFixture(fixture);const localIds=await persistProviderFixtures(db,[fixture]);localId=localId||localIds.get(providerId)||null;
    const eventP=footballApi('fixtures/events',{fixture:providerId},10000).catch(()=>[]),statsP=footballApi('fixtures/statistics',{fixture:providerId},20000).catch(()=>[]),lineupsP=footballApi('fixtures/lineups',{fixture:providerId},60000).catch(()=>[]);
    const h2hP=fixture.teams?.home?.id&&fixture.teams?.away?.id?footballApi('fixtures/headtohead',{h2h:`${fixture.teams.home.id}-${fixture.teams.away.id}`,last:5},60000).catch(()=>[]):Promise.resolve([]);
    const standingP=footballApi('standings',{league:fixture.league?.id,season:fixture.league?.season},60000).catch(()=>[]);
    const[eventRows,statRows,lineupRows,h2hRows,standingRows]=await Promise.all([eventP,statsP,lineupsP,h2hP,standingP]);
    return res.json({source:'API-Football',updated_at:new Date().toISOString(),local_match_id:localId,match:mapped,events:normalizeEvents(eventRows),statistics:normalizeStatistics(statRows),lineups:normalizeLineups(lineupRows),h2h:(h2hRows||[]).map(mapProviderFixture),standings:(standingRows?.[0]?.league?.standings?.[0]||[]).map(r=>({rank:r.rank,name:r.team?.name,logo:r.team?.logo,played:r.all?.played,gd:r.goalsDiff,points:r.points,form:r.form})),coverage:fixture.league?.coverage||null});
  }
  if(db){
    if(!localMatch&&/^\d+$/.test(raw)){const found=await db.query(`SELECT m.*,l.name_en AS league_name,l.name_am AS league_name_am,h.name_en AS home_en,h.name_am AS home_am,h.logo_url AS home_logo,a.name_en AS away_en,a.name_am AS away_am,a.logo_url AS away_logo FROM matches m JOIN leagues l ON l.id=m.league_id JOIN teams h ON h.id=m.home_team_id JOIN teams a ON a.id=m.away_team_id WHERE m.id=$1 LIMIT 1`,[Number(raw)]);localMatch=found.rows[0]||null;localId=localMatch?.id||null;}
    if(!localMatch)return res.status(404).json({error:'Match not found.'});
    const events=(await db.query(`SELECT minute,event_type AS type,description_en AS detail,description_am AS detail_am FROM match_events WHERE match_id=$1 ORDER BY minute,id`,[localId])).rows;
    const standings=(await db.query('SELECT * FROM league_standings LIMIT 30')).rows.map((r,i)=>({rank:i+1,name:r.name_en,played:r.mp,gd:r.gd,points:r.pts}));
    return res.json({source:'PostgreSQL',updated_at:localMatch.provider_updated_at||localMatch.match_date,local_match_id:localId,match:localMatch,events,statistics:[],lineups:[],h2h:[],standings});
  }
  res.status(503).json({error:'Match details are unavailable until a live data source is configured.',action:'Add API_FOOTBALL_KEY in Vercel. PostgreSQL is optional for read-only live match details.'});
}));

app.get('/api/competitions',requireDatabase,asyncRoute(async(req,res)=>{if(await tableExists(req.db,'competitions')){const{rows}=await req.db.query(`SELECT id,slug,name_en,name_am,category,season,team_count,accent FROM competitions WHERE is_active=true ORDER BY sort_order,name_en`);return res.json(rows)}const{rows}=await req.db.query(`SELECT id,LOWER(REGEXP_REPLACE(name_en,'[^a-zA-Z0-9]+','-','g')) AS slug,name_en,name_am,'Domestic' AS category,NULL::text AS season,0 AS team_count,'#0B46A8' AS accent FROM leagues ORDER BY name_en`);res.json(rows);}));
app.get('/api/competitions/:slug',requireDatabase,asyncRoute(async(req,res)=>{const slug=String(req.params.slug||'').toLowerCase();let competition=null;if(await tableExists(req.db,'competitions')){const found=await req.db.query(`SELECT id,slug,name_en,name_am,category,season,team_count,accent FROM competitions WHERE slug=$1 AND is_active=true LIMIT 1`,[slug]);competition=found.rows[0]||null}if(!competition){const found=await req.db.query(`SELECT id,LOWER(REGEXP_REPLACE(name_en,'[^a-zA-Z0-9]+','-','g')) AS slug,name_en,name_am,'Domestic' AS category,NULL::text AS season,0 AS team_count,'#0B46A8' AS accent FROM leagues WHERE LOWER(REGEXP_REPLACE(name_en,'[^a-zA-Z0-9]+','-','g'))=$1 LIMIT 1`,[slug]);competition=found.rows[0]||null}if(!competition)return res.status(404).json({error:'Competition is not in the live database yet.',slug});const league=await req.db.query('SELECT id FROM leagues WHERE LOWER(name_en)=LOWER($1) LIMIT 1',[competition.name_en]);let matches=[];if(league.rows.length){matches=(await req.db.query(`SELECT m.*,l.name_en AS league_name,l.name_am AS league_name_am,h.name_en AS home_en,h.name_am AS home_am,a.name_en AS away_en,a.name_am AS away_am FROM matches m JOIN leagues l ON l.id=m.league_id JOIN teams h ON h.id=m.home_team_id JOIN teams a ON a.id=m.away_team_id WHERE m.league_id=$1 ORDER BY m.match_date DESC LIMIT 50`,[league.rows[0].id])).rows}const standings=slug==='ethiopian-premier-league'?(await req.db.query('SELECT * FROM league_standings LIMIT 30')).rows:[];res.json({competition:{slug:competition.slug,code:String(competition.name_en).split(/\s+/).map(x=>x[0]).join('').slice(0,5).toUpperCase(),name:competition.name_en,nameAm:competition.name_am,scope:competition.category==='CAF'?'Africa':'Ethiopia',type:competition.category||'Competition',description:'Live competition data from EthioLiveScores.',descriptionAm:'ከEthioLiveScores የቀጥታ የውድድር መረጃ።'},matches,standings,demo:false});}));
app.get('/api/news',requireDatabase,asyncRoute(async(req,res)=>{if(!(await tableExists(req.db,'news_articles')))return res.json([]);const{rows}=await req.db.query(`SELECT n.slug,n.category,c.slug AS "competitionSlug",n.title_en AS "titleEn",n.title_am AS "titleAm",n.summary_en AS "summaryEn",n.summary_am AS "summaryAm",COALESCE(n.body_en,'') AS "bodyEn",COALESCE(n.body_am,'') AS "bodyAm",n.published_at AS "publishedAt",false AS demo FROM news_articles n LEFT JOIN competitions c ON c.id=n.competition_id WHERE n.status='published' AND n.published_at<=NOW() ORDER BY n.published_at DESC LIMIT 60`);res.json(rows);}));
app.get('/api/news/:slug',requireDatabase,asyncRoute(async(req,res)=>{if(!(await tableExists(req.db,'news_articles')))return res.status(404).json({error:'Article not found.'});const{rows}=await req.db.query(`SELECT n.slug,n.category,c.slug AS "competitionSlug",n.title_en AS "titleEn",n.title_am AS "titleAm",n.summary_en AS "summaryEn",n.summary_am AS "summaryAm",COALESCE(n.body_en,'') AS "bodyEn",COALESCE(n.body_am,'') AS "bodyAm",n.published_at AS "publishedAt",false AS demo FROM news_articles n LEFT JOIN competitions c ON c.id=n.competition_id WHERE n.slug=$1 AND n.status='published' AND n.published_at<=NOW() LIMIT 1`,[req.params.slug]);if(!rows.length)return res.status(404).json({error:'Article not found.'});res.json(rows[0]);}));

app.post('/api/auth/register',requireDatabase,asyncRoute(async(req,res)=>{const username=String(req.body?.username||'').trim(),email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'');if(username.length<3||username.length>50)return res.status(400).json({error:'Username must be 3–50 characters.'});if(!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({error:'Enter a valid email address.'});if(password.length<8)return res.status(400).json({error:'Password must be at least 8 characters.'});const hash=await bcrypt.hash(password,12),seed=username.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'fan',client=await req.db.connect();try{await client.query('BEGIN');const{rows}=await client.query(`INSERT INTO users(username,email,password_hash,display_name,avatar_seed) VALUES($1,$2,$3,$1,$4) RETURNING id`,[username,email,hash,seed]);await client.query('INSERT INTO user_preferences(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING',[rows[0].id]);await client.query('COMMIT');res.status(201).json({token:signUser(rows[0].id),...await getProfile(req.db,rows[0].id)})}catch(error){await client.query('ROLLBACK');if(error.code==='23505')return res.status(409).json({error:'That username or email is already in use.'});throw error}finally{client.release()}}));
app.post('/api/auth/login',requireDatabase,asyncRoute(async(req,res)=>{const email=String(req.body?.email||'').trim().toLowerCase(),password=String(req.body?.password||'');const{rows}=await req.db.query('SELECT id,password_hash FROM users WHERE email=$1',[email]);if(!rows.length||!(await bcrypt.compare(password,rows[0].password_hash)))return res.status(400).json({error:'Invalid email or password.'});res.json({token:signUser(rows[0].id),...await getProfile(req.db,rows[0].id)});}));
app.get('/api/auth/me',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{const profile=await getProfile(req.db,req.user.userId);if(!profile)return res.status(404).json({error:'Account not found.'});res.json(profile);}));
app.patch('/api/auth/me',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{const username=req.body?.username===undefined?null:String(req.body.username).trim(),displayName=req.body?.display_name===undefined?null:String(req.body.display_name).trim(),avatarSeed=req.body?.avatar_seed===undefined?null:String(req.body.avatar_seed).trim();if(username!==null&&(username.length<3||username.length>50))return res.status(400).json({error:'Username must be 3–50 characters.'});if(displayName!==null&&displayName.length>80)return res.status(400).json({error:'Display name is too long.'});if(avatarSeed!==null&&avatarSeed.length>100)return res.status(400).json({error:'Avatar seed is too long.'});try{await req.db.query(`UPDATE users SET username=COALESCE($2,username),display_name=COALESCE($3,display_name),avatar_seed=COALESCE($4,avatar_seed) WHERE id=$1`,[req.user.userId,username,displayName,avatarSeed])}catch(error){if(error.code==='23505')return res.status(409).json({error:'That username is already taken.'});throw error}res.json(await getProfile(req.db,req.user.userId));}));
app.get('/api/me/favorites',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{const{rows}=await req.db.query(`SELECT t.id,t.name_en,t.name_am,t.short_name,t.avatar_seed,t.logo_url FROM user_favorite_teams f JOIN teams t ON t.id=f.team_id WHERE f.user_id=$1 ORDER BY t.name_en`,[req.user.userId]);res.json(rows);}));
app.post('/api/me/favorites/:teamId',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{await req.db.query('INSERT INTO user_favorite_teams(user_id,team_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.userId,req.params.teamId]);res.sendStatus(204);}));
app.delete('/api/me/favorites/:teamId',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{await req.db.query('DELETE FROM user_favorite_teams WHERE user_id=$1 AND team_id=$2',[req.user.userId,req.params.teamId]);res.sendStatus(204);}));
app.get('/api/me/preferences',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{const profile=await getProfile(req.db,req.user.userId);res.json(profile?.preferences||{});}));
app.put('/api/me/preferences',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{const p=req.body||{},language=['en','am'].includes(p.preferred_language)?p.preferred_language:'en',theme=['system','light','dark'].includes(p.theme)?p.theme:'system',value=key=>Boolean(p[key]);const{rows}=await req.db.query(`INSERT INTO user_preferences(user_id,preferred_language,theme,notify_goals,notify_kickoff,notify_halftime,notify_fulltime,notify_red_cards,notify_news,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) ON CONFLICT(user_id) DO UPDATE SET preferred_language=EXCLUDED.preferred_language,theme=EXCLUDED.theme,notify_goals=EXCLUDED.notify_goals,notify_kickoff=EXCLUDED.notify_kickoff,notify_halftime=EXCLUDED.notify_halftime,notify_fulltime=EXCLUDED.notify_fulltime,notify_red_cards=EXCLUDED.notify_red_cards,notify_news=EXCLUDED.notify_news,updated_at=NOW() RETURNING preferred_language,theme,notify_goals,notify_kickoff,notify_halftime,notify_fulltime,notify_red_cards,notify_news`,[req.user.userId,language,theme,value('notify_goals'),value('notify_kickoff'),value('notify_halftime'),value('notify_fulltime'),value('notify_red_cards'),value('notify_news')]);res.json(rows[0]);}));
app.get('/api/me/predictions',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{const{rows}=await req.db.query(`SELECT p.id,p.match_id,p.vote_choice,m.status,m.home_score,m.away_score,m.match_date,h.name_en AS home_en,a.name_en AS away_en FROM poll_votes p JOIN matches m ON m.id=p.match_id JOIN teams h ON h.id=m.home_team_id JOIN teams a ON a.id=m.away_team_id WHERE p.user_id=$1 ORDER BY p.id DESC LIMIT 50`,[req.user.userId]);res.json(rows);}));
app.get('/api/polls/:matchId',requireDatabase,asyncRoute(async(req,res)=>{const matchId=Number(req.params.matchId),{rows}=await req.db.query('SELECT home_votes,draw_votes,away_votes FROM match_polls WHERE match_id=$1',[matchId]),counts=rows[0]||{home_votes:0,draw_votes:0,away_votes:0},decoded=readToken(req);let myVote=null;if(decoded){const vote=await req.db.query('SELECT vote_choice FROM poll_votes WHERE match_id=$1 AND user_id=$2',[matchId,decoded.userId]);myVote=vote.rows[0]?.vote_choice||null}res.json({...counts,my_vote:myVote});}));
app.post('/api/polls/:matchId',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{const choice=String(req.body?.vote_choice||'').toLowerCase();if(!['home','draw','away'].includes(choice))return res.status(400).json({error:'vote_choice must be home, draw, or away.'});const matchId=Number(req.params.matchId),client=await req.db.connect();try{await client.query('BEGIN');await client.query(`INSERT INTO poll_votes(match_id,user_id,vote_choice) VALUES($1,$2,$3) ON CONFLICT(match_id,user_id) DO UPDATE SET vote_choice=EXCLUDED.vote_choice`,[matchId,req.user.userId,choice]);await client.query(`INSERT INTO match_polls(match_id,home_votes,draw_votes,away_votes) SELECT $1,COUNT(*) FILTER(WHERE vote_choice='home'),COUNT(*) FILTER(WHERE vote_choice='draw'),COUNT(*) FILTER(WHERE vote_choice='away') FROM poll_votes WHERE match_id=$1 ON CONFLICT(match_id) DO UPDATE SET home_votes=EXCLUDED.home_votes,draw_votes=EXCLUDED.draw_votes,away_votes=EXCLUDED.away_votes`,[matchId]);await client.query('COMMIT')}catch(error){await client.query('ROLLBACK');throw error}finally{client.release()}res.status(201).json({ok:true});}));
app.get('/api/chat/:matchId',requireDatabase,asyncRoute(async(req,res)=>{const{rows}=await req.db.query(`SELECT m.*,u.username,u.avatar_seed FROM live_chat_messages m JOIN users u ON u.id=m.user_id WHERE m.match_id=$1 ORDER BY m.created_at DESC LIMIT 30`,[req.params.matchId]);res.json(rows.reverse());}));
app.post('/api/chat/:matchId',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{const message=String(req.body?.message_text||'').trim();if(!message||message.length>280)return res.status(400).json({error:'Message must be 1–280 characters.'});const banned=await req.db.query('SELECT 1 FROM banned_users WHERE banned_user_id=$1 LIMIT 1',[req.user.userId]);if(banned.rowCount)return res.status(403).json({error:'This account is banned from chat.'});await req.db.query('INSERT INTO live_chat_messages(match_id,user_id,message_text) VALUES($1,$2,$3)',[req.params.matchId,req.user.userId,message]);res.sendStatus(201);}));

app.get('/api/push/config',(req,res)=>res.json({enabled:pushEnabled,publicKey:pushEnabled?VAPID_PUBLIC_KEY:null}));
app.post('/api/push/subscribe',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{if(!(await tableExists(req.db,'push_subscriptions')))return res.status(503).json({error:'Push subscription table is not installed. Run database migrations.'});const endpoint=String(req.body?.endpoint||''),p256dh=String(req.body?.keys?.p256dh||''),auth=String(req.body?.keys?.auth||'');if(!endpoint||!p256dh||!auth)return res.status(400).json({error:'Invalid push subscription.'});await req.db.query(`INSERT INTO push_subscriptions(user_id,endpoint,p256dh,auth,user_agent,is_active,updated_at) VALUES($1,$2,$3,$4,$5,true,NOW()) ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,p256dh=EXCLUDED.p256dh,auth=EXCLUDED.auth,user_agent=EXCLUDED.user_agent,is_active=true,updated_at=NOW()`,[req.user.userId,endpoint,p256dh,auth,req.header('user-agent')||null]);res.status(201).json({ok:true});}));
app.delete('/api/push/subscribe',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{const endpoint=String(req.body?.endpoint||'');if(endpoint&&await tableExists(req.db,'push_subscriptions'))await req.db.query('DELETE FROM push_subscriptions WHERE user_id=$1 AND endpoint=$2',[req.user.userId,endpoint]);res.sendStatus(204);}));
async function deliverPush(db,userId,payload){if(!pushEnabled)return{sent:0,failed:0,disabled:true};const{rows}=await db.query('SELECT endpoint,p256dh,auth FROM push_subscriptions WHERE user_id=$1 AND is_active=true',[userId]);let sent=0,failed=0;await Promise.all(rows.map(async sub=>{try{await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify(payload),{TTL:300});sent++}catch(error){failed++;if(error.statusCode===404||error.statusCode===410)await db.query('UPDATE push_subscriptions SET is_active=false,updated_at=NOW() WHERE endpoint=$1',[sub.endpoint])}}));return{sent,failed};}
app.post('/api/push/test',verifyToken,requireDatabase,asyncRoute(async(req,res)=>{if(!pushEnabled)return res.status(503).json({error:'Push delivery is not configured.'});const result=await deliverPush(req.db,req.user.userId,{title:'EthioLiveScores',body:'Push notifications are working on this device. ⚽',url:'/',tag:'push-test',type:'test'});res.json({ok:true,...result});}));
const preferenceColumn=type=>({goal:'notify_goals',kickoff:'notify_kickoff',reminder:'notify_kickoff',halftime:'notify_halftime',fulltime:'notify_fulltime',red_card:'notify_red_cards',news:'notify_news'}[type]||null);
app.post('/api/internal/push/event',requireDatabase,asyncRoute(async(req,res)=>{if(!PUSH_DISPATCH_SECRET||req.header('x-push-secret')!==PUSH_DISPATCH_SECRET)return res.status(403).json({error:'Invalid dispatch secret.'});if(!pushEnabled)return res.status(503).json({error:'Push delivery is not configured.'});const type=String(req.body?.type||''),column=preferenceColumn(type);if(!column)return res.status(400).json({error:'Unsupported notification type.'});const teamId=Number(req.body?.teamId||0),params=[];let where=`p.${column}=true`;if(teamId){params.push(teamId);where+=` AND EXISTS(SELECT 1 FROM user_favorite_teams f WHERE f.user_id=u.id AND f.team_id=$1)`}const users=await req.db.query(`SELECT u.id FROM users u JOIN user_preferences p ON p.user_id=u.id WHERE ${where}`,params);const payload={title:String(req.body?.title||'EthioLiveScores').slice(0,180),body:String(req.body?.body||'New football update').slice(0,500),url:String(req.body?.url||'/'),tag:String(req.body?.tag||type),type};const results=await Promise.all(users.rows.map(row=>deliverPush(req.db,row.id,payload)));res.json({ok:true,users:users.rowCount,sent:results.reduce((a,r)=>a+(r.sent||0),0),failed:results.reduce((a,r)=>a+(r.failed||0),0)});}));

const distDir=path.join(__dirname,'dist');if(fs.existsSync(distDir))app.use(express.static(distDir,{index:false,maxAge:'1h'}));
app.use((req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'API route not found.'});const file=fs.existsSync(path.join(distDir,'index.html'))?path.join(distDir,'index.html'):path.join(__dirname,'index.html');return res.type('html').sendFile(file);});
app.use((err,req,res,next)=>{console.error('EthioLiveScores request error:',err);if(res.headersSent)return next(err);res.status(err.status&&err.status>=400?err.status:500).json({error:err.message||'Internal server error.',detail:process.env.NODE_ENV==='production'?undefined:err.data||err.stack});});
if(require.main===module){const port=Number(process.env.PORT||5000);app.listen(port,()=>console.log(`EthioLiveScores API online on port ${port}`));}
module.exports=app;
