import 'server-only';
import {accountDatabase,AuthError} from '@/lib/auth';

function matchId(id:string){
 if(!/^\d{1,12}$/.test(id)||Number(id)<1)throw new AuthError(400,'INVALID_MATCH','Invalid match identifier.');
 return Number(id);
}
export async function localMatchId(externalId:string){
 if(!process.env.DATABASE_URL||!/^tsdb-\d{1,12}$/.test(externalId))return null;
 try{
  const id=Number(externalId.slice(5));
  const result=await accountDatabase().query(
   'SELECT id FROM public.matches WHERE provider_fixture_id=$1 LIMIT 1',
   [String(900000000000+id)]);
  return result.rows[0]?.id||null;
 }catch(error){console.warn('Community fixture lookup unavailable:',(error as Error).message);return null}
}
export async function poll(match:string,userId:number|null){
 const id=matchId(match);
 const results=await accountDatabase().query(
  'SELECT home_votes,draw_votes,away_votes FROM public.match_polls WHERE match_id=$1',[id]);
 const data=results.rows[0]||{home_votes:0,draw_votes:0,away_votes:0};
 let myVote:null|string=null;
 if(userId){
  const vote=await accountDatabase().query('SELECT vote_choice FROM public.poll_votes WHERE match_id=$1 AND user_id=$2',[id,userId]);
  myVote=vote.rows[0]?.vote_choice||null;
 }
 return {...data,my_vote:myVote};
}
export async function vote(match:string,userId:number,choice:unknown){
 const id=matchId(match),value=String(choice||'');
 if(!['home','draw','away'].includes(value))throw new AuthError(400,'INVALID_VOTE','Choose home, draw or away.');
 const db=accountDatabase(),client=await db.connect();
 try{
  await client.query('BEGIN');
  await client.query(
   'INSERT INTO public.poll_votes(match_id,user_id,vote_choice) VALUES($1,$2,$3) '+
   'ON CONFLICT(match_id,user_id) DO UPDATE SET vote_choice=EXCLUDED.vote_choice',[id,userId,value]);
  await client.query(
   "INSERT INTO public.match_polls(match_id,home_votes,draw_votes,away_votes) "+
   "SELECT $1,COUNT(*) FILTER(WHERE vote_choice='home'),COUNT(*) FILTER(WHERE vote_choice='draw'),COUNT(*) FILTER(WHERE vote_choice='away') "+
   'FROM public.poll_votes WHERE match_id=$1 ON CONFLICT(match_id) DO UPDATE SET '+
   'home_votes=EXCLUDED.home_votes,draw_votes=EXCLUDED.draw_votes,away_votes=EXCLUDED.away_votes',[id]);
  await client.query('COMMIT');
  return {ok:true};
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
 finally{client.release()}
}
export async function chat(match:string){
 const id=matchId(match);
 const result=await accountDatabase().query(
  'SELECT m.id,m.match_id,m.message_text,m.created_at,u.username,u.avatar_seed '+
  'FROM public.live_chat_messages m JOIN public.users u ON u.id=m.user_id '+
  'WHERE m.match_id=$1 ORDER BY m.created_at DESC LIMIT 30',[id]);
 return result.rows.reverse();
}
export async function postChat(match:string,userId:number,message:unknown){
 const id=matchId(match),text=String(message||'').trim();
 if(!text||text.length>280)throw new AuthError(400,'INVALID_MESSAGE','Message must be 1–280 characters.');
 const db=accountDatabase();
 const banned=await db.query('SELECT 1 FROM public.banned_users WHERE banned_user_id=$1 LIMIT 1',[userId]);
 if(banned.rowCount)throw new AuthError(403,'CHAT_RESTRICTED','This account cannot post in chat.');
 await db.query('INSERT INTO public.live_chat_messages(match_id,user_id,message_text) VALUES($1,$2,$3)',[id,userId,text]);
 return {ok:true};
}
export async function predictions(userId:number){
 const result=await accountDatabase().query(
  'SELECT p.id,p.match_id,p.vote_choice,m.status,m.home_score,m.away_score,m.match_date, '+
  'h.name_en AS home_en,a.name_en AS away_en FROM public.poll_votes p '+
  'JOIN public.matches m ON m.id=p.match_id JOIN public.teams h ON h.id=m.home_team_id '+
  'JOIN public.teams a ON a.id=m.away_team_id WHERE p.user_id=$1 ORDER BY p.id DESC LIMIT 50',[userId]);
 return result.rows;
}
