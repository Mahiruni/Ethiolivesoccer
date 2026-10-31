import 'server-only';
import webpush from 'web-push';
import {accountDatabase,AuthError} from '@/lib/auth';

const publicKey=process.env.VAPID_PUBLIC_KEY||'';
const privateKey=process.env.VAPID_PRIVATE_KEY||'';
const subject=process.env.VAPID_SUBJECT||'mailto:admin@ethiolivescores.local';
export const pushEnabled=Boolean(publicKey&&privateKey);
if(pushEnabled)webpush.setVapidDetails(subject,publicKey,privateKey);
export function publicPushConfig(){return {enabled:pushEnabled,publicKey:pushEnabled?publicKey:null}}
function ensureEnabled(){
 if(!pushEnabled)throw new AuthError(503,'PUSH_NOT_CONFIGURED','Push notifications are not configured in this preview.');
}
type Subscription={endpoint:string;keys:{p256dh:string;auth:string}};
export async function subscribe(userId:number,body:unknown,userAgent:string|null){
 ensureEnabled();
 if(!body||typeof body!=='object')throw new AuthError(400,'BAD_SUBSCRIPTION','Invalid push subscription.');
 const value=body as Partial<Subscription>;
 if(typeof value.endpoint!=='string'||!value.endpoint.startsWith('https://')||value.endpoint.length>2000||
    typeof value.keys?.p256dh!=='string'||value.keys.p256dh.length>400||
    typeof value.keys?.auth!=='string'||value.keys.auth.length>400||
    !value.keys.p256dh||!value.keys.auth){
   throw new AuthError(400,'BAD_SUBSCRIPTION','Invalid push subscription.');
 }
 const db=accountDatabase();
 await db.query(
  'INSERT INTO public.push_subscriptions(user_id,endpoint,p256dh,auth,user_agent,is_active,updated_at) '+
  'VALUES($1,$2,$3,$4,$5,true,NOW()) '+
  'ON CONFLICT(endpoint) DO UPDATE SET user_id=EXCLUDED.user_id,p256dh=EXCLUDED.p256dh,'+
  'auth=EXCLUDED.auth,user_agent=EXCLUDED.user_agent,is_active=true,updated_at=NOW()',
  [userId,value.endpoint,value.keys.p256dh,value.keys.auth,userAgent?.slice(0,300)||null]);
 return {ok:true};
}
export async function unsubscribe(userId:number,body:unknown){
 const endpoint=(body&&typeof body==='object'&&(body as {endpoint?:unknown}).endpoint)||'';
 if(typeof endpoint!=='string'||!endpoint.startsWith('https://')||endpoint.length>2000)
  throw new AuthError(400,'BAD_SUBSCRIPTION','A valid subscription endpoint is required.');
 await accountDatabase().query('DELETE FROM public.push_subscriptions WHERE user_id=$1 AND endpoint=$2',[userId,endpoint]);
 return {ok:true};
}
export async function testPush(userId:number){
 ensureEnabled();
 const subs=await accountDatabase().query(
  'SELECT endpoint,p256dh,auth FROM public.push_subscriptions WHERE user_id=$1 AND is_active=true LIMIT 5',
  [userId]);
 let sent=0,failed=0;
 for(const row of subs.rows){
   try{
    await webpush.sendNotification(
      {endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},
      JSON.stringify({title:'EthioLiveScores',body:'Notifications are working on this device. ⚽',
        url:'/',tag:'push-test',type:'test'}),
      {TTL:180});
    sent++;
   }catch(error){
    failed++;
    const code=(error as {statusCode?:number}).statusCode;
    if(code===404||code===410)
      await accountDatabase().query('UPDATE public.push_subscriptions SET is_active=false,updated_at=NOW() WHERE endpoint=$1',[row.endpoint]);
   }
 }
 return {ok:true,sent,failed};
}
