import { useEffect,useState } from 'react';
import { Link,Navigate,useParams } from 'react-router-dom';
import { ArrowLeft,CalendarDays,ChevronRight,Clock3,Newspaper,Radio,Trophy } from 'lucide-react';
import { apiFetch } from '../api';
import { demoArticles,findCompetition } from '../data/content';

const live=['LIVE','1H','HT','2H','ET'],done=['FT','AET','PEN'];
const isLive=m=>live.includes(String(m.status).toUpperCase());
const isFinished=m=>done.includes(String(m.status).toUpperCase());
const initials=name=>String(name||'Team').split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();
const haptic=()=>{try{navigator.vibrate?.(7)}catch{}};

export default function CompetitionPage({lang='en'}){
  const{slug}=useParams();
  const fallback=findCompetition(slug);
  const[data,setData]=useState(fallback?{competition:fallback,matches:[],standings:[],demo:true}:null);
  const[tab,setTab]=useState('overview');
  const[loading,setLoading]=useState(Boolean(fallback));

  useEffect(()=>{if(!fallback)return;setData({competition:fallback,matches:[],standings:[],demo:true});setLoading(true);apiFetch(`/competitions/${slug}`).then(setData).catch(()=>{}).finally(()=>setLoading(false))},[slug]);
  if(!fallback)return <Navigate to="/competitions" replace/>;

  const c=data?.competition||fallback;
  const stories=demoArticles.filter(a=>a.competitionSlug===slug);
  const matches=data?.matches||[];
  const standings=data?.standings||[];
  const tabs=[['overview','Overview'],['fixtures','Fixtures'],['table','Table'],['news','News']];

  return <main className="page content-page competition-detail-page">
    <div className="competition-detail-top"><Link className="back-link" to="/competitions"><ArrowLeft size={15}/> Competitions</Link><div className={`data-pill ${data?.demo?'demo':''}`}><span/>{data?.demo?'Directory mode':'Live data'}</div></div>

    <section className="competition-hero competition-profile-hero">
      <div className="competition-hero-mark">{c.logo?<img src={c.logo} alt={`${c.name} logo`}/>:c.code}</div>
      <div className="competition-hero-copy"><small>{c.scope} · {c.type}</small><h1>{lang==='am'?c.nameAm:c.name}</h1><p>{lang==='am'?c.descriptionAm:c.description}</p></div>
      <div className="competition-hero-stats"><span><strong>{matches.length||'—'}</strong><small>fixtures</small></span><span><strong>{matches.filter(isLive).length||'—'}</strong><small>live</small></span><span><strong>{standings.length||'—'}</strong><small>teams</small></span></div>
    </section>

    <nav className="competition-tabs competition-tabs-sticky" aria-label="Competition sections">{tabs.map(([id,label])=><button key={id} className={tab===id?'active':''} onClick={()=>{haptic();setTab(id)}}>{label}</button>)}</nav>

    {tab==='overview'&&<div className="competition-layout">
      <section className="surface-card competition-overview"><div className="card-heading"><div><span className="eyebrow">Competition hub</span><h2>{lang==='am'?'ሁሉም ነገር በአንድ ቦታ':'At a glance'}</h2></div><Trophy size={22}/></div><div className="overview-metrics"><Metric icon={<CalendarDays size={18}/>} value={matches.length||'—'} label="Fixtures"/><Metric icon={<Radio size={18}/>} value={matches.filter(isLive).length||'—'} label="Live now"/><Metric icon={<Newspaper size={18}/>} value={stories.length||'—'} label="Stories"/></div><p className="muted-copy">{lang==='am'?'ይህ ገጽ የውድድሩን ጨዋታዎች፣ ደረጃ ሰንጠረዥ እና ዜና በአንድ ቦታ ያሳያል።':'Use the tabs above to move quickly between fixtures, standings and competition news.'}</p></section>
      <StoryList stories={stories} lang={lang}/>
    </div>}

    {tab==='fixtures'&&<section className="surface-card competition-module"><div className="card-heading"><div><span className="eyebrow">Fixtures</span><h2>Match schedule</h2></div><Clock3 size={21}/></div><div className="fixture-list">{loading?<div className="empty-panel">Loading competition fixtures…</div>:matches.length?matches.map(m=><Fixture key={m.id} match={m}/>):<div className="empty-panel">No verified fixture feed is connected for this competition yet.</div>}</div></section>}

    {tab==='table'&&<section className="surface-card competition-module"><div className="card-heading"><div><span className="eyebrow">Standings</span><h2>Competition table</h2></div><Trophy size={21}/></div>{standings.length?<div className="competition-table"><div className="competition-table-head"><span>#</span><span>Team</span><span>MP</span><span>GD</span><span>PTS</span></div>{standings.map((r,i)=><div className="competition-table-row" key={r.team_id||r.name_en}><span>{r.rank||i+1}</span><span className="competition-table-team">{r.logo?<img src={r.logo} alt={`${r.name_en} crest`}/>:<i>{initials(r.name_en)}</i>}<b>{r.name_en}</b></span><span>{r.mp??r.played??'—'}</span><span>{r.gd??'—'}</span><strong>{r.pts??r.points??'—'}</strong></div>)}</div>:<div className="empty-panel">The table will appear when league-specific results are available.</div>}</section>}

    {tab==='news'&&<StoryList stories={stories} lang={lang} expanded/>}
  </main>
}

function Metric({icon,value,label}){return <div className="metric-card"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>}
function TeamIdentity({name,logo}){return <span className="competition-fixture-team">{logo?<img src={logo} alt={`${name} crest`}/>:<i>{initials(name)}</i>}<b>{name}</b></span>}
function Fixture({match}){const time=isLive(match)?`${match.current_minute||0}′`:isFinished(match)?String(match.status).toUpperCase():new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(match.match_date));const id=match.provider_fixture_id?`p-${match.provider_fixture_id}`:match.id;return <Link onClick={haptic} to={`/match/${id}`} state={{match}} className="competition-fixture"><span className={isLive(match)?'fixture-live':''}>{time}</span><div className="competition-fixture-teams"><TeamIdentity name={match.home_en} logo={match.home_logo}/><TeamIdentity name={match.away_en} logo={match.away_logo}/></div><div className="fixture-score"><strong>{isLive(match)||isFinished(match)?match.home_score:'—'}</strong><strong>{isLive(match)||isFinished(match)?match.away_score:'—'}</strong></div><ChevronRight className="competition-fixture-arrow" size={16}/></Link>}
function StoryList({stories,lang,expanded=false}){const list=stories.length?stories:demoArticles.slice(0,expanded?5:3);return <section className="surface-card competition-stories"><div className="card-heading"><div><span className="eyebrow">News desk</span><h2>{lang==='am'?'የውድድር ታሪኮች':'Competition stories'}</h2></div><Newspaper size={21}/></div><div className="compact-story-list">{list.map(a=><Link onClick={haptic} to={`/news/${a.slug}`} className="compact-story" key={a.slug}><span className="story-category">{a.category}</span><div><b>{lang==='am'?a.titleAm:a.titleEn}</b><small>{a.demo?'Demo desk · ':''}{new Date(a.publishedAt).toLocaleDateString()}</small></div><ChevronRight size={16}/></Link>)}</div></section>}
