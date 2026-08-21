import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, Bell, CalendarClock, ChevronRight, CircleAlert, Clock3, Goal, MapPin, MessageCircle, RefreshCw, Send, Share2, Shield, Shirt, Trophy, UsersRound } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import '../match-details.css';

const liveStatuses=new Set(['LIVE','1H','HT','2H','ET','P','BT']);
const finishedStatuses=new Set(['FT','AET','PEN']);
const tabs=[['overview','Overview'],['timeline','Timeline'],['lineups','Lineups'],['stats','Stats'],['h2h','H2H'],['table','Table'],['community','Community']];
const initials=name=>String(name||'Team').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const asNumber=v=>{if(v===null||v===undefined||v==='')return 0;const n=Number(String(v).replace('%',''));return Number.isFinite(n)?n:0};
const prettyTime=date=>{try{return new Intl.DateTimeFormat('en-ET',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Addis_Ababa'}).format(new Date(date))}catch{return '—'}};

export default function MatchDetails({ onNeedAuth }){
  const { id }=useParams(); const location=useLocation(); const navigate=useNavigate(); const auth=useAuth();
  const preview=location.state?.match||null;
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [tab,setTab]=useState('overview'); const [refreshing,setRefreshing]=useState(false); const [notice,setNotice]=useState('');
  const [chat,setChat]=useState([]); const [message,setMessage]=useState(''); const [poll,setPoll]=useState(null); const [voteBusy,setVoteBusy]=useState(false);

  const load=async(silent=false)=>{if(!silent)setLoading(true);else setRefreshing(true);setError('');try{setData(await apiFetch(`/match/${id}/details`));}catch(e){setError(e.message||'Could not load match details.');if(!data&&preview)setData({source:'Preview',updated_at:new Date().toISOString(),local_match_id:preview.local_match_id||null,match:preview,events:[],statistics:[],lineups:[],h2h:[],standings:[]});}finally{setLoading(false);setRefreshing(false)}};
  useEffect(()=>{load();},[id]);
  const match=data?.match||preview;
  const isLive=liveStatuses.has(String(match?.status||'').toUpperCase());
  useEffect(()=>{if(!match)return;const timer=setInterval(()=>load(true),isLive?15000:60000);return()=>clearInterval(timer);},[id,isLive,Boolean(match)]);

  const localId=data?.local_match_id||match?.local_match_id||(!String(match?.id||'').startsWith('p-')?match?.id:null);
  const loadCommunity=async()=>{if(!localId){setChat([]);setPoll(null);return;}try{const [c,p]=await Promise.all([apiFetch(`/chat/${localId}`),apiFetch(`/polls/${localId}`)]);setChat(c||[]);setPoll(p||null);}catch{setChat([]);setPoll(null)}};
  useEffect(()=>{if(tab==='community')loadCommunity();},[tab,localId]);
  useEffect(()=>{if(tab!=='community'||!localId)return;const timer=setInterval(loadCommunity,5000);return()=>clearInterval(timer)},[tab,localId]);

  const share=async()=>{const title=match?`${match.home_en} vs ${match.away_en} — EthioLiveScores`:'EthioLiveScores match';const url=window.location.href;try{if(navigator.share)await navigator.share({title,url});else{await navigator.clipboard.writeText(url);setNotice('Match link copied');setTimeout(()=>setNotice(''),2200)}}catch{}}
  const vote=async choice=>{if(!auth.user){onNeedAuth();return;}if(!localId)return;setVoteBusy(true);try{await apiFetch(`/polls/${localId}`,{method:'POST',body:JSON.stringify({vote_choice:choice})});await loadCommunity();await auth.loadPredictions?.();}finally{setVoteBusy(false)}};
  const send=async()=>{if(!message.trim())return;if(!auth.user){onNeedAuth();return;}if(!localId)return;try{await apiFetch(`/chat/${localId}`,{method:'POST',body:JSON.stringify({message_text:message.trim()})});setMessage('');await loadCommunity();}catch(e){setNotice(e.message||'Message could not be sent');setTimeout(()=>setNotice(''),2500)}};

  if(loading&&!data)return <main className="page match-detail-page"><DetailSkeleton/></main>;
  if(!match)return <main className="page match-detail-page"><div className="detail-error"><CircleAlert/><h1>Match unavailable</h1><p>{error||'This match could not be loaded.'}</p><button onClick={()=>navigate('/')}>Back to scores</button></div></main>;

  const total=(poll?.home_votes||0)+(poll?.draw_votes||0)+(poll?.away_votes||0);const pct=n=>total?Math.round(n*100/total):0;
  const status=String(match.status||'Scheduled').toUpperCase();
  const statusText=liveStatuses.has(status)?`${match.current_minute||0}′ · LIVE`:finishedStatuses.has(status)?status:prettyTime(match.match_date);

  return <main className="page match-detail-page">
    {notice&&<div className="toast-note">{notice}</div>}
    <div className="detail-toolbar">
      <button className="back-link" onClick={()=>navigate(-1)}><ArrowLeft size={16}/> Back</button>
      <div className="detail-tools"><button onClick={()=>load(true)} disabled={refreshing}><RefreshCw size={15} className={refreshing?'spin':''}/><span>Refresh</span></button><button onClick={share}><Share2 size={15}/><span>Share</span></button></div>
    </div>

    <section className="match-hero">
      <div className="hero-top"><div><span className="hero-league">{match.league_name||'Football'}</span><span className="hero-round">{match.round||'Match'}</span></div><span className={`source-badge ${data?.source==='API-Football'?'live-source':''}`}>{data?.source||match.data_source||'Data source'}</span></div>
      <div className="hero-scoreboard">
        <HeroTeam name={match.home_en} logo={match.home_logo}/>
        <div className="hero-score"><strong>{match.home_score??0}<span>:</span>{match.away_score??0}</strong><b className={liveStatuses.has(status)?'is-live':''}>{statusText}</b><small>{prettyTime(match.match_date)}</small></div>
        <HeroTeam name={match.away_en} logo={match.away_logo}/>
      </div>
      <div className="hero-meta"><span><MapPin size={14}/>{match.venue_name||'Venue TBC'}{match.venue_city?`, ${match.venue_city}`:''}</span><span><Shield size={14}/>{match.referee||'Referee TBC'}</span><span><Clock3 size={14}/>Updated {data?.updated_at?new Date(data.updated_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'—'}</span></div>
    </section>

    {error&&<div className="inline-warning"><CircleAlert size={16}/><div><b>Live detail refresh unavailable</b><span>{error}. Showing the latest available match information.</span></div></div>}

    <nav className="match-tabs" aria-label="Match sections">{tabs.map(([key,label])=><button key={key} className={tab===key?'active':''} onClick={()=>setTab(key)}>{label}</button>)}</nav>

    <div className="detail-layout">
      <section className="detail-main">
        {tab==='overview'&&<Overview data={data} match={match}/>} 
        {tab==='timeline'&&<Timeline events={data?.events||[]}/>} 
        {tab==='lineups'&&<Lineups lineups={data?.lineups||[]}/>} 
        {tab==='stats'&&<Statistics rows={data?.statistics||[]}/>} 
        {tab==='h2h'&&<HeadToHead rows={data?.h2h||[]} navigate={navigate}/>} 
        {tab==='table'&&<Standings rows={data?.standings||[]}/>} 
        {tab==='community'&&<Community localId={localId} chat={chat} message={message} setMessage={setMessage} send={send} poll={poll} vote={vote} voteBusy={voteBusy} pct={pct} total={total} auth={auth}/>} 
      </section>
      <aside className="detail-side">
        <section className="detail-card quick-card"><div className="detail-card-head"><b>Match status</b><span className={liveStatuses.has(status)?'status-dot live':'status-dot'}/></div><div className="quick-grid"><div><CalendarClock size={17}/><span>Kickoff</span><b>{prettyTime(match.match_date)}</b></div><div><MapPin size={17}/><span>Venue</span><b>{match.venue_name||'TBC'}</b></div><div><Trophy size={17}/><span>Competition</span><b>{match.league_name||'—'}</b></div><div><Bell size={17}/><span>Updates</span><b>{data?.source==='API-Football'?'Live feed':'Stored data'}</b></div></div></section>
        <section className="detail-card data-card"><div className="detail-card-head"><b>Data quality</b><small>{data?.source||'Preview'}</small></div><p>{data?.source==='API-Football'?'Scores and match-detail modules are supplied by the configured live football provider. Availability of lineups, detailed statistics and events depends on competition coverage.':'This match is using stored or preview data. Connect the live provider for live events, lineups and detailed statistics.'}</p></section>
      </aside>
    </div>
  </main>;
}

function HeroTeam({name,logo}){return <div className="hero-team"><span className="hero-team-logo">{logo?<img src={logo} alt=""/>:initials(name)}</span><h2>{name}</h2></div>}
function DetailSkeleton(){return <><div className="skeleton hero-skeleton"/><div className="skeleton tabs-skeleton"/><div className="skeleton body-skeleton"/></>}
function Empty({icon:Icon=CircleAlert,title,text}){return <div className="module-empty"><Icon size={24}/><b>{title}</b><p>{text}</p></div>}

function Overview({data,match}){
  const events=data?.events||[];const keyEvents=events.filter(e=>['Goal','Card','subst'].some(x=>String(e.type||e.detail||'').toLowerCase().includes(x.toLowerCase()))).slice(-6).reverse();
  return <div className="module-stack"><section className="detail-card"><div className="detail-card-head"><b>Match overview</b><small>{match.status_long||match.status}</small></div><div className="overview-grid"><div><span>Half-time</span><b>{match.home_halftime??'—'} : {match.away_halftime??'—'}</b></div><div><span>Round</span><b>{match.round||'—'}</b></div><div><span>Referee</span><b>{match.referee||'TBC'}</b></div><div><span>Timezone</span><b>{match.timezone||'Africa/Addis_Ababa'}</b></div></div></section><section className="detail-card"><div className="detail-card-head"><b>Key moments</b><small>{events.length} events</small></div>{keyEvents.length?<div className="moment-list">{keyEvents.map(e=><div key={e.id} className="moment-row"><span className="minute-chip">{e.minute}′</span><span className="event-icon">{String(e.type).toLowerCase().includes('goal')?<Goal size={16}/>:<Shield size={16}/>}</span><div><b>{e.detail||e.type}</b><small>{e.player?.name||e.team?.name||''}</small></div></div>)}</div>:<Empty icon={Clock3} title="No timeline events yet" text="Events will appear here as the live provider publishes them."/>}</section></div>
}
function Timeline({events}){return <section className="detail-card"><div className="detail-card-head"><b>Match timeline</b><small>{events.length} events</small></div>{events.length?<div className="timeline-list">{events.map(e=><div className="timeline-event" key={e.id}><span className="timeline-minute">{e.minute}{e.extra?`+${e.extra}`:''}′</span><div className="timeline-node"/><div><b>{e.detail||e.type}</b><span>{e.player?.name||e.team?.name||''}{e.assist?.name?` · Assist: ${e.assist.name}`:''}</span></div></div>)}</div>:<Empty icon={Clock3} title="Timeline not available" text="This competition may not expose live event data yet."/>}</section>}
function Lineups({lineups}){return <section className="detail-card"><div className="detail-card-head"><b>Lineups</b><small>{lineups.length?'Confirmed':'Waiting'}</small></div>{lineups.length?<div className="lineup-grid">{lineups.map(x=><div className="lineup-team" key={x.team?.id||x.team?.name}><div className="lineup-title"><span>{x.team?.logo?<img src={x.team.logo} alt=""/>:<Shirt size={17}/>}</span><div><b>{x.team?.name}</b><small>{x.formation||'Formation TBC'} · {x.coach?.name||'Coach TBC'}</small></div></div><h4>Starting XI</h4>{x.startXI.map((p,i)=><div className="player-row" key={`${p.id||p.name}-${i}`}><span>{p.number||'—'}</span><b>{p.name}</b><small>{p.pos||''}</small></div>)}<h4>Bench</h4>{x.substitutes.slice(0,8).map((p,i)=><div className="player-row bench" key={`${p.id||p.name}-${i}`}><span>{p.number||'—'}</span><b>{p.name}</b><small>{p.pos||''}</small></div>)}</div>)}</div>:<Empty icon={Shirt} title="Lineups not published" text="Confirmed starting elevens will appear when the provider has them."/>}</section>}
function Statistics({rows}){const left=rows[0],right=rows[1];const names=useMemo(()=>{const set=new Set();(left?.statistics||[]).forEach(x=>set.add(x.name));(right?.statistics||[]).forEach(x=>set.add(x.name));return [...set]},[rows]);if(!rows.length)return <section className="detail-card"><Empty icon={BarChart3} title="Statistics not available" text="Detailed team statistics depend on provider coverage for this competition."/></section>;const val=(team,name)=>team?.statistics?.find(x=>x.name===name)?.value??0;return <section className="detail-card"><div className="detail-card-head"><b>Team statistics</b><small>Live comparison</small></div><div className="stats-head"><span>{left?.team?.name}</span><span>{right?.team?.name}</span></div><div className="stats-list">{names.map(name=>{const a=val(left,name),b=val(right,name),an=asNumber(a),bn=asNumber(b),total=Math.max(an+bn,1);return <div className="stat-row" key={name}><div><b>{a??0}</b><span>{name}</span><b>{b??0}</b></div><div className="stat-bars"><i style={{width:`${Math.max(4,an/total*100)}%`}}/><i style={{width:`${Math.max(4,bn/total*100)}%`}}/></div></div>})}</div></section>}
function HeadToHead({rows,navigate}){return <section className="detail-card"><div className="detail-card-head"><b>Head to head</b><small>Last {rows.length||0}</small></div>{rows.length?<div className="h2h-list">{rows.map(m=><button key={m.provider_fixture_id||m.id} onClick={()=>navigate(`/match/p-${m.provider_fixture_id||String(m.id).replace('p-','')}`)}><span>{new Date(m.match_date).toLocaleDateString()}</span><div><b>{m.home_en}</b><strong>{m.home_score} : {m.away_score}</strong><b>{m.away_en}</b></div><ChevronRight size={15}/></button>)}</div>:<Empty icon={UsersRound} title="No H2H data" text="Recent meetings are not available for this fixture."/>}</section>}
function Standings({rows}){return <section className="detail-card"><div className="detail-card-head"><b>League table</b><small>{rows.length} teams</small></div>{rows.length?<div className="full-table"><div className="full-table-head"><span>#</span><span>Team</span><span>MP</span><span>GD</span><span>PTS</span></div>{rows.map((r,i)=><div className="full-table-row" key={`${r.rank||i}-${r.name||r.name_en}`}><span>{r.rank||i+1}</span><span>{r.logo&&<img src={r.logo} alt=""/>}<b>{r.name||r.name_en}</b></span><span>{r.played??r.mp??'—'}</span><span>{r.gd??'—'}</span><strong>{r.points??r.pts??'—'}</strong></div>)}</div>:<Empty icon={Trophy} title="Table unavailable" text="Standings are not available for this competition or season."/>}</section>}
function Community({localId,chat,message,setMessage,send,poll,vote,voteBusy,pct,total,auth}){if(!localId)return <section className="detail-card"><Empty icon={MessageCircle} title="Community is preparing" text="Live match chat and predictions become available after this provider fixture is linked to the PostgreSQL match record."/></section>;return <div className="community-grid"><section className="detail-card"><div className="detail-card-head"><b>Prediction</b><small>{total} votes</small></div><div className="detail-poll">{[['home','Home'],['draw','Draw'],['away','Away']].map(([key,label])=><button key={key} disabled={voteBusy} className={poll?.my_vote===key?'active':''} onClick={()=>vote(key)}><b>{label}</b><span>{pct(poll?.[`${key}_votes`]||0)}%</span></button>)}</div></section><section className="detail-card"><div className="detail-card-head"><b>Match-day chat</b><small>{auth.user?'Signed in':'Guest'}</small></div><div className="detail-chat">{chat.length?chat.map(x=><div className="detail-chat-row" key={x.id}><span>{initials(x.username)}</span><div><b>@{x.username}</b><p>{x.message_text}</p></div></div>):<Empty icon={MessageCircle} title="No messages yet" text="Be the first supporter to comment on this match."/>}</div><div className="detail-compose"><input value={message} maxLength={280} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={auth.user?'Write a match comment…':'Sign in to join the chat…'}/><button onClick={send}><Send size={16}/></button></div></section></div>}
