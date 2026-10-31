import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import Link from 'next/link';
import {Newspaper,CalendarDays,ExternalLink,ShieldCheck} from 'lucide-react';
import {storyBySlug,sourceLink} from '@/lib/news';
export const dynamic='force-dynamic';
type Context={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Context):Promise<Metadata>{
 const {slug}=await params,story=await storyBySlug(slug);
 if(!story)return {title:'Story unavailable'};
 return {title:story.titleEn,description:story.summaryEn,openGraph:{title:story.titleEn,description:story.summaryEn,type:'article'}};
}
export default async function StoryPage({params}:Context){
 const {slug}=await params,article=await storyBySlug(slug);
 if(!article)notFound();
 const source=sourceLink(article.sourceUrl);
 return <main className="wrap article-page"><Link href="/stories" className="back-link">← All stories</Link>
  <article className="article-surface"><header className="article-head"><span className="eyebrow">{article.category.toUpperCase()} / THE GLOBAL NEWSROOM</span><h1>{article.titleEn}</h1><p>{article.summaryEn}</p><div className="article-meta"><span><CalendarDays size={15}/>{article.publishedAt?new Intl.DateTimeFormat('en-GB',{dateStyle:'long',timeZone:'Africa/Addis_Ababa'}).format(new Date(article.publishedAt)):'Date unavailable'}</span><span><ShieldCheck size={15}/> {article.source||'Source attribution unavailable'}</span></div></header>
   <div className="article-content">{article.bodyEn?article.bodyEn.split(/\n\n+/).filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>):<p>The complete article text has not been published yet. Check the original source for more information.</p>}</div>
   {source&&<p className="article-source"><Newspaper size={17}/><span>Original reporting</span><a href={source} target="_blank" rel="noopener noreferrer">Visit source <ExternalLink size={15}/></a></p>}
  </article>
 </main>;
}
