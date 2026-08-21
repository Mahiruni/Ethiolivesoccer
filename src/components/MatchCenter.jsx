import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock3, MessageCircle, BarChart3, Send, Radio, ChevronRight, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';
import { leagueToSlug } from '../data/content';

// Verified Ethiopian club crests used only when the live provider has not supplied one.
// Source: Soccer Ethiopia club directory. Live API-Football logos always take priority.
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

const demoMatches=[
  {id:1,league_id:1,league_name:'Ethiopian Premier League',home_en:'Kidus Giorgis',away_en:'Ethiopia Bunna',home_score:1,away_score:1,status:'LIVE',current_minute:67,match_date:new Date().toISOString(),data_source:'Preview'},
  {id:2,league_id:1,league_name:'Ethiopian Premier League',home_en:'Fasil Kenema',away_en:'Bahir Dar Ketema',home_score:0,away_score:0,status:'Scheduled',current_minute:0,match_date:new Date(Date.now()+7200000).toISOString(),data_source:'Preview'},
  {id:3,league_id:1,league_name:'Ethiopian Premier League',home_en:'Sidama Bunna',away_en:'Hawassa Ketema',home_score:2,away_score:1,status:'FT',current_minute:90,match_date:new Date(Date.now()-10800000).toISOString(),data_source:'Preview'}
];
const demoStandings=[
  {name_en:'Kidus Giorgis',mp:18,pts:39,logo:verifiedClubLogos['kidus giorgis']},
  {name_en:'Ethiopia Bunna',mp:18,pts:34,logo:verifiedClubLogos['ethiopia bunna']},
  {name_en:'Fasil Kenema',mp:18,pts:31,logo:verifiedClubLogos['fasil kenema']},
  {name_en:'Bahir Dar Ketema',mp:18,pts:29,logo:verifiedClubLogos['bahir dar ketema']},
  {name_en:'Sidama Bunna',mp:18,pts:27,logo:verifiedClubLogos['sidama bunna']}
];
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
  const [matches,setMatches]=useState([]),[standings,setStandings]=useState([]),[demo,setDemo]=useState(false),[loading,setLoading]=useState(true),[provider,setProvider]=useState(null);
  const [filter,setFilter]=useState('all'),[selected,setSelected]=useState(1),[selectedDate,setSelectedDate]=useState(isoDate(new Date())),[chat,setChat]=useState([]),[message,setMessage]=useState(''),[poll,setPoll]=useState(null),[voteBusy,setVoteBusy]=useState(false),[refreshing,setRefreshing]=useState(false);

  const loadData=async(silent=false)=>{if(!silent)setLoading(true);else setRefreshing(true);try{const[m,s,p]=await Promise.allSettled([apiFetch(`/matches?date=${selectedDate}`),apiFetch('/standings'),apiFetch('/provider/status')]);const matchData=m.status==='fulfilled'?m.value:[];const table=s.status==='fulfilled'?s.value:[];setMatches(matchData?.length?matchData:demoMatches.filter(x=>isoDate(x.match_date)===selectedDate));setStandings(table?.length?table:demoStandings);setProvider(p.status==='fulfilled'?p.value:null);setDemo(!(matchData?.length));}catch{setMatches(demoMatches.filter(x=>isoDate(x.match_date)===selectedDate));setStandings(demoStandings);setDemo(true)}finally{setLoading(false);setRefreshing(false)}};
  useEffect(()=>{loadData();},[selectedDate]);
  useEffect(()=>{const id=setInterval(()=>loadData(true),provider?.configured?15000:30000);return()=>clearInterval(id)},[selectedDate,provider?.configured]);

  const loadChat=async()=>{const m=(matches.length?matches:demoMatches).find(x=>String(x.id)===String(selected));const local=m?.local_match_id||(!String(m?.id||'').startsWith('p-')?m?.id:null);if(!local){setChat([]);return;}try{setChat(await apiFetch(`/chat/${local}`)||[])}catch{setChat([])}};
  const loadPoll=async()=>{const m=(matches.length?matches:demoMatches).find(x=>String(x.id)===String(selected));const local=m?.local_match_id||(!String(m?.id||'').startsWith('p-')?m?.id:null);if(!local){setPoll(null);return;}try{setPoll(await apiFetch(`/polls/${local}`))}catch{setPoll(null)}};
  useEffect(()=>{loadChat();loadPoll();const id=setInterval(loadChat,5000);return()=>clearInterval(id)},[selected,matches]);

  const filtered=useMemo(()=>matches.filter(m=>filter==='all'||(filter==='live'&&isLive(m))||(filter==='finished'&&isFinished(m))||(filter==='upcoming'&&!isLive(m)&&!isFinished(m))),[matches,filter]);
  const groups=useMemo(()=>filtered.reduce((acc,m)=>{const k=m.league_name||`League ${m.league_id||''}`;(acc[k]||=[]).push(m);return acc},{}),[filtered]);
  const selectedMatch=(matches.length?matches:demoMatches).find(m=>String(m.id)===String(selected))||matches[0]||demoMatches[0];
  const localSelected=selectedMatch?.local_match_id||(!String(selectedMatch?.id||'').startsWith('p-')?selectedMatch?.id:null);
  const matchTime=m=>isLive(m)?`${m.current_minute||0}′`:isFinished(m)?String(m.status).toUpperCase():new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(m.match_date));
  const openMatch=m=>{haptic();navigate(`/match/${m.provider_fixture_id?`p-${m.provider_fixture_id}`:m.id}`,{state:{match:{...m,home_logo:verifiedLogo(m.home_en,m.home_logo),away_logo:verifiedLogo(m.away_en,m.away_logo)}}})};
  const vote=async choice=>{if(!auth.user){onNeedAuth();return;}if(!localSelected)return;haptic();setVoteBusy(true);try{await apiFetch(`/polls/${localSelected}`,{method:'POST',body:JSON.stringify({vote_choice:choice})});await loadPoll();await auth.loadPredictions?.()}finally{setVoteBusy(false)}};
  const send=async()=>{if(!message.trim())return;if(!auth.user){onNeedAuth();return;}if(!localSelected)return;try{await apiFetch(`/chat/${localSelected}`,{method:'POST',body:JSON.stringify({message_text:message.trim()})});haptic();setMessage('');loadChat()}catch{}};

  const shiftDate=days=>{const d=new Date(`${selectedDate}T12:00:00`);d.setDate(d.getDate()+days);haptic();setFilter('all');setSelectedDate(isoDate(d));};
  const onTouchStart=e=>{const t=e.touches?.[0];if(t)touchRef.current={x:t.clientX,y:t.clientY}};
  const onTouchEnd=e=>{const start=touchRef.current,t=e.changedTouches?.[0];touchRef.current=null;if(!start||!t)return;const dx=t.clientX-start.x,dy=t.clientY-start.y;if(Math.abs(dx)>58&&Math.abs(dx)>Math.abs(dy)*1.35)shiftDate(dx<0?1:-1)};
  const center=new Date(`${selectedDate}T12:00:00`),todayKey=isoDate(new Date());
  const dates=[-2,-1,0,1,2].map(offset=>{const d=new Date(center);d.setDate(d.getDate()+offset);return{offset,d,date:isoDate(d)}});
  const total=(poll?.home_votes||0)+(poll?.draw_votes||0)+(poll?.away_votes||0),pct=n=>total?Math.round(n*100/total):0;

  return <main className="page score-swipe-surface" id="scores" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
    <div className="page-head"><div><span className="eyebrow">Match center</span><h1>Football scores</h1><p className="page-subtitle">Choose a date, open any match and explore live events, lineups, stats and community discussion.</p></div><div className="match-head-actions"><div className={`connection ${demo?'demo':''}`}>{provider?.configured?<Wifi size={13}/>:<WifiOff size={13}/>}<span/>{demo?'Preview / stored data':provider?.provider||'Live data'}</div><button className="mini-refresh" onClick={()=>{haptic();loadData(true)}} disabled={refreshing}><RefreshCw size={14} className={refreshing?'spin':''}/> Refresh</button></div></div>

    <div className="mobile-score-controls">
      <div className="swipe-hint"><span>‹</span><b>Swipe left or right</b><span>to change match day ›</span></div>
      <div className="date-strip"><button className="date-card calendar" onClick={()=>{haptic();calendarRef.current?.showPicker?.()}}><CalendarDays size={18}/><input ref={calendarRef} type="date" value={selectedDate} onChange={e=>e.target.value&&setSelectedDate(e.target.value)} aria-label="Choose match date"/></button>{dates.map(({d,date})=><button key={date} className={`date-card ${selectedDate===date?'active':''}`} onClick={()=>{haptic();setSelectedDate(date)}}><small>{date===todayKey?'TODAY':d.toLocaleDateString('en',{weekday:'short'}).toUpperCase()}</small><b>{d.getDate()}</b></button>)}</div>
      <div className="filters">{['all','live','upcoming','finished'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>{haptic();setFilter(x)}}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div>
    </div>

    <div className="content-grid"><section className="match-column" id="fixtures">
      {loading?<div className="league-card loading-card"><div className="loading-shimmer"/><div className="loading-shimmer short"/><div className="loading-shimmer"/></div>:Object.keys(groups).length?Object.entries(groups).map(([league,list],groupIndex)=><section className="league-card" key={league}>
        <div className="league-head"><div className="league-identity"><span className="league-logo">{list[0]?.league_logo?<img src={list[0].league_logo} alt={`${league} logo`}/>:<span>ET</span>}</span><div><b>{league}</b><small>{list[0]?.country||'Ethiopia'}</small></div></div><button onClick={()=>navigate(`/competition/${leagueToSlug(league)}`)}>View league <ChevronRight size={14}/></button></div>
        {groupIndex===0&&list.some(isLive)&&(()=>{const m=list.find(isLive);return <div className="featured-match" onClick={()=>openMatch(m)} role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&openMatch(m)}><div className="featured-meta"><span className="live-label"><Radio size={13}/> LIVE</span><small>{matchTime(m)} · {m.status_long||m.status}</small></div><div className="scoreboard"><TeamBadge name={m.home_en} logo={m.home_logo}/><div className="score-center"><strong>{m.home_score} — {m.away_score}</strong><span>{m.current_minute}′</span></div><TeamBadge name={m.away_en} logo={m.away_logo}/></div><div className="match-actions"><button onClick={e=>{e.stopPropagation();openMatch(m)}}><Clock3 size={14}/>Timeline</button><button onClick={e=>{e.stopPropagation();openMatch(m)}}><BarChart3 size={14}/>Stats</button><button onClick={e=>{e.stopPropagation();haptic();setSelected(m.id);document.getElementById('community')?.scrollIntoView({behavior:'smooth'})}}><MessageCircle size={14}/>Discuss</button></div></div>})()}
        {list.filter(m=>!(groupIndex===0&&isLive(m))).map(m=><button className="match-row" key={m.id} onClick={()=>openMatch(m)} aria-label={`Open ${m.home_en} versus ${m.away_en}`}><span className={isLive(m)?'live-time':''}>{matchTime(m)}</span><span className="mini-teams"><MiniTeam name={m.home_en} logo={m.home_logo}/><MiniTeam name={m.away_en} logo={m.away_logo}/></span><span className="mini-score"><b>{isLive(m)||isFinished(m)?m.home_score:'—'}</b><b>{isLive(m)||isFinished(m)?m.away_score:'—'}</b></span><ChevronRight className="row-chevron" size={15}/></button>)}
      </section>):<div className="league-card empty-day"><CalendarDays size={28}/><b>No matches found for this date</b><p>Swipe to another day or refresh when fixtures are published.</p></div>}
      <div className="sponsor-card"><div><small>SPONSORED</small><b>Reach Ethiopian football fans on match day</b></div><button>Advertise</button></div>
    </section>
    <aside className="side-column">
      <section className="side-card" id="standings"><div className="side-head"><b>League table</b><small>TOP 5</small></div><div className="table-head"><span>#</span><span>TEAM</span><span>MP</span><span>PTS</span></div>{(standings.length?standings:demoStandings).slice(0,5).map((r,i)=>{const logo=verifiedLogo(r.name_en,r.logo);return <div className="standing-row" key={r.team_id||r.name_en}><span>{r.rank||i+1}</span><span>{logo?<img className="tiny-logo-img" src={logo} alt={`${r.name_en} crest`} referrerPolicy="no-referrer"/>:<span className="tiny-team">{initials(r.name_en)}</span>}{r.name_en}</span><span>{r.mp}</span><b>{r.pts}</b></div>})}</section>
      <section className="side-card"><div className="side-head"><b>Match prediction</b><small>COMMUNITY</small></div><div className="prediction-box"><h3>{selectedMatch.home_en} vs {selectedMatch.away_en}</h3><p>{localSelected?'Who wins?':'Open a live database-linked match to vote.'}</p><div className="poll-grid"><button disabled={voteBusy||!localSelected} className={poll?.my_vote==='home'?'active':''} onClick={()=>vote('home')}><b>Home</b><span>{pct(poll?.home_votes||0)}%</span></button><button disabled={voteBusy||!localSelected} className={poll?.my_vote==='draw'?'active':''} onClick={()=>vote('draw')}><b>Draw</b><span>{pct(poll?.draw_votes||0)}%</span></button><button disabled={voteBusy||!localSelected} className={poll?.my_vote==='away'?'active':''} onClick={()=>vote('away')}><b>Away</b><span>{pct(poll?.away_votes||0)}%</span></button></div><small>{total} community votes</small></div></section>
      <section className="side-card chat-card" id="community"><div className="side-head"><b>Match-day chat</b><small className="live-chat"><span/> LIVE</small></div><div className="chat-stream">{chat.length?chat.map(item=><div className="chat-line" key={item.id}><span className="chat-avatar">{initials(item.username)}</span><div><b>@{item.username}</b><p>{item.message_text}</p></div></div>):<div className="empty-state">{localSelected?'No messages yet. Start the conversation.':'Community chat becomes available after the fixture is linked to PostgreSQL.'}</div>}</div><div className="chat-compose"><input maxLength={280} value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={auth.user?'Say something about the match…':'Sign in to join the chat…'} disabled={!localSelected}/><button onClick={send} disabled={!localSelected}><Send size={16}/></button></div></section>
    </aside></div>
  </main>
}

function TeamBadge({name,logo}){const src=verifiedLogo(name,logo);return <div className="team-badge-wrap"><span className="big-team">{src?<img src={src} alt={`${name} official crest`} referrerPolicy="no-referrer"/>:initials(name)}</span><b>{name}</b></div>}
function MiniTeam({name,logo}){const src=verifiedLogo(name,logo);return <span>{src?<img className="mini-logo-img" src={src} alt={`${name} crest`} referrerPolicy="no-referrer"/>:<i>{initials(name)}</i>}{name}</span>}
