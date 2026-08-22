import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock3, MessageCircle, BarChart3, Send, Radio, ChevronRight, RefreshCw, Wifi, WifiOff, Shield } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { leagueToSlug } from '../data/content';

// Verified Ethiopian club crests are presentation-only fallbacks. All match,
// score, fixture and table data now comes from the Gemini server routes.
const verifiedClubLogos={
  'kidus giorgis':'https://soccer.et/wp-content/uploads/2023/04/Giorgis.png',
  'st george':'https://soccer.et/wp-content/uploads/2023/04/Giorgis.png',
  'st. george':'https://soccer.et/wp-content/uploads/2023/04/Giorgis.png',
  'saint george':'https://soccer.et/wp-content/uploads/2023/04/Giorgis.png',
  'ethiopia bunna':'https://soccer.et/wp-content/uploads/2023/04/bunna-1.png',
  'ethiopian bunna':'https://soccer.et/wp-content/uploads/2023/04/bunna-1.png',
  'ethiopian coffee':'https://soccer.et/wp-content/uploads/2023/04/bunna-1.png',
  'fasil kenema':'https://soccer.et/wp-content/uploads/2023/04/Fasil.png',
  'bahir dar ketema':'https://soccer.et/wp-content/uploads/2023/04/bahirdar.png',
  'bahir dar kenema':'https://soccer.et/wp-content/uploads/2023/04/bahirdar.png',
  'sidama bunna':'https://soccer.et/wp-content/uploads/2023/04/Sidama.png',
  'sidama coffee':'https://soccer.et/wp-content/uploads/2023/04/Sidama.png',
  'hawassa ketema':'https://soccer.et/wp-content/uploads/2023/12/Hawassa.png',
  'hawassa city':'https://soccer.et/wp-content/uploads/2023/12/Hawassa.png'
};
const verifiedLogo=(name,providerLogo)=>providerLogo||verifiedClubLogos[String(name||'').trim().toLowerCase()]||'';

// Never display fabricated preview scores when Gemini is unavailable.
const demoMatches=[];
const demoStandings=[];
const liveStatuses=['LIVE','1H','HT','2H','ET','P','BT'];
const finishedStatuses=['FT','AET','PEN'];
const isLive=m=>liveStatuses.includes(String(m.status).toUpperCase());
const isFinished=m=>finishedStatuses.includes(String(m.status).toUpperCase());
const initials=name=>String(name||'Team').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const isoDate=d=>{const x=new Date(d);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`};
const haptic=()=>{try{navigator.vibrate?.(8)}catch{}};

export default function MatchCenter({onNeedAuth}){
  const auth=useAuth();
  const navigate=useNavigate();
  const calendarRef=useRef(null);
  const touchRef=useRef(null);
  const activityRef=useRef(0);
  const [matches,setMatches]=useState([]),[standings,setStandings]=useState([]),[demo,setDemo]=useState(false),[loading,setLoading]=useState(true),[provider,setProvider]=useState(null);
  const [filter,setFilter]=useState('all'),[selected,setSelected]=useState(null),[selectedDate,setSelectedDate]=useState(isoDate(new Date())),[chat,setChat]=useState([]),[message,setMessage]=useState(''),[poll,setPoll]=useState(null),[voteBusy,setVoteBusy]=useState(false),[refreshing,setRefreshing]=useState(false);

  useEffect(()=>{const mark=()=>{activityRef.current=Date.now()};window.addEventListener('scroll',mark,{passive:true});window.addEventListener('touchmove',mark,{passive:true});return()=>{window.removeEventListener('scroll',mark);window.removeEventListener('touchmove',mark)}},[]);

  const loadData=async(silent=false,background=false)=>{if(!silent)setLoading(true);else if(!background)setRefreshing(true);try{const[m,s,p]=await Promise.allSettled([apiFetch(`/matches?date=${selectedDate}`),apiFetch(`/standings?date=${selectedDate}`),apiFetch('/provider/status')]);const matchData=m.status==='fulfilled'&&Array.isArray(m.value)?m.value:[];const table=s.status==='fulfilled'&&Array.isArray(s.value)?s.value:[];setMatches(matchData);setStandings(table);setProvider(p.status==='fulfilled'?p.value:null);setDemo(m.status!=='fulfilled');if(matchData.length&&!matchData.some(x=>String(x.id)===String(selected)))setSelected(matchData[0].id);}catch{setMatches([]);setStandings([]);setDemo(true)}finally{setLoading(false);if(!background)setRefreshing(false)}};
  useEffect(()=>{loadData();},[selectedDate]);
  useEffect(()=>{const id=setInterval(()=>{if(document.visibilityState!=='visible')return;if(Date.now()-activityRef.current<1800)return;loadData(true,true)},provider?.configured?60000:120000);return()=>clearInterval(id)},[selectedDate,provider?.configured]);

  const loadChat=async()=>{const m=matches.find(x=>String(x.id)===String(selected));const local=m?.local_match_id||null;if(!local){setChat([]);return;}try{setChat(await apiFetch(`/chat/${local}`)||[])}catch{setChat([])}};
  const loadPoll=async()=>{const m=matches.find(x=>String(x.id)===String(selected));const local=m?.local_match_id||null;if(!local){setPoll(null);return;}try{setPoll(await apiFetch(`/polls/${local}`))}catch{setPoll(null)}};
  useEffect(()=>{loadChat();loadPoll();const id=setInterval(loadChat,5000);return()=>clearInterval(id)},[selected,matches]);

  const filtered=useMemo(()=>matches.filter(m=>filter==='all'||(filter==='live'&&isLive(m))||(filter==='finished'&&isFinished(m))||(filter==='upcoming'&&!isLive(m)&&!isFinished(m))),[matches,filter]);
  const groups=useMemo(()=>filtered.reduce((acc,m)=>{const k=m.league_name||`League ${m.league_id||''}`;(acc[k]||=[]).push(m);return acc},{}),[filtered]);
  const selectedMatch=matches.find(m=>String(m.id)===String(selected))||matches[0]||null;
  const localSelected=selectedMatch?.local_match_id||null;
  const matchTime=m=>isLive(m)?`${m.current_minute||0}′`:isFinished(m)?String(m.status).toUpperCase():new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(m.match_date));
  const openMatch=m=>{haptic();navigate(`/match/${m.id}`,{state:{match:{...m,home_logo:verifiedLogo(m.home_en,m.home_logo),away_logo:verifiedLogo(m.away_en,m.away_logo)}}})};
  const vote=async choice=>{if(!auth.user){onNeedAuth();return;}if(!localSelected)return;haptic();setVoteBusy(true);try{await apiFetch(`/polls/${localSelected}`,{method:'POST',body:JSON.stringify({vote_choice:choice})});await loadPoll();await auth.loadPredictions?.()}finally{setVoteBusy(false)}};
  const send=async()=>{if(!message.trim())return;if(!auth.user){onNeedAuth();return;}if(!localSelected)return;try{await apiFetch(`/chat/${localSelected}`,{method:'POST',body:JSON.stringify({message_text:message.trim()})});haptic();setMessage('');loadChat()}catch{}};

  const shiftDate=days=>{const d=new Date(`${selectedDate}T12:00:00`);d.setDate(d.getDate()+days);haptic();setFilter('all');setSelectedDate(isoDate(d));};
  const onTouchStart=e=>{activityRef.current=Date.now();const t=e.touches?.[0];if(t)touchRef.current={x:t.clientX,y:t.clientY}};
  const onTouchEnd=e=>{activityRef.current=Date.now();const start=touchRef.current,t=e.changedTouches?.[0];touchRef.current=null;if(!start||!t)return;const dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)>58&&Math.abs(dx)>Math.abs(dy)*1.35)shiftDate(dx<0?1:-1)};
  const center=new Date(`${selectedDate}T12:00:00`),todayKey=isoDate(new Date());
  const dates=[-2,-1,0,1,2].map(offset=>{const d=new Date(center);d.setDate(d.getDate()+offset);return{offset,d,date:isoDate(d)}});
  const total=(poll?.home_votes||0)+(poll?.draw_votes||0)+(poll?.away_votes||0),pct=n=>total?Math.round(n*100/total):0;

  return <main className="page score-swipe-surface" id="scores" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
    <div className="page-head"><div><span className="eyebrow">Match center</span><h1>Football scores</h1><p className="page-subtitle">Gemini-grounded live scores, fixtures and tables. Choose a date to refresh the current football snapshot.</p></div><div className="match-head-actions"><div className={`connection ${demo?'demo':''}`}>{provider?.configured&&!demo?<Wifi size={13}/>:<WifiOff size={13}/>}<span/>{demo?'Gemini unavailable':provider?.provider||'Google Gemini'}</div><button className="mini-refresh" onClick={()=>{haptic();loadData(true)}} disabled={refreshing}><RefreshCw size={14} className={refreshing?'spin':''}/> Refresh</button></div></div>

    <div className="mobile-score-controls">
      <div className="swipe-hint"><span>‹</span><b>Swipe left or right</b><span>to change match day ›</span></div>
      <div className="date-strip"><button className="date-card calendar" onClick={()=>{haptic();calendarRef.current?.showPicker?.()}}><CalendarDays size={18}/><input ref={calendarRef} type="date" value={selectedDate} onChange={e=>e.target.value&&setSelectedDate(e.target.value)} aria-label="Choose match date"/></button>{dates.map(({d,date})=><button key={date} className={`date-card ${selectedDate===date?'active':''}`} onClick={()=>{haptic();setSelectedDate(date)}}><small>{date===todayKey?'TODAY':d.toLocaleDateString('en',{weekday:'short'}).toUpperCase()}</small><b>{d.getDate()}</b></button>)}</div>
      <div className="filters">{['all','live','upcoming','finished'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>{haptic();setFilter(x)}}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div>
    </div>

    <div className="content-grid"><section className="match-column" id="fixtures">
      {loading?<div className="league-card loading-card"><div className="loading-shimmer"/><div className="loading-shimmer short"/><div className="loading-shimmer"/></div>:Object.keys(groups).length?Object.entries(groups).map(([league,list],groupIndex)=><section className="league-card" key={league}>
        <div className="league-head"><div className="league-identity"><span className="league-logo">{list[0]?.league_logo?<img src={list[0].league_logo} alt={`${league} logo`}/>:<Shield size={18}/>}</span><div><b>{league}</b><small>{list[0]?.country||'International'}</small></div></div><button onClick={()=>navigate(`/competition/${list[0]?.competition_slug||leagueToSlug(league)}`)}>View league <ChevronRight size={14}/></button></div>
        {groupIndex===0&&list.some(isLive)&&(()=>{const m=list.find(isLive);return <div className="featured-match" onClick={()=>openMatch(m)} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&openMatch(m)}><div className="featured-meta"><span className="live-label"><Radio size={13}/> LIVE</span><small>{matchTime(m)} · {m.status_long||m.status}</small></div><div className="scoreboard"><TeamBadge name={m.home_en} logo={m.home_logo}/><div className="score-center"><strong>{m.home_score} — {m.away_score}</strong><span>{m.current_minute}′</span></div><TeamBadge name={m.away_en} logo={m.away_logo}/></div><div className="match-actions"><button onClick={e=>{e.stopPropagation();openMatch(m)}}><Clock3 size={14}/>Timeline</button><button onClick={e=>{e.stopPropagation();openMatch(m)}}><BarChart3 size={14}/>Stats</button><button onClick={e=>{e.stopPropagation();haptic();setSelected(m.id);document.getElementById('community')?.scrollIntoView({behavior:'auto',block:'start'})}}><MessageCircle size={14}/>Discuss</button></div></div>})()}
        {list.filter(m=>!(groupIndex===0&&isLive(m))).map(m=><button className="match-row" key={m.id} onClick={()=>openMatch(m)} aria-label={`Open ${m.home_en} versus ${m.away_en}`}><span className={isLive(m)?'live-time':''}>{matchTime(m)}</span><span className="mini-teams"><MiniTeam name={m.home_en} logo={m.home_logo}/><MiniTeam name={m.away_en} logo={m.away_logo}/></span><span className="mini-score"><b>{isLive(m)||isFinished(m)?m.home_score:'—'}</b><b>{isLive(m)||isFinished(m)?m.away_score:'—'}</b></span><ChevronRight className="row-chevron" size={15}/></button>)}
      </section>):<div className="league-card empty-day"><CalendarDays size={28}/><b>{demo?'Gemini could not load verified football data':'No verified matches found for this date'}</b><p>{demo?'The app will not substitute fabricated scores. Retry after Gemini Search grounding is available.':'Swipe to another day or refresh when fixtures are published.'}</p></div>}
      <div className="sponsor-card"><div><small>SPONSORED</small><b>Reach Ethiopian football fans on match day</b></div><button>Advertise</button></div>
    </section>
    <aside className="side-column">
      <section className="side-card" id="standings"><div className="side-head"><b>League table</b><small>TOP 5</small></div><div className="table-head"><span>#</span><span>TEAM</span><span>MP</span><span>PTS</span></div>{standings.slice(0,5).map((r,i)=>{const logo=verifiedLogo(r.name_en,r.logo);return <div className="standing-row" key={r.team_id||r.name_en}><span>{r.rank||i+1}</span><span>{logo?<img className="tiny-logo-img" src={logo} alt={`${r.name_en} crest`} referrerPolicy="no-referrer"/>:<span className="tiny-team"><Shield size={14}/></span>}{r.name_en}</span><span>{r.mp}</span><b>{r.pts}</b></div>})}{!standings.length&&<div className="empty-state">No verified Gemini-grounded table is available right now.</div>}</section>
      <section className="side-card"><div className="side-head"><b>Match prediction</b><small>COMMUNITY</small></div><div className="prediction-box"><h3>{selectedMatch?`${selectedMatch.home_en} vs ${selectedMatch.away_en}`:'No verified match selected'}</h3><p>{localSelected?'Who wins?':'Community voting requires a database-linked fixture.'}</p><div className="poll-grid"><button disabled={voteBusy||!localSelected} className={poll?.my_vote==='home'?'active':''} onClick={()=>vote('home')}><b>Home</b><span>{pct(poll?.home_votes||0)}%</span></button><button disabled={voteBusy||!localSelected} className={poll?.my_vote==='draw'?'active':''} onClick={()=>vote('draw')}><b>Draw</b><span>{pct(poll?.draw_votes||0)}%</span></button><button disabled={voteBusy||!localSelected} className={poll?.my_vote==='away'?'active':''} onClick={()=>vote('away')}><b>Away</b><span>{pct(poll?.away_votes||0)}%</span></button></div><small>{total} community votes</small></div></section>
      <section className="side-card chat-card" id="community"><div className="side-head"><b>Match-day chat</b><small className="live-chat"><span/> LIVE</small></div><div className="chat-stream">{chat.length?chat.map(item=><div className="chat-line" key={item.id}><span className="chat-avatar">{initials(item.username)}</span><div><b>@{item.username}</b><p>{item.message_text}</p></div></div>):<div className="empty-state">{localSelected?'No messages yet. Start the conversation.':'Community chat requires a database-linked fixture.'}</div>}</div><div className="chat-compose"><input maxLength={280} value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={auth.user?'Say something about the match…':'Sign in to join the chat…'} disabled={!localSelected}/><button onClick={send} disabled={!localSelected}><Send size={16}/></button></div></section>
    </aside></div>
  </main>
}

function TeamBadge({name,logo}){const src=verifiedLogo(name,logo);return <div className="team-badge-wrap"><span className="big-team">{src?<img src={src} alt={`${name} official crest`} referrerPolicy="no-referrer"/>:<Shield size={22}/>}</span><b>{name}</b></div>}
function MiniTeam({name,logo}){const src=verifiedLogo(name,logo);return <span>{src?<img className="mini-logo-img" src={src} alt={`${name} crest`} referrerPolicy="no-referrer"/>:<i><Shield size={13}/></i>}{name}</span>}
