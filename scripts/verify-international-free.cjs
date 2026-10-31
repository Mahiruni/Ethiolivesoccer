'use strict';
// Read-only network evidence for free, *currently available* international scores.
// TheSportsDB official v1 public key "123" per provider documentation.
const base='https://www.thesportsdb.com/api/v1/json/123';
const checks=[{league:'Champions League',id:4480,season:'2026-2027'}];
async function probe(entry,endpoint,field) {
 const url=`${base}/${endpoint}`;
 try {
  const res=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{accept:'application/json'}});
  const body=await res.text();
  let json;try{json=JSON.parse(body)}catch{}
  const data=json?.[field], rows=Array.isArray(data)?data:[];
  const sample=rows.slice(0,2).map(x=>({
    id:x.idEvent||x.idStanding||null,
    date:x.dateEvent||x.strTimestamp||null,
    teams:[x.strHomeTeam,x.strAwayTeam].filter(Boolean),
    score:[x.intHomeScore,x.intAwayScore],
    standingsTeam:x.strTeam||null,
    points:x.intPoints||null,
    season:x.strSeason||null
  }));
  console.log('PROVIDER_PROBE '+JSON.stringify({
   league:entry.league,endpoint,status:res.status,count:rows.length,
   responseKeys:json&&typeof json==='object'?Object.keys(json):[],
   first:sample,error:json?.message||json?.error||(!json?body.slice(0,100):null)
  }));
 } catch(e){ console.log('PROVIDER_PROBE '+JSON.stringify({league:entry.league,endpoint,error:e.message})); }
}
(async()=>{
 for(const entry of checks){
   await probe(entry,`eventsday.php?d=2026-10-28&l=${entry.id}`,'events');
   await probe(entry,`lookuptable.php?l=${entry.id}&s=${entry.season}`,'table');

 }
})().catch(e=>{console.error(e);process.exitCode=1});
