/**
 * Generate a review queue of TheSportsDB club/league badge candidates.
 * NEVER downloads artwork or makes a claim that it is licensed.
 * Usage: node scripts/audit-football-artwork.mjs
 */
import {writeFile,mkdir} from 'node:fs/promises';
const base='https://www.thesportsdb.com/api/v1/json/123';
const leagues=[
 {id:4328,name:'Premier League',country:'England'},
 {id:4335,name:'La Liga',country:'Spain'},
 {id:4331,name:'Bundesliga',country:'Germany'},
 {id:4332,name:'Serie A',country:'Italy'},
 {id:4334,name:'Ligue 1',country:'France'}
];
const candidates=new Map();
const log=[];
const isValid=value=>{
 if(typeof value!=='string'||value.length>600)return false;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&
  ['www.thesportsdb.com','r2.thesportsdb.com'].includes(u.hostname)&&
  /^\/images\/(media|icons)\//.test(u.pathname)&&!u.search&&!u.hash;}catch{return false}
};
async function read(endpoint,key){
 const response=await fetch(base+'/'+endpoint,{signal:AbortSignal.timeout(10000),headers:{accept:'application/json'}});
 if(response.status===429){log.push('Rate limited at '+endpoint);return []}
 if(!response.ok){log.push(endpoint+' returned HTTP '+response.status);return []}
 const data=await response.json();
 return Array.isArray(data?.[key])?data[key]:[];
}
function add(entity,providerId,name,candidateUrl,via){
 if(!/^\d+$/.test(String(providerId||''))||!isValid(candidateUrl))return;
 const key=entity+':'+providerId;
 if(!candidates.has(key))candidates.set(key,{
  entity,providerId:String(providerId),name:String(name||'').trim(),sourceUrl:candidateUrl,
  foundVia:via,reviewStatus:'unverified',permissionReference:null,rightsHolder:null,
  license:null,attribution:null,reviewedAt:null,publish:false
 });
}
for(const league of leagues){
 try{
  const rows=await read('lookupleague.php?id='+league.id,'leagues');
  const row=rows.find(x=>String(x.idLeague)===String(league.id));
  if(row)add('league',league.id,league.name,row.strBadge,'lookupleague');
  await new Promise(r=>setTimeout(r,450));
  // Supported by provider docs: a restricted number of standings and day fixtures.
  const standings=await read('lookuptable.php?l='+league.id+'&s=2026-2027','table');
  for(const t of standings)add('team',t.idTeam,t.strTeam,t.strTeamBadge,'standings:'+league.name);
  await new Promise(r=>setTimeout(r,450));
  const date='2026-10-31';
  const fixtures=await read('eventsday.php?d='+date+'&l='+league.id,'events');
  for(const f of fixtures){
   add('team',f.idHomeTeam,f.strHomeTeam,f.strHomeTeamBadge,'fixtures:'+league.name);
   add('team',f.idAwayTeam,f.strAwayTeam,f.strAwayTeamBadge,'fixtures:'+league.name);
  }
  await new Promise(r=>setTimeout(r,450));
 }catch(error){log.push(league.name+': '+(error instanceof Error?error.message:'unknown error'))}
}
const report={
 warning:'CANDIDATE URLS ARE NOT PUBLICATION PERMISSIONS. Review third-party trademarks and image license individually before approving. No assets were downloaded.',
 terms:'https://www.thesportsdb.com/docs_terms_of_use.php',
 provider:'TheSportsDB',generatedAt:new Date().toISOString(),
 candidates:[...candidates.values()],warnings:log
};
await mkdir('artwork-audit',{recursive:true});
await writeFile('artwork-audit/candidates.json',JSON.stringify(report,null,2)+'\n');
console.log('Candidate assets found:',report.candidates.length,'Warnings:',log.length);
console.log('Review artifact: artwork-audit/candidates.json');
