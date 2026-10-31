'use client';
import {useEffect,useState} from 'react';
import {Bell,BellOff,ShieldCheck,Send} from 'lucide-react';

function publicKeyBytes(base64:string){
 const padding='='.repeat((4-base64.length%4)%4);
 const binary=atob((base64+padding).replace(/-/g,'+').replace(/_/g,'/'));
 return Uint8Array.from(binary,c=>c.charCodeAt(0));
}
async function api(path:string,method='GET',body?:unknown){
 const token=localStorage.getItem('ethio_token');
 if(!token)throw new Error('Sign in to manage notifications.');
 const response=await fetch('/api/'+path,{method,cache:'no-store',
  headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},
  body:body===undefined?undefined:JSON.stringify(body)});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error||'Notification service unavailable.');
 return result;
}
export default function NotificationControls(){
 const [ready,setReady]=useState(false),[available,setAvailable]=useState(false),
 [subscribed,setSubscribed]=useState(false),[busy,setBusy]=useState(false),
 [message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  (async()=>{
   if(!('serviceWorker' in navigator)||!('PushManager' in window)||!('Notification' in window))return;
   try{
    const config=await api('push/config');
    const registration=await navigator.serviceWorker.getRegistration('/sw.js');
    const sub=registration?await registration.pushManager.getSubscription():null;
    if(active){setAvailable(Boolean(config.enabled));setSubscribed(Boolean(sub));}
   }catch{if(active)setAvailable(false)}
   finally{if(active)setReady(true)}
  })();
  return()=>{active=false};
 },[]);
 const enable=async()=>{
  setBusy(true);setMessage('');setError('');
  try{
   const config=await api('push/config');
   if(!config.enabled||!config.publicKey)throw new Error('Web Push is not configured on this environment.');
   const permission=await Notification.requestPermission();
   if(permission!=='granted')throw new Error('Notification permission was not granted.');
   const registration=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});
   let sub=await registration.pushManager.getSubscription();
   if(!sub)sub=await registration.pushManager.subscribe({
    userVisibleOnly:true,applicationServerKey:publicKeyBytes(config.publicKey)
   });
   const data=sub.toJSON();
   await api('push/subscribe','POST',{endpoint:data.endpoint,keys:data.keys});
   setSubscribed(true);setMessage('Notifications enabled for this browser.');
  }catch(e){setError(e instanceof Error?e.message:'Could not enable notifications.')}
  finally{setBusy(false)}
 };
 const disable=async()=>{
  setBusy(true);setMessage('');setError('');
  try{
   const registration=await navigator.serviceWorker.getRegistration('/sw.js');
   const sub=registration?await registration.pushManager.getSubscription():null;
   if(sub){await api('push/subscribe','DELETE',{endpoint:sub.endpoint});await sub.unsubscribe();}
   setSubscribed(false);setMessage('Notifications disabled for this browser.');
  }catch(e){setError(e instanceof Error?e.message:'Could not disable notifications.')}
  finally{setBusy(false)}
 };
 const test=async()=>{
  setBusy(true);setMessage('');setError('');
  try{const result=await api('push/test','POST',{});setMessage('Test sent: '+(result.sent||0)+' device(s).');}
  catch(e){setError(e instanceof Error?e.message:'Test notification failed.')}
  finally{setBusy(false)}
 };
 if(!ready)return <section className="notification-panel"><Bell size={17}/><span>Checking browser notification support…</span></section>;
 return <section className="notification-panel">
  <div className="notification-panel-head"><Bell size={18}/><div><strong>Matchday notifications</strong><small>Push alerts for this browser</small></div></div>
  {!available?<p>Push notifications are unavailable or not configured in this preview. Your existing production notifications are unchanged.</p>:<>
   <div className="notification-panel-actions">
    <button type="button" onClick={subscribed?disable:enable} disabled={busy}>{subscribed?<><BellOff size={16}/> Disable alerts</>:<><ShieldCheck size={16}/> Enable alerts</>}</button>
    {subscribed&&<button type="button" onClick={test} disabled={busy}><Send size={15}/> Send test</button>}
   </div>
   <p>Alerts require browser permission. The free football feed does not guarantee real-time goal events.</p>
  </>}
  {error&&<p role="alert" className="account-feedback error">{error}</p>}
  {message&&<p role="status" className="account-feedback success">{message}</p>}
 </section>;
}
