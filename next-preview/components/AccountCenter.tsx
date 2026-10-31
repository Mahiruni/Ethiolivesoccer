'use client';
import {useEffect,useState} from 'react';
import {LockKeyhole,UserRound,Mail,Eye,EyeOff,ShieldCheck,LogOut,UserPlus,ArrowRight} from 'lucide-react';
import NotificationControls from './NotificationControls';
import FanActivity from './FanActivity';

type Profile={user:{id:number;username:string;email:string;display_name?:string};preferences:{preferred_language:string;theme:string}};
async function request(path:string,method='GET',body?:unknown,token?:string){
 const response=await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error||'Request failed.');
 return result;
}
export default function AccountCenter(){
 const [mode,setMode]=useState<'login'|'register'>('login');
 const [email,setEmail]=useState(''),[username,setUsername]=useState(''),[password,setPassword]=useState('');
 const [showPassword,setShowPassword]=useState(false);
 const [token,setToken]=useState<string|null>(null);
 const [profile,setProfile]=useState<Profile|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [displayName,setDisplayName]=useState('');
 useEffect(()=>{
  const stored=localStorage.getItem('ethio_token');if(!stored)return;
  setToken(stored);
  request('auth/me','GET',undefined,stored).then((p:Profile)=>{setProfile(p);setDisplayName(p.user.display_name||p.user.username)}).catch(()=>{
    // Don't erase a previously working session when this preview lacks database config.
    setError('This preview could not confirm your session. Your production account is unchanged.');
  });
 },[]);
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();setError('');setMessage('');setBusy(true);
  try{
   const result=await request(mode==='login'?'auth/login':'auth/register','POST',
    mode==='login'?{email,password}:{username,email,password}) as Profile&{token:string};
   localStorage.setItem('ethio_token',result.token);
   setToken(result.token);setProfile(result);setDisplayName(result.user.display_name||result.user.username);
   setPassword('');setMessage('Signed in successfully.');
  }catch(e){setError(e instanceof Error?e.message:'Account service unavailable.')}
  finally{setBusy(false)}
 };
 const signOut=()=>{localStorage.removeItem('ethio_token');setToken(null);setProfile(null);setMessage('Signed out on this device.');setError('')};
 const update=async(e:React.FormEvent)=>{
  e.preventDefault();if(!token)return;
  setBusy(true);setError('');setMessage('');
  try{
   const result=await request('auth/me','PATCH',{display_name:displayName},token) as Profile;
   setProfile(result);setMessage('Profile updated.');
  }catch(e){setError(e instanceof Error?e.message:'Could not save changes.')}
  finally{setBusy(false)}
 };
 return <main className="wrap account-page">
   <div className="account-intro"><span className="eyebrow">THE FAN ACCOUNT</span><h1>Closer to the game.</h1><p>One identity for your favorite clubs, matchday preferences and conversations. Existing EthioLiveScores accounts are preserved during migration.</p></div>
   <div className="account-grid">
    <section className="account-panel">
     {profile?<><div className="account-avatar"><UserRound size={28}/></div><span className="eyebrow">YOUR MATCHDAY PROFILE</span><h2>{profile.user.display_name||profile.user.username}</h2><p className="muted">{profile.user.email}</p><form onSubmit={update} className="account-form"><label>Display name<input autoComplete="nickname" value={displayName} maxLength={80} onChange={e=>setDisplayName(e.target.value)} required/></label><button className="action-primary" type="submit" disabled={busy}>{busy?'Saving…':'Save profile'}</button></form>{token&&<FanActivity token={token}/>}<NotificationControls/><button className="account-signout" onClick={signOut}><LogOut size={16}/> Sign out</button></>:
     <><div className="account-tabs"><button type="button" aria-pressed={mode==='login'} onClick={()=>{setMode('login');setError('')}} className={mode==='login'?'active':''}>Sign in</button><button type="button" aria-pressed={mode==='register'} className={mode==='register'?'active':''} onClick={()=>{setMode('register');setError('')}}>Create account</button></div>
     <h2>{mode==='login'?'Welcome back.':'Join the matchday.'}</h2><p className="muted">{mode==='login'?'Enter your existing account details.':'Register for your football community account.'}</p><form className="account-form" onSubmit={submit}>
      {mode==='register'&&<label>Username<span><UserRound size={17}/><input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} minLength={3} maxLength={50} required/></span></label>}
      <label>Email address<span><Mail size={17}/><input type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required/></span></label>
      <label>Password<span><LockKeyhole size={17}/><input type={showPassword?'text':'password'} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} minLength={8} maxLength={128} required/><button type="button" className="password-toggle" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(v=>!v)}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>
      <button className="account-submit" type="submit" disabled={busy}>{busy?'Connecting…':mode==='login'?'Sign in':'Create account'} <ArrowRight size={18}/></button>
     </form></>}
     {error&&<p className="account-feedback error" role="alert">{error}</p>}
     {message&&<p className="account-feedback success" role="status">{message}</p>}
    </section>
    <aside className="account-aside"><div className="account-icon"><ShieldCheck size={30}/></div><span className="eyebrow">SECURE MIGRATION</span><h2>Your account stays yours.</h2><p>The Next.js preview uses the same account database and JWT format as the existing production website when both secure server secrets are configured.</p><div className="account-proof"><div><ShieldCheck size={17}/> Existing user records stay in place</div><div><LockKeyhole size={17}/> Passwords remain bcrypt-hashed</div><div><UserPlus size={17}/> No duplicate accounts required</div></div><p className="account-warning">Account recovery, full device-level push delivery, abuse prevention, and database-backed end-to-end authorization still require verification. This preview is not production-ready.</p></aside>
   </div>
 </main>
}
