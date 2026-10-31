'use client';
import Link from 'next/link';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowUpRight,CalendarDays,ChevronLeft,ChevronRight,Clock3,RefreshCw,Radio,Info,Trophy,Activity,ShieldCheck,TriangleAlert} from 'lucide-react';
import type {Fixture,Standing} from '@/lib/football';
import FootballLogo, {CountryFlag} from './FootballLogo';

type LeagueItem={slug:string;name:string;short:string;country:string;label:string;accent:string};
const LEAGUES:LeagueItem[]=[
 {slug:'premier-league',name:'Premier League',short:'PL',country:'England',label:'ENG',accent:'#b3f368'},
 {slug:'la-liga',name:'La Liga',short:'LL',country:'Spain',label:'ESP',accent:'#ff9774'},
 {slug:'bundesliga',name:'Bundesliga',short:'BL',country:'Germany',label:'GER',accent:'#ff627a'},
 {slug:'serie-a',name:'Serie A',short:'SA',country:'Italy',label:'ITA',accent:'#80c4ff'},
 {slug:'ligue-1',name:'Ligue 1',short:'L1',country:'France',label:'FRA',accent:'#c8afff'}
];
const EAT='Africa/Addis_Ababa';
function dateKey(d:Date){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:EAT,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);
 const p=(type:string)=>parts.find(x=>x.type===type)?.value||'';
 return [p('year'),p('month'),p('day')].join('-');
}
function dayShift(date:string,days:number){const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function clock(value:string|null){
 if(!value)return 'TBD';
 return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:EAT}).format(new Date(value));
}
function initials(name:string){return name.split(/\s+/).slice(0,2).map(n=>n[0]||'').join('').toUpperCase()}
function timestamp(){return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:EAT}).format(new Date())}
type ViewState={fixtures:Fixture[];standings:Standing[];loading:boolean;error:string|null;tableError:string|null;lastChecked:string|null};
function Skeleton(){return <div className="fixture-skeleton" aria-busy="true" aria-label="Loading verified football data">{[1,2,3].map(n=><div key={n} className="skeleton fixture-skeleton-row"/>)}</div>}
function statusLabel(match:Fixture){
 if(match.status==='LIVE')return '● LIVE';
 if(match.status==='FT')return 'FT';
 if(match.status==='SCORED')return 'SCORE REPORTED';
 if(match.status==='PST')return 'POSTPONED';
 return clock(match.date);
}
function MatchRow({match}:{match:Fixture}){
 const scored=match.homeScore!==null&&match.awayScore!==null;
 return <Link href={'/match/'+match.id} className="fixture-row">
  <div className={'fixture-status '+(match.status==='LIVE'?'is-live':'')}>{statusLabel(match)}</div>
  <div className="fixture-teams">
   <span className="fixture-team"><FootballLogo name={match.home} src={match.homeLogo} size={26} className="fixture-logo"/><b>{match.home}</b></span>
   <span className="fixture-team"><FootballLogo name={match.away} src={match.awayLogo} size={26} className="fixture-logo"/><b>{match.away}</b></span>
  </div>
  <div className="fixture-result"><strong>{scored?match.homeScore:'—'}</strong><strong>{scored?match.awayScore:'—'}</strong></div>
  <ChevronRight size={17} className="fixture-chevron"/>
 </Link>;
}
export default function Matchday({initialLeague='premier-league'}:{initialLeague?:string}){
 const [league,setLeague]=useState(LEAGUES.some(l=>l.slug===initialLeague)?initialLeague:LEAGUES[0].slug);
 const [date,setDate]=useState<string|null>(null);
 const [filter,setFilter]=useState<'all'|'live'|'upcoming'|'results'>('all');
 const [state,setState]=useState<ViewState>({fixtures:[],standings:[],loading:true,error:null,tableError:null,lastChecked:null});
 const requestId=useRef(0);
 const [nonce,setNonce]=useState(0);
 const [verifiedLeagueLogos,setVerifiedLeagueLogos]=useState<Record<string,string>>({});
 const initial=useRef(true);
 const selected=LEAGUES.find(l=>l.slug===league)||LEAGUES[0];
 useEffect(()=>{setDate(dateKey(new Date()))},[]);
 useEffect(()=>{
  const controller=new AbortController();
  fetch('/api/competitions',{signal:controller.signal}).then(r=>r.ok?r.json():[])
   .then((entries:unknown)=>{
    if(!Array.isArray(entries))return;
    const logos:Record<string,string>={};
    for(const item of entries){
      if(item&&typeof item==='object'&&typeof item.slug==='string'&&typeof item.logo==='string')logos[item.slug]=item.logo;
    }
    setVerifiedLeagueLogos(logos);
   }).catch(()=>{});
  return()=>controller.abort();
 },[]);
 useEffect(()=>{
  if(initial.current){initial.current=false;return;}
  // Keep Next App Router URLs canonical, but never overwrite the user's date selection.
  const path=league==='premier-league'?'/':'/league/'+league;
  window.history.replaceState(window.history.state,'',path);
 },[league]);
 useEffect(()=>{
  if(!date)return;
  const id=++requestId.current;const controller=new AbortController();
  const load=async()=>{
   setState(p=>({...p,loading:true,error:null,tableError:null}));
   const [matchResult,standResult]=await Promise.allSettled([
    fetch('/api/matches?league='+encodeURIComponent(league)+'&date='+encodeURIComponent(date),{signal:controller.signal,cache:'no-store'}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||'Fixtures unavailable');return j as Fixture[]}),
    fetch('/api/standings?league='+encodeURIComponent(league),{signal:controller.signal,cache:'no-store'}).then(async r=>{const j=await r.json();if(!r.ok)throw new Error(j.error||'Standings unavailable');return j as Standing[]})
   ]);
   if(id!==requestId.current||controller.signal.aborted)return;
   setState({fixtures:matchResult.status==='fulfilled'?matchResult.value:[],
     standings:standResult.status==='fulfilled'?standResult.value:[],
     loading:false,
     error:matchResult.status==='rejected'?matchResult.reason?.message||'Fixtures unavailable':null,
     tableError:standResult.status==='rejected'?standResult.reason?.message||'Standings unavailable':null,
     lastChecked:timestamp()});
  };
  load();
  const poll=window.setInterval(()=>{if(document.visibilityState==='visible')load()},15*60*1000);
  return()=>{requestId.current++;controller.abort();window.clearInterval(poll)};
 },[league,date,nonce]);
 const filtered=useMemo(()=>state.fixtures.filter(m=>{
  if(filter==='live')return m.status==='LIVE';
  if(filter==='results')return m.status==='FT'||m.status==='SCORED';
  if(filter==='upcoming')return m.status==='NS';
  return true;
 }),[state.fixtures,filter]);
 const dayKeys=useMemo(()=>date?[-2,-1,0,1,2].map(n=>dayShift(date,n)):[],[date]);
 const dateLabel=(value:string)=>new Intl.DateTimeFormat('en-GB',{weekday:'short',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z'));
 const selectedDate=date||dateKey(new Date());
 const today=dateKey(new Date());
 const changeLeague=(next:string)=>{if(league===next)return;setLeague(next);setFilter('all')};
 const changeDate=(next:string)=>{setDate(next);setFilter('all')};
 return <main className="wrap page matchday-page">
  <section className="hero">
   <div className="hero-copy"><div className="eyebrow"><span className="signal-dot"/> EUROPEAN FOOTBALL · 2026/27</div><h1>Every match.<br/><span>One obsession.</span></h1><p>Follow the biggest leagues in the world with a matchday experience built for speed, clarity and the beautiful game.</p>
    <div className="hero-stats"><div><strong>{state.fixtures.length.toString().padStart(2,'0')}</strong><span>GAMES SHOWN</span></div><div><strong>{state.standings.length.toString().padStart(2,'0')}</strong><span>TABLE POSITIONS</span></div><div><strong>05</strong><span>TOP LEAGUES</span></div></div>
   </div>
   <div className="hero-art" aria-hidden="true"><div className="pitch-orbit orbit-one"/><div className="pitch-orbit orbit-two"/><div className="pitch-line"/><div className="hero-ball"><Activity size={68} strokeWidth={1.25}/></div><div className="floating-kicker"><Radio size={15}/> THE GLOBAL MATCHDAY</div></div>
  </section>
  <div className="section-label"><div><span className="eyebrow">01 / THE LEAGUES</span><h2>Pick your competition</h2></div><div className="source-indicator"><ShieldCheck size={15}/> VERIFIED SOURCE · PARTIAL COVERAGE</div></div>
  <nav className="league-pills" aria-label="Choose competition">
   {LEAGUES.map(l=><button key={l.slug} type="button" className={'league-pill '+(league===l.slug?'selected':'')} onClick={()=>changeLeague(l.slug)} aria-pressed={league===l.slug}>
    <span className="league-identity"><CountryFlag country={l.country}/><FootballLogo name={l.name} src={verifiedLeagueLogos[l.slug]} size={34} kind="league"/></span><span><strong>{l.name}</strong><small>{l.country}</small></span><ArrowUpRight size={15}/></button>)}
  </nav>
  <div className="coverage-notice"><Info size={15}/><span>Free-source coverage is limited to roughly three match records per league/date and the first five table rows. This is not a real-time licensed feed.</span><a href="https://www.thesportsdb.com/" target="_blank" rel="noopener noreferrer">THE SPORTS DB <ArrowUpRight size={13}/></a></div>
  <div className="matchday-grid">
   <section className="fixtures-pane">
    <div className="section-label section-label-tight"><div><span className="eyebrow">02 / THE MATCHDAY</span><h2>{selected.name} fixtures</h2></div><div className="time-details"><Clock3 size={14}/>{state.lastChecked?'CHECKED '+state.lastChecked:'ALL TIMES EAT'} <span>· EAT</span></div></div>
    <div className="fixture-shell">
      <div className="fixture-toolbar">
       <button className="arrow-control" aria-label="Previous day" onClick={()=>changeDate(dayShift(selectedDate,-1))}><ChevronLeft size={18}/></button>
       <div className="day-list">{dayKeys.map(day=><button type="button" key={day} onClick={()=>changeDate(day)} className={'day-button '+(day===selectedDate?'active':'')} aria-pressed={day===selectedDate}><small>{day===today?'TODAY':dateLabel(day).toUpperCase()}</small><strong>{Number(day.slice(-2))}</strong></button>)}</div>
       <button className="arrow-control" aria-label="Next day" onClick={()=>changeDate(dayShift(selectedDate,1))}><ChevronRight size={18}/></button>
      </div>
      <div className="fixture-actions"><div className="filter-tabs" role="group" aria-label="Filter matches">{(['all','live','upcoming','results'] as const).map(name=><button key={name} type="button" aria-pressed={filter===name} className={filter===name?'active':''} onClick={()=>setFilter(name)}>{name==='all'?'All matches':name==='results'?'Results':name[0].toUpperCase()+name.slice(1)}</button>)}</div><div className="mini-actions"><button className="today-action" onClick={()=>changeDate(today)} disabled={selectedDate===today}>Today</button><button className="refresh-action" onClick={()=>setNonce(x=>x+1)} title="Refresh fixtures" aria-label="Refresh fixtures"><RefreshCw size={16}/></button></div></div>
      {state.loading?<Skeleton/>:state.error?<div className="data-empty error" role="alert"><TriangleAlert size={27}/><h3>Match feed unavailable</h3><p>{state.error}</p><button onClick={()=>setNonce(n=>n+1)}>Try again</button></div>:filtered.length?<div className="fixture-list"><div className="fixture-list-header"><span>TIME / STATUS</span><span>FIXTURES</span><span>SCORE</span></div>{filtered.map(m=><MatchRow key={m.id} match={m}/>)}</div>:<div className="data-empty"><CalendarDays size={28}/><h3>{filter==='all'?'No games returned for this day':'No matches in this filter'}</h3><p>Try a different day or league. The free source provides only partial fixture coverage.</p></div>}
      <div className="fixture-bottom"> <span><span className="signal-dot"/> LIVE LABELS ONLY WHEN REPORTED</span><span>EAST AFRICA TIME · UTC+3</span></div>
    </div>
   </section>
   <aside className="sidebar-pane">
    <div className="section-label section-label-tight"><div><span className="eyebrow">03 / THE STANDINGS</span><h2>League table</h2></div><Trophy size={22} className="sidebar-title-icon"/></div>
    <div className="table-surface"><div className="table-top"><div className="table-league"><span className="table-league-emblem"><FootballLogo name={selected.name} src={verifiedLeagueLogos[selected.slug]} size={34} kind="league"/></span><div><strong>{selected.name}</strong><small>2026/27 SEASON</small></div></div><span className="table-badge">TOP 5</span></div>
      <div className="table-columns"><span>#</span><span>CLUB</span><span>PL</span><span>PTS</span></div>
      {state.loading?<Skeleton/>:state.tableError?<div className="data-empty table-empty"><TriangleAlert size={23}/><p>{state.tableError}</p></div>:state.standings.length?state.standings.slice(0,5).map(row=><div className="table-item" key={row.team+'-'+row.position}><span className="table-rank">{row.position}</span><span className="table-name"><FootballLogo name={row.team} src={row.teamLogo} size={28} className="table-logo"/><span>{row.team}</span></span><span>{row.played??'—'}</span><strong>{row.points??'—'}</strong></div>):<div className="data-empty table-empty"><p>No verified table returned for this league.</p></div>}
      <p className="table-footer"><Info size={13}/> A PARTIAL TABLE. FULL STANDINGS ARE NOT AVAILABLE ON THE FREE PLAN.</p>
    </div>
    <div className="fan-card"><div className="fan-symbol"><Activity size={26}/></div><span className="eyebrow">THE NEXT CHAPTER</span><h3>More than the score.</h3><p>Follow your clubs and join the matchday conversation. Team crest imagery is displayed only when individual publication rights are verified.</p><span className="fan-phase">SPORTS IMAGE RIGHTS VERIFIED INDIVIDUALLY</span></div>
   </aside>
  </div>
 </main>
}
