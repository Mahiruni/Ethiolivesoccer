import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock3, MessageCircle, BarChart3, Send, Radio, ChevronRight } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';

const demoMatches = [
  {id:1,league_id:1,league_name:'Ethiopian Premier League',home_en:'St. George',away_en:'Ethiopian Coffee',home_score:1,away_score:1,status:'LIVE',current_minute:67,match_date:new Date().toISOString()},
  {id:2,league_id:1,league_name:'Ethiopian Premier League',home_en:'Fasil Kenema',away_en:'Bahir Dar Kenema',home_score:0,away_score:0,status:'Scheduled',current_minute:0,match_date:new Date(Date.now()+7200000).toISOString()},
  {id:3,league_id:1,league_name:'Ethiopian Premier League',home_en:'Sidama Coffee',away_en:'Hawassa City',home_score:2,away_score:1,status:'FT',current_minute:90,match_date:new Date(Date.now()-10800000).toISOString()},
  {id:4,league_id:2,league_name:'National League',home_en:'Adama City',away_en:'Wolaita Dicha',home_score:0,away_score:0,status:'Scheduled',current_minute:0,match_date:new Date(Date.now()+14400000).toISOString()}
];
const demoStandings = [
  {name_en:'St. George',mp:18,pts:39},{name_en:'Ethiopian Coffee',mp:18,pts:34},{name_en:'Fasil Kenema',mp:18,pts:31},{name_en:'Bahir Dar Kenema',mp:18,pts:29},{name_en:'Sidama Coffee',mp:18,pts:27}
];
const liveStatuses = ['LIVE','1H','HT','2H','ET'];
const finishedStatuses = ['FT','AET','PEN'];
const isLive = m => liveStatuses.includes(String(m.status).toUpperCase());
const isFinished = m => finishedStatuses.includes(String(m.status).toUpperCase());
const initials = name => String(name||'Team').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const teamHue = name => [...String(name)].reduce((a,c)=>(a*31+c.charCodeAt(0))%360,0);

export default function MatchCenter({ onNeedAuth }) {
  const auth = useAuth();
  const [matches,setMatches]=useState([]); const [standings,setStandings]=useState([]); const [demo,setDemo]=useState(false);
  const [filter,setFilter]=useState('all'); const [selected,setSelected]=useState(1); const [chat,setChat]=useState([]); const [message,setMessage]=useState('');
  const [poll,setPoll]=useState(null); const [voteBusy,setVoteBusy]=useState(false);

  const loadData = async () => {
    try {
      const [m,s]=await Promise.all([apiFetch('/matches'),apiFetch('/standings')]);
      setMatches(m?.length?m:demoMatches); setStandings(s?.length?s:demoStandings); setDemo(!(m?.length));
    } catch { setMatches(demoMatches); setStandings(demoStandings); setDemo(true); }
  };
  const loadChat = async () => { try { setChat(await apiFetch(`/chat/${selected}`)||[]); } catch { setChat([]); } };
  const loadPoll = async () => { try { setPoll(await apiFetch(`/polls/${selected}`)); } catch { setPoll(null); } };
  useEffect(()=>{loadData();const id=setInterval(loadData,30000);return()=>clearInterval(id)},[]);
  useEffect(()=>{loadChat();loadPoll();const id=setInterval(loadChat,5000);return()=>clearInterval(id)},[selected]);

  const filtered = useMemo(()=> (matches.length?matches:demoMatches).filter(m=>filter==='all'||(filter==='live'&&isLive(m))||(filter==='finished'&&isFinished(m))||(filter==='upcoming'&&!isLive(m)&&!isFinished(m))),[matches,filter]);
  const groups = useMemo(()=>filtered.reduce((acc,m)=>{const k=m.league_name||`League ${m.league_id||''}`;(acc[k]||=[]).push(m);return acc},{}),[filtered]);
  const selectedMatch=(matches.length?matches:demoMatches).find(m=>Number(m.id)===Number(selected))||demoMatches[0];

  const matchTime = (m) => isLive(m)?`${m.current_minute||0}′`:isFinished(m)?'FT':new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(m.match_date));
  const vote = async choice => {
    if(!auth.user){onNeedAuth();return;} setVoteBusy(true);
    try { await apiFetch(`/polls/${selected}`,{method:'POST',body:JSON.stringify({vote_choice:choice})}); await loadPoll(); await auth.loadPredictions(); } catch{} finally{setVoteBusy(false)}
  };
  const send = async () => {
    if(!message.trim())return; if(!auth.user){onNeedAuth();return;}
    try { await apiFetch(`/chat/${selected}`,{method:'POST',body:JSON.stringify({message_text:message.trim()})}); setMessage(''); loadChat(); } catch{}
  };

  const dates=[-2,-1,0,1,2].map(offset=>{const d=new Date();d.setDate(d.getDate()+offset);return{offset,d}});
  const total=(poll?.home_votes||0)+(poll?.draw_votes||0)+(poll?.away_votes||0); const pct=n=>total?Math.round(n*100/total):0;

  return <main className="page" id="scores">
    <div className="page-head"><div><span className="eyebrow">Match center</span><h1>Today’s matches</h1></div><div className={`connection ${demo?'demo':''}`}><span/>{demo?'Demo data':'Live API'}</div></div>
    <div className="date-strip"><button className="date-card calendar"><CalendarDays size={18}/></button>{dates.map(({offset,d})=><button key={offset} className={`date-card ${offset===0?'active':''}`}><small>{offset===0?'TODAY':d.toLocaleDateString('en',{weekday:'short'}).toUpperCase()}</small><b>{d.getDate()}</b></button>)}</div>
    <div className="filters">{['all','live','upcoming','finished'].map(x=><button key={x} className={filter===x?'active':''} onClick={()=>setFilter(x)}>{x[0].toUpperCase()+x.slice(1)}</button>)}</div>

    <div className="content-grid">
      <section className="match-column" id="fixtures">
        {Object.entries(groups).map(([league,list],groupIndex)=><section className="league-card" key={league}>
          <div className="league-head"><div className="league-identity"><span className="league-logo">ET</span><div><b>{league}</b><small>Ethiopia</small></div></div><button>View league <ChevronRight size={14}/></button></div>
          {groupIndex===0 && list.some(isLive) && (()=>{const m=list.find(isLive);return <div className="featured-match" onClick={()=>setSelected(m.id)}>
            <div className="featured-meta"><span className="live-label"><Radio size={13}/> LIVE</span><small>{matchTime(m)} · {m.status}</small></div>
            <div className="scoreboard"><TeamBadge name={m.home_en}/><div className="score-center"><strong>{m.home_score} — {m.away_score}</strong><span>{m.current_minute}′</span></div><TeamBadge name={m.away_en}/></div>
            <div className="match-actions"><button><Clock3 size={14}/>Timeline</button><button><BarChart3 size={14}/>Stats</button><button onClick={(e)=>{e.stopPropagation();setSelected(m.id);document.getElementById('community')?.scrollIntoView({behavior:'smooth'})}}><MessageCircle size={14}/>Discuss</button></div>
          </div>})()}
          {list.filter(m=>!(groupIndex===0&&isLive(m))).map(m=><button className="match-row" key={m.id} onClick={()=>setSelected(m.id)}><span className={isLive(m)?'live-time':''}>{matchTime(m)}</span><span className="mini-teams"><MiniTeam name={m.home_en}/><MiniTeam name={m.away_en}/></span><span className="mini-score"><b>{isLive(m)||isFinished(m)?m.home_score:'—'}</b><b>{isLive(m)||isFinished(m)?m.away_score:'—'}</b></span></button>)}
        </section>)}
        <div className="sponsor-card"><div><small>SPONSORED</small><b>Reach Ethiopian football fans on match day</b></div><button>Advertise</button></div>
      </section>

      <aside className="side-column">
        <section className="side-card" id="standings"><div className="side-head"><b>League table</b><small>TOP 5</small></div><div className="table-head"><span>#</span><span>TEAM</span><span>MP</span><span>PTS</span></div>{(standings.length?standings:demoStandings).slice(0,5).map((r,i)=><div className="standing-row" key={r.team_id||r.name_en}><span>{i+1}</span><span><span className="tiny-team" style={{'--h':teamHue(r.name_en)}}>{initials(r.name_en)}</span>{r.name_en}</span><span>{r.mp}</span><b>{r.pts}</b></div>)}</section>

        <section className="side-card"><div className="side-head"><b>Match prediction</b><small>COMMUNITY</small></div><div className="prediction-box"><h3>{selectedMatch.home_en} vs {selectedMatch.away_en}</h3><p>Who wins?</p><div className="poll-grid"><button disabled={voteBusy} className={poll?.my_vote==='home'?'active':''} onClick={()=>vote('home')}><b>Home</b><span>{pct(poll?.home_votes||0)}%</span></button><button disabled={voteBusy} className={poll?.my_vote==='draw'?'active':''} onClick={()=>vote('draw')}><b>Draw</b><span>{pct(poll?.draw_votes||0)}%</span></button><button disabled={voteBusy} className={poll?.my_vote==='away'?'active':''} onClick={()=>vote('away')}><b>Away</b><span>{pct(poll?.away_votes||0)}%</span></button></div><small>{total} community votes</small></div></section>

        <section className="side-card chat-card" id="community"><div className="side-head"><b>Match-day chat</b><small className="live-chat"><span/> LIVE</small></div><div className="chat-stream">{chat.length?chat.map(item=><div className="chat-line" key={item.id}><span className="chat-avatar">{initials(item.username)}</span><div><b>@{item.username}</b><p>{item.message_text}</p></div></div>):<div className="empty-state">{demo?'Connect PostgreSQL to enable live community chat.':'No messages yet. Start the conversation.'}</div>}</div><div className="chat-compose"><input maxLength={280} value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder={auth.user?'Say something about the match…':'Sign in to join the chat…'}/><button onClick={send}><Send size={16}/></button></div></section>
      </aside>
    </div>
  </main>
}

function TeamBadge({name}){const h=teamHue(name);return <div className="team-badge-wrap"><span className="big-team" style={{background:`linear-gradient(145deg,hsl(${h} 65% 45%),hsl(${(h+32)%360} 58% 28%))`}}>{initials(name)}</span><b>{name}</b></div>}
function MiniTeam({name}){const h=teamHue(name);return <span><i style={{background:`hsl(${h} 55% 40%)`}}>{initials(name)}</i>{name}</span>}
