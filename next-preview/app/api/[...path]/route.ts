import { NextRequest, NextResponse } from 'next/server';
import {LEAGUES,leagueFromSlug,fixtures,standings,fixtureById,todayEAT,FeedError,season} from '@/lib/football';
import {AuthError,userFromRequest,profile,register,login,updateAccount,favoriteTeams,modifyFavorite,preferences,savePreferences} from '@/lib/auth';
import {poll,vote,chat,postChat,predictions} from '@/lib/community';
import {stories,storyBySlug} from '@/lib/news';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store'}});
function fail(error:unknown){
 if(error instanceof FeedError||error instanceof AuthError)
  return json({error:error.message,code:error.code},error.status);
 console.error('Next API handler failed:',error);
 return json({error:'Service temporarily unavailable.',code:'SERVICE_ERROR'},503);
}
async function body(request:NextRequest){
 const size=Number(request.headers.get('content-length')||0);
 if(size>8000)throw new AuthError(413,'BODY_TOO_LARGE','Request data is too large.');
 return request.json().catch(()=>{throw new AuthError(400,'INVALID_BODY','Invalid JSON data.');});
}
type Ctx={params:Promise<{path:string[]}>};
export async function GET(request:NextRequest,{params}:Ctx){
 const {path}=await params;const endpoint=path.join('/');
 try{
  if(endpoint==='health')return json({ok:true,service:'EthioLiveScores Next.js preview',
   footballProvider:'TheSportsDB',legacyAuthMigrated:true,productionReady:false,
   accountConfigured:Boolean(process.env.DATABASE_URL&&process.env.JWT_SECRET&&process.env.JWT_SECRET.length>=32)});
  if(endpoint==='provider/status')return json({
    configured:true,provider:'TheSportsDB',realtime:false,limited:true,
    source:'https://www.thesportsdb.com/',season:season(),
    leagues:LEAGUES,notice:'Free v1 shows up to 3 daily fixtures per league and 5 table rows; scores can be delayed.'
  });
  if(endpoint==='competitions')return json(LEAGUES);
  if(endpoint==='news')return json(await stories());
  if(path[0]==='news'&&path.length===2){const article=await storyBySlug(path[1]);return article?json(article):json({error:'Article not found.'},404)}
  if(endpoint==='matches'){
    const date=request.nextUrl.searchParams.get('date')||todayEAT();
    const league=leagueFromSlug(request.nextUrl.searchParams.get('league'));
    return json(await fixtures(league,date));
  }
  if(endpoint==='standings')return json(await standings(leagueFromSlug(request.nextUrl.searchParams.get('league'))));
  if(path[0]==='match'&&path.length===3&&path[2]==='details')
    return json({match:await fixtureById(path[1]),events:[],lineups:[],statistics:[],h2h:[],
      coverage:{partialFree:true,liveEvents:false},
      notice:'The free API cannot verify full live events, lineups, or statistics.'});
  if(endpoint==='auth/me')return json(await profile(userFromRequest(request)!));
  if(endpoint==='me/favorites')return json(await favoriteTeams(userFromRequest(request)!));
  if(endpoint==='me/preferences')return json(await preferences(userFromRequest(request)!));
  if(endpoint==='me/predictions')return json(await predictions(userFromRequest(request)!));
  if(path[0]==='polls'&&path.length===2)return json(await poll(path[1],userFromRequest(request,false)));
  if(path[0]==='chat'&&path.length===2)return json(await chat(path[1]));
  return json({error:'This API route has not been migrated to Next.js yet.',code:'MIGRATION_INCOMPLETE'},501);
 }catch(error){return fail(error)}
}
export async function POST(request:NextRequest,{params}:Ctx){
 const {path}=await params;const endpoint=path.join('/');
 try{
  if(endpoint==='auth/register')return json(await register(await body(request)),201);
  if(endpoint==='auth/login')return json(await login(await body(request)));
  if(path[0]==='me'&&path[1]==='favorites'&&path.length===3)
   return json(await modifyFavorite(userFromRequest(request)!,path[2],'POST'),201);
  if(path[0]==='polls'&&path.length===2){const input=await body(request);return json(await vote(path[1],userFromRequest(request)!,input?.vote_choice),201)}
  if(path[0]==='chat'&&path.length===2){const input=await body(request);return json(await postChat(path[1],userFromRequest(request)!,input?.message_text),201)}
  return json({error:'Community/push posting remains in the existing production service during migration.',code:'MIGRATION_INCOMPLETE'},501);
 }catch(error){return fail(error)}
}
export async function PATCH(request:NextRequest,{params}:Ctx){
 const {path}=await params;
 try{
  if(path.join('/')==='auth/me')return json(await updateAccount(userFromRequest(request)!,await body(request)));
  return json({error:'This update route has not been migrated.',code:'MIGRATION_INCOMPLETE'},501);
 }catch(error){return fail(error)}
}
export async function PUT(request:NextRequest,{params}:Ctx){
 const {path}=await params;
 try{
  if(path.join('/')==='me/preferences')return json(await savePreferences(userFromRequest(request)!,await body(request)));
  return json({error:'This update route has not been migrated.',code:'MIGRATION_INCOMPLETE'},501);
 }catch(error){return fail(error)}
}
export async function DELETE(request:NextRequest,{params}:Ctx){
 const {path}=await params;
 try{
  if(path[0]==='me'&&path[1]==='favorites'&&path.length===3)
   return json(await modifyFavorite(userFromRequest(request)!,path[2],'DELETE'));
  return json({error:'This delete route has not been migrated.',code:'MIGRATION_INCOMPLETE'},501);
 }catch(error){return fail(error)}
}
