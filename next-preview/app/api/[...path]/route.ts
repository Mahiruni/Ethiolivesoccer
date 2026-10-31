import { NextRequest, NextResponse } from 'next/server';
import {LEAGUES,leagueFromSlug,fixtures,standings,fixtureById,todayEAT,FeedError,season} from '@/lib/football';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:NextRequest,{params}:{params:Promise<{path:string[]}>}){
  const {path}=await params;
  const endpoint=path.join('/');
  try{
    if(endpoint==='provider/status')return json({
      configured:true,provider:'TheSportsDB',realtime:false,limited:true,
      source:'https://www.thesportsdb.com/',season:season(),
      leagues:LEAGUES,notice:'Free v1 shows up to 3 daily fixtures per league and 5 table rows; scores can be delayed.'
    });
    if(endpoint==='competitions')return json(LEAGUES);
    if(endpoint==='matches'){
      const date=request.nextUrl.searchParams.get('date')||todayEAT();
      const league=leagueFromSlug(request.nextUrl.searchParams.get('league'));
      return json(await fixtures(league,date));
    }
    if(endpoint==='standings')return json(await standings(leagueFromSlug(request.nextUrl.searchParams.get('league'))));
    if(path[0]==='match'&&path.length===3&&path[2]==='details')return json({
      match:await fixtureById(path[1]),events:[],lineups:[],statistics:[],h2h:[],
      coverage:{partialFree:true,liveEvents:false},
      notice:'The free API cannot verify full live events, lineups, or statistics.'
    });
    if(endpoint==='health')return json({
      ok:true,service:'EthioLiveScores Next.js preview',footballProvider:'TheSportsDB',
      legacyAuthMigrated:false,productionReady:false
    });
    return json({error:'This API route has not been migrated to Next.js yet.',code:'MIGRATION_INCOMPLETE'},501);
  }catch(error){
    if(error instanceof FeedError)return json({error:error.message,code:error.code},error.status);
    console.error('Next football handler failed',error);
    return json({error:'Football data is temporarily unavailable.',code:'INTERNAL_ERROR'},500);
  }
}
export async function POST(){return json({error:'Account/community APIs remain on the existing production app until secure migration is complete.',code:'MIGRATION_INCOMPLETE'},501)}
export async function PATCH(){return POST()}
export async function PUT(){return POST()}
export async function DELETE(){return POST()}
