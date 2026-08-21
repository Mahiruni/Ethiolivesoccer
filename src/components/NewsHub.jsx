import { useEffect,useMemo,useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight,Clock3,Newspaper,Sparkles } from 'lucide-react';
import { apiFetch } from '../api';
import { demoArticles } from '../data/content';

const preferred=['All','Ethiopia','CAF','Transfers','Injuries','Preview','Post-match','International','Platform'];
const text=(article,key,lang)=>lang==='am'?(article[`${key}Am`]||article[`${key}En`]||''):(article[`${key}En`]||article[`${key}Am`]||'');

export default function NewsHub({lang='en',compact=false}){
  const[articles,setArticles]=useState(demoArticles);
  const[category,setCategory]=useState('All');
  const[liveDesk,setLiveDesk]=useState(false);
  useEffect(()=>{let active=true;apiFetch('/news').then(d=>{if(active&&Array.isArray(d)&&d.length){setArticles(d);setLiveDesk(true)}}).catch(()=>{});return()=>{active=false}},[]);
  const categories=useMemo(()=>{
    const available=new Set(articles.map(a=>a.category).filter(Boolean));
    return preferred.filter(c=>c==='All'||available.has(c)).concat([...available].filter(c=>!preferred.includes(c)));
  },[articles]);
  const filtered=useMemo(()=>category==='All'?articles:articles.filter(a=>a.category===category),[articles,category]);

  if(compact){
    const lead=articles[0]||demoArticles[0];
    return <section className="home-section news-teaser"><div className="section-title-row"><div><span className="eyebrow">News desk</span><h2>{lang==='am'?'ዜና፣ ዝውውር እና የጨዋታ ቅድመ እይታ':'News, transfers and match context'}</h2></div><Link className="text-link" to="/news">Open news <ArrowRight size={14}/></Link></div><div className="news-teaser-grid"><Link className="lead-story" to={`/news/${lead.slug}`}><div className="story-art"><Newspaper size={30}/><span>{liveDesk?'LIVE NEWS':'ETHIO DESK'}</span></div><div><span className="story-category">{lead.category}</span><h3>{text(lead,'title',lang)}</h3><p>{text(lead,'summary',lang)}</p><small>{lead.source?`${lead.source} · `:lead.demo?'Demo editorial · ':''}{fmt(lead.publishedAt)}</small></div></Link><div className="mini-story-stack">{articles.slice(1,4).map(a=><Link className="mini-story" key={a.slug} to={`/news/${a.slug}`}><span className="story-category">{a.category}</span><b>{text(a,'title',lang)}</b><small>{a.source?`${a.source} · `:''}{fmt(a.publishedAt)}</small></Link>)}</div></div></section>;
  }

  return <main className="page content-page"><div className="content-hero news-hero"><div><span className="eyebrow">EthioLiveScores newsroom</span><h1>{lang==='am'?'የእግር ኳስ ዜና በእንግሊዝኛ እና በአማርኛ':'Football news from verified publishers and football sources'}</h1><p>{lang==='am'?'የኢትዮጵያ፣ CAF እና ዓለም አቀፍ የእግር ኳስ ዜናዎች፣ ዝውውሮች፣ ጉዳቶች እና የጨዋታ መረጃ።':'Current Ethiopian, CAF and international football news, transfers, injuries and match context with source attribution.'}</p></div><div className="newsroom-badge"><Sparkles size={20}/><b>{liveDesk?'Sourced live desk':'Bilingual desk'}</b><small>{liveDesk?'Multi-source':'EN + አማ'}</small></div></div><div className="news-filters">{categories.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div><div className="news-grid">{filtered.map((a,i)=><Link className={`news-card ${i===0&&category==='All'?'featured':''}`} to={`/news/${a.slug}`} key={a.slug}><div className="news-card-art"><span>{a.category}</span><Newspaper size={i===0?36:25}/></div><div className="news-card-body"><span className="story-category">{a.category}</span><h2>{text(a,'title',lang)}</h2><p>{text(a,'summary',lang)}</p><div className="story-meta"><Clock3 size={13}/>{a.source&&<span>{a.source}</span>}{a.demo&&<span>Demo desk</span>}<span>{fmt(a.publishedAt)}</span></div></div></Link>)}</div></main>;
}

function fmt(v){try{return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch{return''}}
