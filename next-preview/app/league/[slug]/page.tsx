import type { Metadata } from 'next';
import {notFound} from 'next/navigation';
import {LEAGUES} from '@/lib/football';
import Matchday from '@/components/Matchday';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;const league=LEAGUES.find(l=>l.slug===slug);
  return {title:league?league.name:'League',description:league?league.name+' fixtures and partial free 2026–27 standings.':'International football coverage.'};
}
export default async function LeaguePage({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;if(!LEAGUES.some(x=>x.slug===slug))notFound();
  return <Matchday initialLeague={slug}/>;
}