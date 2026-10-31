import 'server-only';
import { Pool } from 'pg';

export const LEAGUES = [
  {slug:'premier-league', id:4328, name:'Premier League', short:'PL', country:'England', label:'ENG', accent:'#b3f368'},
  {slug:'la-liga', id:4335, name:'La Liga', short:'LL', country:'Spain', label:'ESP', accent:'#ff9774'},
  {slug:'bundesliga', id:4331, name:'Bundesliga', short:'BL', country:'Germany', label:'GER', accent:'#ff627a'},
  {slug:'serie-a', id:4332, name:'Serie A', short:'SA', country:'Italy', label:'ITA', accent:'#80c4ff'},
  {slug:'ligue-1', id:4334, name:'Ligue 1', short:'L1', country:'France', label:'FRA', accent:'#c8afff'}
] as const;
export type League = typeof LEAGUES[number];
export type Fixture = {
  id:string; league:string; leagueSlug:string; country:string; date:string|null;
  home:string; away:string; homeScore:number|null; awayScore:number|null;
  status:'NS'|'LIVE'|'FT'|'PST'|'SCORED'; statusLabel:string; venue:string|null;
};
export type Standing = {position:number;team:string;played:number|null;won:number|null;drawn:number|null;lost:number|null;difference:number|null;points:number|null};
const ORIGIN='https://www.thesportsdb.com/api/v1/json/123';
const memory=new Map<string,{expires:number,value:unknown}>();
const inflight=new Map<string,Promise<unknown>>();
let db:Pool|undefined;

function database(){
  if(!process.env.DATABASE_URL)return null;
  if(!db)db=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:true},max:2,connectionTimeoutMillis:3500,idleTimeoutMillis:10000});
  return db;
}
export function isValidDate(value:string){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const candidate=new Date(value+'T12:00:00Z');
  return Number.isFinite(candidate.getTime()) && candidate.toISOString().slice(0,10)===value;
}
export function todayEAT(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Africa/Addis_Ababa',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part=(type:string)=>parts.find(p=>p.type===type)?.value||'';
  return [part('year'),part('month'),part('day')].join('-');
}
export function season(){
  const now=new Date();
  const year=now.getUTCFullYear()-(now.getUTCMonth()<6?1:0);
  return year+'-'+(year+1);
}
export function leagueFromSlug(slug:string|null|undefined){
  return LEAGUES.find(l=>l.slug===slug)||LEAGUES[0];
}
const numberOrNull=(value:unknown):number|null=>{
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const number=Number(value);
  return Number.isInteger(number)&&number>=0?number:null;
};
export function mapFixture(item:Record<string,unknown>,league:League):Fixture|null{
  if(!/^\d+$/.test(String(item.idEvent||''))||!item.strHomeTeam||!item.strAwayTeam)return null;
  const rawStatus=String(item.strStatus||'').toLowerCase();
  const homeScore=numberOrNull(item.intHomeScore),awayScore=numberOrNull(item.intAwayScore);
  let status:Fixture['status']='NS';
  if(/full.?time|finished|^ft$|after.?extra/.test(rawStatus))status='FT';
  else if(/live|in.progress|first half|second half|half.?time/.test(rawStatus))status='LIVE';
  else if(/postpon|cancel/.test(rawStatus))status='PST';
  else if(homeScore!==null&&awayScore!==null)status='SCORED';
  let date:string|null=null;
  const stamp=String(item.strTimestamp||'');
  if(stamp&&!Number.isNaN(Date.parse(stamp)))date=new Date(stamp).toISOString();
  else {
    const day=String(item.dateEvent||''),time=String(item.strTime||'');
    if(isValidDate(day)&&/^\d{2}:\d{2}/.test(time)){
      const timestamp=day+'T'+time.slice(0,5)+':'+(time.match(/^\d{2}:\d{2}:(\d{2})/)?.[1]||'00')+'Z';
      if(!Number.isNaN(Date.parse(timestamp)))date=new Date(timestamp).toISOString();
    }
  }
  return {id:'tsdb-'+item.idEvent,league:league.name,leagueSlug:league.slug,
    country:league.country,date,home:String(item.strHomeTeam),away:String(item.strAwayTeam),
    homeScore,awayScore,status,statusLabel:String(item.strStatus|| (status==='SCORED'?'Score reported, status unconfirmed':'Scheduled')),
    venue:item.strVenue?String(item.strVenue):null};
}
export function mapStanding(item:Record<string,unknown>,index:number):Standing{
  return {position:numberOrNull(item.intRank)??index+1,team:String(item.strTeam||'Unknown'),
    played:numberOrNull(item.intPlayed),won:numberOrNull(item.intWin),drawn:numberOrNull(item.intDraw),
    lost:numberOrNull(item.intLoss),
    difference:item.intGoalDifference===null||item.intGoalDifference===undefined?null:Number(item.intGoalDifference),
    points:numberOrNull(item.intPoints)};
}
export class FeedError extends Error{
  constructor(public status:number,public code:string,message:string){super(message)}
}
async function collection(endpoint:string,field:'events'|'table',ttl:number):Promise<Record<string,unknown>[]>{
  const key='tsdb:v1:'+endpoint;
  const cached=memory.get(key);
  if(cached&&Date.now()<cached.expires)return cached.value as Record<string,unknown>[];
  if(inflight.has(key))return inflight.get(key) as Promise<Record<string,unknown>[]>;
  const work=(async()=>{
    const pool=database();
    if(pool){
      try{
        const result=await pool.query('SELECT payload FROM public.sports_provider_cache WHERE cache_key=$1 AND expires_at>NOW()',[key]);
        if(result.rows.length){
          const rows=result.rows[0].payload as Record<string,unknown>[];
          memory.set(key,{expires:Date.now()+Math.min(60000,ttl),value:rows});
          return rows;
        }
      }catch(error){console.warn('Next football cache read:',(error as Error).message)}
    }
    let response:Response;
    try{response=await fetch(ORIGIN+'/'+endpoint,{headers:{accept:'application/json'},signal:AbortSignal.timeout(10000),cache:'no-store'})}
    catch{throw new FeedError(503,'FEED_NETWORK','The sports-data provider is temporarily unreachable.')}
    if(response.status===429)throw new FeedError(429,'FEED_RATE_LIMIT','The free football feed is rate limited. Try again shortly.');
    if(!response.ok)throw new FeedError(502,'FEED_DOWN','The football provider is temporarily unavailable.');
    const payload=await response.json().catch(()=>null) as Record<string,unknown>|null;
    if(!payload||!Object.prototype.hasOwnProperty.call(payload,field))throw new FeedError(502,'FEED_INVALID','The provider returned an unexpected response.');
    const rows=Array.isArray(payload[field])?payload[field] as Record<string,unknown>[]:[];
    memory.set(key,{expires:Date.now()+ttl,value:rows});
    if(pool){
      try{await pool.query(
        "INSERT INTO public.sports_provider_cache(cache_key,payload,expires_at) VALUES($1,$2::jsonb,NOW()+($3::bigint*INTERVAL '1 millisecond')) ON CONFLICT(cache_key) DO UPDATE SET payload=EXCLUDED.payload,expires_at=EXCLUDED.expires_at,fetched_at=NOW()",
        [key,JSON.stringify(rows),ttl])}
      catch(error){console.warn('Next football cache write:',(error as Error).message)}
    }
    return rows;
  })();
  inflight.set(key,work);
  try{return await work}finally{inflight.delete(key)}
}
export async function fixtures(league:League,date:string){
  if(!isValidDate(date))throw new FeedError(400,'INVALID_DATE','Choose a valid date in YYYY-MM-DD format.');
  const endpoint='eventsday.php?d='+encodeURIComponent(date)+'&l='+league.id;
  const rows=await collection(endpoint,'events',date===todayEAT()?15*60000:6*3600000);
  return rows.map(x=>mapFixture(x,league)).filter((x):x is Fixture=>Boolean(x));
}
export async function standings(league:League){
  const rows=await collection('lookuptable.php?l='+league.id+'&s='+season(),'table',3600000);
  return rows.map(mapStanding);
}
export async function fixtureById(id:string){
  if(!/^tsdb-\d{1,15}$/.test(id))throw new FeedError(400,'INVALID_MATCH','Invalid match identifier.');
  const rows=await collection('lookupevent.php?id='+id.slice(5),'events',30*60000);
  const item=rows.find(x=>String(x.idEvent)===id.slice(5));
  if(!item)throw new FeedError(404,'MATCH_NOT_FOUND','Verified match details are unavailable.');
  const league=LEAGUES.find(x=>String(x.id)===String(item.idLeague))||LEAGUES[0];
  const result=mapFixture(item,league);
  if(!result)throw new FeedError(404,'MATCH_INCOMPLETE','This match has incomplete source data.');
  return result;
}
