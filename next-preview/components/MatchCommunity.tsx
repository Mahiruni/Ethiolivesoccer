'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {MessageCircle,Send,Trophy,ShieldCheck} from 'lucide-react';

type Poll={home_votes:number;draw_votes:number;away_votes:number;my_vote:string|null};
type Message={id:number;username:string;message_text:string;created_at:string};
async function fetchApi(path:string,options:RequestInit={}){
 const response=await fetch('/api/'+path,{...options,cache:'no-store'});
 const result=await response.json().catch(()=>null);
 if(!response.ok)throw new Error(result?.error||'Community feature unavailable.');
 return result;
}
export default function MatchCommunity({localId,home,away}:{localId:number|null;home:string;away:string}){
 const [poll,setPoll]=useState<Poll|null>(null),[messages,setMessages]=useState<Message[]>([]);
 const [voteBusy,setVoteBusy]=useState(false),[chatBusy,setChatBusy]=useState(false);
 const [draft,setDraft]=useState(''),[error,setError]=useState(''),[account,setAccount]=useState(false);
 useEffect(()=>{setAccount(Boolean(localStorage.getItem('ethio_token')))},[]);
 useEffect(()=>{
  if(!localId)return;
  let live=true;
  const load=async()=>{
   const [p,c]=await Promise.allSettled([fetchApi('polls/'+localId,localStorage.getItem('ethio_token')?{headers:{Authorization:'Bearer '+localStorage.getItem('ethio_token')}}:{}),fetchApi('chat/'+localId)]);
   if(!live)return;
   if(p.status==='fulfilled')setPoll(p.value);
   if(c.status==='fulfilled')setMessages(c.value);
  };
  load();
  const id=setInterval(()=>{if(document.visibilityState==='visible')load()},20000);
  return()=>{live=false;clearInterval(id)};
 },[localId]);
 const token=()=>localStorage.getItem('ethio_token');
 const submitVote=async(choice:'home'|'draw'|'away')=>{
  if(!localId)return;
  if(!token()){setError('Sign in to vote.');return}
  setError('');setVoteBusy(true);
  try{
   await fetchApi('polls/'+localId,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token()},body:JSON.stringify({vote_choice:choice})});
   setPoll(await fetchApi('polls/'+localId,{headers:{Authorization:'Bearer '+token()}}));
  }catch(e){setError(e instanceof Error?e.message:'Vote could not be saved.')}
  finally{setVoteBusy(false)}
 };
 const submitChat=async(e:React.FormEvent)=>{
  e.preventDefault();if(!localId||!draft.trim())return;
  if(!token()){setError('Sign in to join the chat.');return}
  setError('');setChatBusy(true);
  try{
   await fetchApi('chat/'+localId,{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token()},body:JSON.stringify({message_text:draft.trim()})});
   setDraft('');setMessages(await fetchApi('chat/'+localId));
  }catch(e){setError(e instanceof Error?e.message:'Could not send your message.')}
  finally{setChatBusy(false)}
 };
 const total=(poll?.home_votes||0)+(poll?.draw_votes||0)+(poll?.away_votes||0);
 const pct=(n:number)=>total?Math.round((n/total)*100):0;
 return <section className="community-grid">
  <article className="surface community-surface"><div className="community-heading"><Trophy size={20}/><div><span className="eyebrow">PREDICT THE OUTCOME</span><h2>Who takes the points?</h2></div></div>
    <p className="muted">{home} vs {away}. Vote once or change your prediction before the game.</p>
    {!localId?<div className="community-unavailable">Community voting is available only when this match is linked to a verified database fixture.</div>:<>
      <div className="vote-actions">{([{value:'home',label:'Home',count:poll?.home_votes||0},{value:'draw',label:'Draw',count:poll?.draw_votes||0},{value:'away',label:'Away',count:poll?.away_votes||0}] as const).map(item=><button disabled={voteBusy} key={item.value} type="button" aria-pressed={poll?.my_vote===item.value} onClick={()=>submitVote(item.value)}><strong>{item.label}</strong><span>{pct(item.count)}%</span></button>)}</div>
      <div className="community-footer"><ShieldCheck size={15}/> {total} votes from the community</div>
    </>}
  </article>
  <article className="surface community-surface"><div className="community-heading"><MessageCircle size={20}/><div><span className="eyebrow">FAN CONVERSATION</span><h2>Matchday chat</h2></div></div>
    {!localId?<div className="community-unavailable">This match is not yet linked to a discussion. Check another verified fixture.</div>:<>
      <div className="chat-messages" aria-live="polite">{messages.length?messages.map(item=><div className="chat-message" key={item.id}><span className="chat-monogram">{item.username.slice(0,2).toUpperCase()}</span><div><strong>@{item.username}</strong><p>{item.message_text}</p></div></div>):<p className="muted">No messages yet. Start the conversation.</p>}</div>
      {account?<form className="community-compose" onSubmit={submitChat}><input value={draft} onChange={e=>setDraft(e.target.value)} maxLength={280} placeholder="Share your thoughts…" aria-label="Message" required/><button type="submit" aria-label="Send message" disabled={chatBusy||!draft.trim()}><Send size={18}/></button></form>:<Link className="community-signin" href="/account">Sign in to join the conversation →</Link>}
    </>}
  </article>
  {error&&<p className="community-error" role="alert">{error} <Link href="/account">Account</Link></p>}
 </section>
}
