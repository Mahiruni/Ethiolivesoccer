import type { Metadata } from 'next';
import Link from 'next/link';
import {notFound} from 'next/navigation';
import {fixtureById,FeedError} from '@/lib/football';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{id:string}>}):Promise<Metadata>{
 const {id}=await params;try{const match=await fixtureById(id);return {title:match.home+' vs '+match.away,description:match.league+' reported fixture, score and kickoff details.'}}
 catch{return {title:'Match details'}}
}
export default async function MatchPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 let match;
 try{match=await fixtureById(id)}catch(e){if(e instanceof FeedError&&e.status===404)notFound();throw e}
 const scored=match.homeScore!==null&&match.awayScore!==null;
 const date=match.date?new Intl.DateTimeFormat('en-GB',{dateStyle:'full',timeStyle:'short',timeZone:'Africa/Addis_Ababa'}).format(new Date(match.date)):'Kickoff time not verified';
 return <main className="wrap match-detail-layout">
  <Link href={'/league/'+match.leagueSlug} className="back-link">← {match.league}</Link>
  <section className="match-detail-hero">
    <span className="eyebrow">{match.league} / MATCH CENTER</span>
    <div className="detail-scoreboard">
      <div className="detail-team"><span className="detail-team-badge">{match.home.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><h1>{match.home}</h1></div>
      <div className="detail-result"><span className="match-status">{match.status==='LIVE'?'● LIVE':match.status==='FT'?'FULL TIME':match.status==='SCORED'?'RESULT UNCONFIRMED':match.status==='PST'?'POSTPONED':'SCHEDULED'}</span>
        <strong>{scored?match.homeScore+' : '+match.awayScore:'VS'}</strong><small>{date} · EAT</small>
      </div>
      <div className="detail-team"><span className="detail-team-badge">{match.away.split(' ').map(x=>x[0]).slice(0,2).join('')}</span><h1>{match.away}</h1></div>
    </div>
    <p className="muted centered">Free data by TheSportsDB. Match status, statistics, lineups and event coverage may be delayed or unavailable.</p>
  </section>
  <section className="detail-lower-grid">
    <article className="surface"><span className="eyebrow">MATCH INFORMATION</span><h2>Fixture overview</h2><dl className="detail-list"><div><dt>Competition</dt><dd>{match.league}</dd></div><div><dt>Venue</dt><dd>{match.venue||'Not reported'}</dd></div><div><dt>Kickoff</dt><dd>{date}</dd></div><div><dt>Data source</dt><dd>TheSportsDB free feed</dd></div></dl></article>
    <aside className="surface"><span className="eyebrow">MATCH COVERAGE</span><h2>Verified data only</h2><p className="muted">Event timelines, lineups and detailed statistics are not provided by the current free source. We never fill gaps with invented information.</p><Link href={'/league/'+match.leagueSlug} className="action-primary">Explore {match.league} →</Link></aside>
  </section>
 </main>
}