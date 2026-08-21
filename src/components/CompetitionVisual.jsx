import { Flag, Globe2, Medal, Shield, Trophy } from 'lucide-react';

// Official competition marks served by the same football data provider used by EthioLiveScores.
// These four IDs were verified against the provider media endpoints.
const officialCompetitionLogos={
  'english-premier-league':'https://media.api-sports.io/football/leagues/39.png',
  'uefa-champions-league':'https://media.api-sports.io/football/leagues/2.png',
  'la-liga':'https://media.api-sports.io/football/leagues/140.png',
  'serie-a':'https://media.api-sports.io/football/leagues/135.png'
};

export function competitionLogo(item){
  return item?.logo||item?.logo_url||officialCompetitionLogos[item?.slug]||'';
}

export function CompetitionIcon({item,size=22}){
  const type=String(item?.type||'').toLowerCase();
  const tier=String(item?.tier||item?.category||'').toLowerCase();
  if(type.includes('national')||tier==='national')return <Flag size={size}/>;
  if(type.includes('cup'))return <Trophy size={size}/>;
  if(type.includes('continental')||tier==='caf'||tier==='international')return <Globe2 size={size}/>;
  if(type.includes('league'))return <Shield size={size}/>;
  return <Medal size={size}/>;
}

export default function CompetitionVisual({item,className=''}){
  const logo=competitionLogo(item);
  return <span className={`competition-visual ${logo?'has-logo':'has-icon'} ${className}`.trim()} aria-hidden="true">
    {logo?<img src={logo} alt="" referrerPolicy="no-referrer"/>:<CompetitionIcon item={item}/>} 
  </span>;
}
