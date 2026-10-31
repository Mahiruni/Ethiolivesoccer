import 'server-only';
import {accountDatabase,AuthError} from '@/lib/auth';

export type Story={
 slug:string;category:string;competitionSlug:string|null;
 titleEn:string;titleAm:string;summaryEn:string;summaryAm:string;
 bodyEn:string;bodyAm:string;source:string|null;sourceUrl:string|null;
 publishedAt:string|null;
};
const fields=
 'SELECT n.slug,n.category,c.slug AS "competitionSlug",'+
 'n.title_en AS "titleEn",n.title_am AS "titleAm",n.summary_en AS "summaryEn",n.summary_am AS "summaryAm",'+
 "COALESCE(n.body_en,'') AS \"bodyEn\",COALESCE(n.body_am,'') AS \"bodyAm\", "+
 'n.source_label AS "source",n.source_url AS "sourceUrl",n.published_at AS "publishedAt" '+
 'FROM public.news_articles n LEFT JOIN public.competitions c ON c.id=n.competition_id ';
const internationalFilter=
 "n.status='published' AND n.published_at<=NOW() AND "+
 "(c.category='International' OR (n.competition_id IS NULL AND n.category IN ('International','Transfers','Injuries','Preview','Post-match'))) ";
export async function stories(){
 if(!process.env.DATABASE_URL)return [] as Story[];
 try{
  const result=await accountDatabase().query(fields+'WHERE '+internationalFilter+'ORDER BY n.published_at DESC LIMIT 48');
  return result.rows as Story[];
 }catch(error){
  console.warn('News archive temporarily unavailable:',(error as Error).message);
  return [] as Story[];
 }
}
export async function storyBySlug(slug:string){
 if(!/^[a-z0-9][a-z0-9-]{0,179}$/.test(slug))throw new AuthError(404,'ARTICLE_NOT_FOUND','Article unavailable.');
 if(!process.env.DATABASE_URL)return null;
 try{
  const result=await accountDatabase().query(fields+'WHERE '+internationalFilter+'AND n.slug=$1 LIMIT 1',[slug]);
  return result.rows[0] as Story|undefined||null;
 }catch(error){console.warn('News story lookup:',(error as Error).message);return null}
}
export function sourceLink(value:string|null|undefined){
 if(!value)return null;
 try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}
}
