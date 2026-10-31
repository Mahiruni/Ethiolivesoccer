import 'server-only';
import type {Fixture,Standing} from './football';
import {FeedError} from './football';
const BASE='https://api.football-data.org/v4';
type Obj=Record<string,any>;
async function get(path:string):Promise<Obj>{
 const key=process.env.FOOTBALL_DATA_API_KEY;
 if(!key)throw new FeedError(503,'PL_KEY_MISSING','Premier League data is not configured.');
 let response:Response;
 try{response=await fetch(BASE+path,{headers:{'X-Auth-Token':key,accept:'application/json'},next:{revalidate:120},signal:AbortSignal.timeout(10000)});}
 catch{throw new FeedError(503,'PL_NETWORK','Premier League provider is unreachable.');}
 if(response.status===429)throw new FeedError(429,'PL_RATE_LIMIT','Premier League API rate limit reached.');
 if(response.status===403||response.status===401)throw new FeedError(502,'PL_ACCESS','Premier League API access was rejected.');
 if(!response.ok)throw new FeedError(502,'PL_UPSTREAM','Premier League API is temporarily unavailable.');
 return response.json() as Promise<Obj>;
}
function logo(x:unknown){return typeof x==='string'&&/^https:\/\//.test(x)?x:null}
function fixture(m:Obj):Fixture{
 const status=m.status==='FINISHED'?'FT':m.status==='IN_PLAY'||m.status==='PAUSED'?'LIVE':m.status==='POSTPONED'||m.status==='CANCELLED'?'PST':'NS';
 return {id:'fd-'+m.id,league:'Premier League',leagueSlug:'premier-league',country:'England',date:m.utcDate||null,
 home:m.homeTeam?.shortName||m.homeTeam?.name||'Home',away:m.awayTeam?.shortName||m.awayTeam?.name||'Away',
 homeScore:m.score?.fullTime?.home??null,awayScore:m.score?.fullTime?.away??null,
 homeTeamId:m.homeTeam?.id?String(m.homeTeam.id):null,awayTeamId:m.awayTeam?.id?String(m.awayTeam.id):null,
 homeLogo:logo(m.homeTeam?.crest),awayLogo:logo(m.awayTeam?.crest),leagueLogo:logo(m.competition?.emblem),
 status,statusLabel:m.status||'Scheduled',venue:m.venue||null};
}
export async function premierFixtures(date:string){
 const data=await get('/competitions/PL/matches?dateFrom='+encodeURIComponent(date)+'&dateTo='+encodeURIComponent(date));
 return (Array.isArray(data.matches)?data.matches:[]).map(fixture) as Fixture[];
}
export async function premierStandings(){
 const data=await get('/competitions/PL/standings');
 const table=(Array.isArray(data.standings)?data.standings:[]).find((s:Obj)=>s.type==='TOTAL')?.table||[];
 return table.map((r:Obj):Standing=>({position:r.position,team:r.team?.shortName||r.team?.name||'Unknown',
 teamId:r.team?.id?String(r.team.id):null,teamLogo:logo(r.team?.crest),
 played:r.playedGames??null,won:r.won??null,drawn:r.draw??null,lost:r.lost??null,
 difference:r.goalDifference??null,points:r.points??null}));
}
export async function premierMatch(id:string){
 if(!/^fd-\d+$/.test(id))throw new FeedError(400,'INVALID_MATCH','Invalid match identifier.');
 const data=await get('/matches/'+id.slice(3));
 return fixture(data);
}
