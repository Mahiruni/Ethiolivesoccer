import 'server-only';

export type FeedHeadline={id:string;title:string;url:string;source:string;publishedAt:string;description:string};
const feeds=[
 {name:'BBC Sport',url:'https://feeds.bbci.co.uk/sport/football/rss.xml'},
 {name:'Google News',url:'https://news.google.com/rss/search?q=football%20when%3A1d&hl=en-GB&gl=GB&ceid=GB%3Aen'}
];
function decode(s:string){return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[0-9a-f]+|\d+);|&([a-z]+);/gi,(_,num,named)=>{if(num){const n=num[0].toLowerCase()==='x'?parseInt(num.slice(1),16):Number(num);return n>0&&n<=0x10ffff?String.fromCodePoint(n):''}return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '} as Record<string,string>)[named.toLowerCase()]||''}).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim()}
function tag(xml:string,name:string){return xml.match(new RegExp('<'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+name+'>','i'))?.[1]||''}
function parse(xml:string,source:string):FeedHeadline[]{const items=xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi)||[];return items.slice(0,50).flatMap(item=>{const title=decode(tag(item,'title')).slice(0,220);const rawUrl=decode(tag(item,'link'));const date=new Date(decode(tag(item,'pubDate')));let url:URL;try{url=new URL(rawUrl);if(url.protocol!=='https:'&&url.protocol!=='http:')return []}catch{return []}if(!title||!Number.isFinite(date.getTime())||date.getTime()>Date.now()+300000||date.getTime()<Date.now()-7*86400000)return [];return [{id:url.href,title,url:url.href,source,publishedAt:date.toISOString(),description:decode(tag(item,'description')).slice(0,260)}]})}
export async function footballHeadlines():Promise<{items:FeedHeadline[];checkedAt:string;availableSources:number}>{
 const results=await Promise.allSettled(feeds.map(async f=>{const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),6000);try{const response=await fetch(f.url,{next:{revalidate:300},signal:controller.signal,headers:{'User-Agent':'FETAN-Newsroom/1.0'}});if(!response.ok)throw Error('feed unavailable');const xml=await response.text();if(xml.length>1200000)throw Error('feed too large');return parse(xml,f.name)}finally{clearTimeout(timeout)}}));
 const availableSources=results.filter(r=>r.status==='fulfilled').length;
 const seen=new Set<string>();const items=results.flatMap(r=>r.status==='fulfilled'?r.value:[]).sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)).filter(a=>{const key=a.title.toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,100);if(seen.has(key))return false;seen.add(key);return true}).slice(0,36);
 return {items,checkedAt:new Date().toISOString(),availableSources};
}
