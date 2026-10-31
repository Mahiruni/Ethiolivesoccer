import type {Metadata} from 'next';
import Link from 'next/link';
import {Newspaper,Clock3,ArrowUpRight,ShieldCheck} from 'lucide-react';
import {stories} from '@/lib/news';
export const dynamic='force-dynamic';
export const metadata:Metadata={title:'International football stories',description:'Source-attributed international football news, previews, transfers and match analysis.'};
export default async function Stories(){
 const articles=await stories();
 return <main className="wrap news-page">
  <section className="news-hero"><span className="eyebrow">THE GLOBAL NEWSROOM</span><h1>Stories beyond<br/><span>the final whistle.</span></h1><p>Verified, source-attributed football reporting. We publish what we can substantiate—never fabricated match news.</p></section>
  <div className="section-label"><div><span className="eyebrow">THE LATEST</span><h2>International football desk</h2></div><div className="source-indicator"><ShieldCheck size={15}/> VERIFIED PUBLISHED ARTICLES</div></div>
  {articles.length?<div className="story-grid">{articles.map((a,i)=><Link href={'/stories/'+a.slug} className={'story-card '+(i===0?'featured':'')} key={a.slug}><div className="story-card-art"><Newspaper size={i===0?35:27}/><span>{a.category}</span></div><div className="story-card-copy"><div className="eyebrow">{a.competitionSlug?.replaceAll('-',' ')||'INTERNATIONAL'}</div><h2>{a.titleEn}</h2><p>{a.summaryEn}</p><div className="story-card-bottom"><span><Clock3 size={13}/>{a.publishedAt?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Africa/Addis_Ababa'}).format(new Date(a.publishedAt)):'DATE UNAVAILABLE'}</span><span>{a.source||'SOURCE ATTRIBUTED'}</span><ArrowUpRight size={16}/></div></div></Link>)}</div>:
  <div className="news-empty"><Newspaper size={31}/><h3>No verified stories published yet</h3><p>This newsroom only shows approved, source-attributed international articles stored in the EthioLiveScores database.</p><Link className="action-primary" href="/">Return to matchday</Link></div>}
 </main>
}
