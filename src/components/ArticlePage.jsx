import { useEffect,useState } from 'react';
import { Link,Navigate,useParams } from 'react-router-dom';
import { ArrowLeft,Bell,Clock3,ExternalLink,Languages,Newspaper } from 'lucide-react';
import { apiFetch } from '../api';
import { demoArticles,findCompetition } from '../data/content';

const text=(article,key,lang)=>lang==='am'?(article[`${key}Am`]||article[`${key}En`]||''):(article[`${key}En`]||article[`${key}Am`]||'');

export default function ArticlePage({lang='en',onToggleLang,onOpenProfile}){
  const{slug}=useParams();
  const fallback=demoArticles.find(a=>a.slug===slug);
  const[article,setArticle]=useState(fallback||null);
  const[loading,setLoading]=useState(!fallback);
  useEffect(()=>{let active=true;setLoading(!fallback);apiFetch(`/news/${slug}`).then(d=>{if(active&&d)setArticle(d)}).catch(()=>{}).finally(()=>active&&setLoading(false));return()=>{active=false}},[slug]);
  if(loading&&!article)return <main className="page article-page"><div className="empty-panel">Loading latest story…</div></main>;
  if(!article)return <Navigate to="/news" replace/>;
  const competition=findCompetition(article.competitionSlug);
  const title=text(article,'title',lang),summary=text(article,'summary',lang),body=text(article,'body',lang)||summary;
  const openOriginal=()=>{if(article.externalUrl)window.open(article.externalUrl,'_blank','noopener,noreferrer')};

  return <main className="page article-page"><Link className="back-link" to="/news"><ArrowLeft size={15}/> News desk</Link><article className="article-shell"><header className="article-head"><div className="article-kickers"><span className="story-category">{article.category}</span>{article.demo&&<span className="demo-label">DEMO EDITORIAL</span>}{article.sourceTier==='official'&&<span className="demo-label">OFFICIAL SOURCE</span>}</div><h1>{title}</h1><p>{summary}</p><div className="article-meta"><span><Newspaper size={14}/>{article.source||'EthioLiveScores desk'}</span><span><Clock3 size={14}/>{new Date(article.publishedAt).toLocaleString()}</span>{competition&&<Link to={`/competition/${competition.slug}`}>{competition.name}</Link>}</div><div className="article-actions">{article.titleAm&&article.titleEn&&<button onClick={onToggleLang}><Languages size={15}/>{lang==='am'?'Read in English':'በአማርኛ ያንብቡ'}</button>}{article.externalUrl&&<button onClick={openOriginal}><ExternalLink size={15}/> Read original source</button>}<button onClick={onOpenProfile}><Bell size={15}/> Follow alerts</button></div></header><div className="article-visual"><span>{competition?.code||'ELS'}</span><div><small>{article.category}</small><strong>{article.source||'ETHIO LIVE SCORES'}</strong></div></div><div className="article-body"><p>{body}</p>{article.externalUrl&&<aside className="editorial-note"><b>Source-first news</b><span>EthioLiveScores is showing a short sourced summary. Open the original publisher for the complete report and any later corrections.</span></aside>}{article.demo&&<aside className="editorial-note"><b>Demo content notice</b><span>This article demonstrates the publishing workflow and does not report a real-world transfer, injury, result or breaking event.</span></aside>}</div></article></main>;
}
