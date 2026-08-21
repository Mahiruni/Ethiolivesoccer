import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe2, Search, Shield, Trophy } from 'lucide-react';
import { competitions } from '../data/content';

const filters=['All','Domestic','CAF','National','International'];
const haptic=()=>{try{navigator.vibrate?.(7)}catch{}};

export default function CompetitionHub({lang='en',compact=false}){
  const [filter,setFilter]=useState('All');
  const [query,setQuery]=useState('');
  const visible=useMemo(()=>competitions.filter(item=>{
    const inTier=filter==='All'||item.tier===filter;
    const q=query.trim().toLowerCase();
    const matches=!q||[item.name,item.nameAm,item.code,item.scope,item.type,item.tier].some(v=>String(v||'').toLowerCase().includes(q));
    return inTier&&matches;
  }),[filter,query]);

  if(compact)return <section className="home-section competition-rail"><div className="section-title-row"><div><span className="eyebrow">Competitions</span><h2>{lang==='am'?'ውድድሮችን ይከታተሉ':'Follow the competitions that matter'}</h2></div><Link className="text-link" to="/competitions">View all <ArrowRight size={14}/></Link></div><div className="competition-scroll">{competitions.slice(0,7).map(i=><Card key={i.slug} item={i} lang={lang} compact/>)}</div></section>;

  return <main className="page content-page competition-directory-page">
    <section className="content-hero competition-directory-hero">
      <div className="competition-hero-icon"><Trophy size={23}/></div>
      <div><span className="eyebrow">Competition center</span><h1>{lang==='am'?'የእግር ኳስ ውድድሮች':'Football competitions'}</h1><p>{lang==='am'?'የኢትዮጵያ፣ የCAF፣ የብሔራዊ ቡድን እና ዓለም አቀፍ ውድድሮችን በአንድ ቦታ ይከታተሉ።':'Fixtures, tables, live scores and stories for Ethiopian, CAF, national-team and international football.'}</p></div>
      <div className="competition-count"><strong>{competitions.length}</strong><span>competitions</span></div>
    </section>

    <section className="competition-toolbar" aria-label="Competition filters">
      <label className="competition-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={lang==='am'?'ውድድር ፈልግ…':'Search competitions…'} aria-label="Search competitions"/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Clear search">×</button>}</label>
      <div className="competition-filter-scroll">{filters.map(item=><button key={item} className={filter===item?'active':''} onClick={()=>{haptic();setFilter(item)}}>{item}</button>)}</div>
    </section>

    <div className="competition-directory-head"><div><b>{filter==='All'?'All competitions':filter}</b><small>{visible.length} available</small></div>{filter!=='All'&&<button onClick={()=>setFilter('All')}>Clear filter</button>}</div>

    {visible.length?<div className="competition-grid competition-results">{visible.map(i=><Card key={i.slug} item={i} lang={lang}/>)}</div>:<div className="competition-empty"><Search size={24}/><b>No competitions found</b><p>Try another competition name or clear the active filter.</p><button onClick={()=>{setFilter('All');setQuery('')}}>Show all competitions</button></div>}
  </main>
}

function TierIcon({tier}){if(tier==='International')return <Globe2 size={16}/>;if(tier==='National')return <Shield size={16}/>;return <Trophy size={16}/>}
function Card({item,lang,compact}){return <Link onClick={haptic} className={`competition-card ${compact?'compact':''}`} to={`/competition/${item.slug}`}><div className="competition-badge">{item.code}</div><div className="competition-card-copy"><span className="competition-card-tier"><TierIcon tier={item.tier}/>{item.tier}</span><small>{item.scope} · {item.type}</small><b>{lang==='am'?item.nameAm:item.name}</b>{!compact&&<p>{lang==='am'?item.descriptionAm:item.description}</p>}</div><span className="competition-card-action"><ArrowRight size={17}/></span></Link>}
