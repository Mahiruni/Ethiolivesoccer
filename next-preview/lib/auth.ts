import 'server-only';
import {Pool} from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type {NextRequest} from 'next/server';

export class AuthError extends Error{
 constructor(public status:number,public code:string,message:string){super(message)}
}
const signingKey=process.env.JWT_SECRET || '';
let pool:Pool|undefined;
function getDb(){
  if(!process.env.DATABASE_URL)throw new AuthError(503,'DB_NOT_CONFIGURED','Account service is not configured in this preview.');
  if(!pool)pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:3,connectionTimeoutMillis:5000,idleTimeoutMillis:15000});
  return pool;
}
function signingSecret(){
  if(signingKey.length<32)throw new AuthError(503,'AUTH_NOT_CONFIGURED','Account sign-in is not configured in this preview.');
  return signingKey;
}
export function userFromRequest(request:NextRequest,required=true){
  const auth=request.headers.get('authorization')||'';
  const token=/^Bearer (.+)$/.exec(auth)?.[1];
  if(!token){if(required)throw new AuthError(401,'AUTH_REQUIRED','Sign in to continue.');return null}
  try{
    const decoded=jwt.verify(token,signingSecret(),{algorithms:['HS256']});
    if(!decoded||typeof decoded==='string'||!Number.isSafeInteger(decoded.userId)||decoded.userId<=0)throw new Error('Invalid account');
    return decoded.userId as number;
  }catch(error){
    if(error instanceof AuthError)throw error;
    if(required)throw new AuthError(401,'INVALID_SESSION','Your session has expired. Please sign in again.');
    return null;
  }
}
export type AccountProfile={
 user:{id:number;username:string;email:string;display_name:string|null;avatar_seed:string|null;created_at:string};
 preferences:Record<string,unknown>;
};
export async function profile(userId:number):Promise<AccountProfile>{
 const result=await getDb().query(
 'SELECT u.id,u.username,u.email,u.display_name,u.avatar_seed,u.created_at, '+
 'p.preferred_language,p.theme,p.notify_goals,p.notify_kickoff,p.notify_halftime, '+
 'p.notify_fulltime,p.notify_red_cards,p.notify_news '+
 'FROM public.users u LEFT JOIN public.user_preferences p ON p.user_id=u.id WHERE u.id=$1',[userId]);
 if(!result.rows.length)throw new AuthError(404,'ACCOUNT_NOT_FOUND','Account not found.');
 const r=result.rows[0];
 return {
  user:{id:r.id,username:r.username,email:r.email,display_name:r.display_name,
   avatar_seed:r.avatar_seed,created_at:r.created_at},
  preferences:{preferred_language:r.preferred_language||'en',theme:r.theme||'system',
   notify_goals:r.notify_goals??true,notify_kickoff:r.notify_kickoff??true,
   notify_halftime:r.notify_halftime??false,notify_fulltime:r.notify_fulltime??true,
   notify_red_cards:r.notify_red_cards??true,notify_news:r.notify_news??false}
 };
}
function userToken(id:number){
 return jwt.sign({userId:id},signingSecret(),{algorithm:'HS256',expiresIn:'7d'});
}
function record(input:unknown):Record<string,unknown>{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new AuthError(400,'INVALID_BODY','Enter valid account details.');
 return input as Record<string,unknown>;
}
function validEmail(email:string){return email.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
export async function register(input:unknown){
 signingSecret();
 const body=record(input),username=String(body.username||'').trim(),
 email=String(body.email||'').trim().toLowerCase(),
 password=String(body.password||'');
 if(username.length<3||username.length>50)throw new AuthError(400,'INVALID_USERNAME','Username must be 3–50 characters.');
 if(!validEmail(email))throw new AuthError(400,'INVALID_EMAIL','Enter a valid email address.');
 if(password.length<8||password.length>128)throw new AuthError(400,'INVALID_PASSWORD','Password must be 8–128 characters.');
 const hash=await bcrypt.hash(password,12);
 const seed=username.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'fan';
 const db=getDb(),client=await db.connect();
 try{
  await client.query('BEGIN');
  const result=await client.query(
   'INSERT INTO public.users(username,email,password_hash,display_name,avatar_seed) VALUES($1,$2,$3,$1,$4) RETURNING id',
   [username,email,hash,seed]);
  const id=Number(result.rows[0].id);
  await client.query('INSERT INTO public.user_preferences(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING',[id]);
  await client.query('COMMIT');
  return {token:userToken(id),...await profile(id)};
 }catch(error){
  await client.query('ROLLBACK').catch(()=>{});
  if((error as {code?:string}).code==='23505')throw new AuthError(409,'ALREADY_EXISTS','Username or email is already in use.');
  throw error;
 }finally{client.release()}
}
export async function login(input:unknown){
 signingSecret();
 const body=record(input),email=String(body.email||'').trim().toLowerCase(),
 password=String(body.password||'');
 if(!validEmail(email)||!password||password.length>128)throw new AuthError(400,'INVALID_CREDENTIALS','Invalid email or password.');
 const result=await getDb().query('SELECT id,password_hash FROM public.users WHERE email=$1',[email]);
 const hash=result.rows[0]?.password_hash||'$2b$12$qCi2kT4CJXf4gijLgpwRTe.y9oCZpkjHFNngCYdcbQnC3AfZZZGai';
 const valid=await bcrypt.compare(password,hash);
 if(!result.rows.length||!valid)throw new AuthError(400,'INVALID_CREDENTIALS','Invalid email or password.');
 const id=Number(result.rows[0].id);
 return {token:userToken(id),...await profile(id)};
}
export async function updateAccount(userId:number,input:unknown){
 const body=record(input);
 const username=body.username===undefined?null:String(body.username).trim();
 const displayName=body.display_name===undefined?null:String(body.display_name).trim();
 const avatarSeed=body.avatar_seed===undefined?null:String(body.avatar_seed).trim();
 if(username!==null&&(username.length<3||username.length>50))throw new AuthError(400,'INVALID_USERNAME','Username must be 3–50 characters.');
 if(displayName!==null&&displayName.length>80)throw new AuthError(400,'INVALID_DISPLAY_NAME','Display name is too long.');
 if(avatarSeed!==null&&avatarSeed.length>100)throw new AuthError(400,'INVALID_AVATAR','Avatar identifier is too long.');
 try{
  await getDb().query(
   'UPDATE public.users SET username=COALESCE($2,username),display_name=COALESCE($3,display_name),avatar_seed=COALESCE($4,avatar_seed) WHERE id=$1',
   [userId,username,displayName,avatarSeed]);
 }catch(e){
  if((e as {code?:string}).code==='23505')throw new AuthError(409,'ALREADY_EXISTS','Username is already taken.');
  throw e;
 }
 return profile(userId);
}
export async function favoriteTeams(userId:number){
 const result=await getDb().query(
 'SELECT t.id,t.name_en,t.name_am,t.short_name,t.avatar_seed,t.logo_url '+
 'FROM public.user_favorite_teams f JOIN public.teams t ON t.id=f.team_id '+
 'WHERE f.user_id=$1 ORDER BY t.name_en',[userId]);
 return result.rows;
}
export async function modifyFavorite(userId:number,teamId:string,method:'POST'|'DELETE'){
 if(!/^\d{1,15}$/.test(teamId))throw new AuthError(400,'INVALID_TEAM','Invalid team identifier.');
 if(method==='POST')
  await getDb().query('INSERT INTO public.user_favorite_teams(user_id,team_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[userId,Number(teamId)]);
 else await getDb().query('DELETE FROM public.user_favorite_teams WHERE user_id=$1 AND team_id=$2',[userId,Number(teamId)]);
 return {ok:true};
}
export async function preferences(userId:number){return (await profile(userId)).preferences}
export async function savePreferences(userId:number,input:unknown){
 const p=record(input);
 const language=['en','am'].includes(String(p.preferred_language))?p.preferred_language:'en';
 const theme=['light','dark','system'].includes(String(p.theme))?p.theme:'system';
 const flag=(key:string)=>p[key]===true;
 const result=await getDb().query(
 'INSERT INTO public.user_preferences '+
 '(user_id,preferred_language,theme,notify_goals,notify_kickoff,notify_halftime,notify_fulltime,notify_red_cards,notify_news,updated_at) '+
 'VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW()) '+
 'ON CONFLICT(user_id) DO UPDATE SET '+
 'preferred_language=EXCLUDED.preferred_language,theme=EXCLUDED.theme,notify_goals=EXCLUDED.notify_goals, '+
 'notify_kickoff=EXCLUDED.notify_kickoff,notify_halftime=EXCLUDED.notify_halftime, '+
 'notify_fulltime=EXCLUDED.notify_fulltime,notify_red_cards=EXCLUDED.notify_red_cards, '+
 'notify_news=EXCLUDED.notify_news,updated_at=NOW() '+
 'RETURNING preferred_language,theme,notify_goals,notify_kickoff,notify_halftime,notify_fulltime,notify_red_cards,notify_news',
 [userId,language,theme,flag('notify_goals'),flag('notify_kickoff'),flag('notify_halftime'),
  flag('notify_fulltime'),flag('notify_red_cards'),flag('notify_news')]);
 return result.rows[0];
}
