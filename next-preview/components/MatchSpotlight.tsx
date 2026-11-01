'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {ChevronLeft,ChevronRight,ArrowUpRight} from 'lucide-react';
import FootballLogo from './FootballLogo';
import type {Fixture} from '@/lib/football';
const EAT='Africa/Addis_Ababa';
function label(m:Fixture){if(m.status==='LIVE')return 'LIVE NOW';if(m.status==='FT')return 'FULL TIME';if(m.status==='PST')return 'POSTPONED';return m.date?new Intl.DateTimeFormat('en-GB',{timeZone:EAT,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(m.date))+' EAT':'KICKOFF TBD'}
export default function MatchSpotlight({matches,loading}:{matches:Fixture[];loading:boolean}){
 const [index,setIndex]=useState(0),[paused,setPaused]=useState(false);
 const slides=[...matches].sort((a,b)=>({LIVE:0,NS:1,FT:2,SCORED:3,PST:4}[a.status]??5)-({LIVE:0,NS:1,FT:2,SCORED:3,PST:4}[b.status]??5)).slice(0,4);
 const count=slides.length;
 useEffect(()=>{setIndex(0)},[matches]);
 useEffect(()=>{if(paused||count<2)return;const timer=setInterval(()=>setIndex(i=>(i+1)%count),7500);return()=>clearInterval(timer)},[paused,count]);
 const [touchX,setTouchX]=useState<number|null>(null);
 const go=(n:number)=>setIndex(i=>(i+n+count)%count);
 const m=slides[index%Math.max(count,1)];
 return <section className="spotlight" aria-label="Featured football fixtures" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setPaused(false)}} onTouchStart={e=>setTouchX(e.touches[0].clientX)} onTouchEnd={e=>{if(touchX!==null&&count>1){const d=e.changedTouches[0].clientX-touchX;if(Math.abs(d)>55)go(d<0?1:-1)}setTouchX(null)}}>
 {m?<div className="spotlight-inner" key={m.id}><div className="spotlight-top"><span className="spotlight-eyebrow">{m.status==='LIVE'?'● LIVE SPOTLIGHT':m.status==='FT'?'FINAL WHISTLE':'THE BIG MATCH'}</span><span>{m.league} · {label(m)}</span></div><h1>{m.status==='LIVE'?'THE WORLD IS WATCHING':m.status==='FT'?'THE FINAL WORD':'THE MAIN EVENT'}</h1><div className="spotlight-versus"><div className="spotlight-team"><FootballLogo name={m.home} src={m.homeLogo} size={88}/><strong>{m.home}</strong></div><div className="spotlight-score"><b>{m.homeScore!==null&&m.awayScore!==null?m.homeScore+' : '+m.awayScore:'VS'}</b><small>{label(m)}</small></div><div className="spotlight-team"><FootballLogo name={m.away} src={m.awayLogo} size={88}/><strong>{m.away}</strong></div></div><div className="spotlight-foot"><Link href={'/match/'+m.id}>MATCH CENTER <ArrowUpRight size={17}/></Link><span>Verified match feed · All times EAT</span></div></div>:<div className="spotlight-empty"><span>FETAN · MATCHDAY</span><h1>FOOTBALL TAKES CENTER STAGE.</h1><p>{loading?'Loading featured fixtures…':'Select another date or league to discover the next big match.'}</p></div>}
 {count>1&&<div className="spotlight-controls"><button aria-label="Previous spotlight" onClick={()=>go(-1)}><ChevronLeft size={18}/></button><div className="spotlight-dots">{slides.map((s,i)=><button key={s.id} aria-label={'Show fixture '+(i+1)} aria-current={index===i?'true':undefined} className={index===i?'active':''} onClick={()=>setIndex(i)}/>)}</div><button aria-label="Next spotlight" onClick={()=>go(1)}><ChevronRight size={18}/></button></div>}
 </section>
}