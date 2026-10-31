'use client';
import Image from 'next/image';
import {useState} from 'react';
import {countryIdentity} from '@/lib/sports-identity';

type Props={
  name:string; src?:string|null; className?:string;
  size?:number; priority?:boolean; kind?:'team'|'league';
};
export default function FootballLogo({name,src,className='',size=36,priority=false,kind='team'}:Props){
  const [broken,setBroken]=useState(false);
  const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  return <span className={`football-logo ${className} ${src&&!broken?'football-logo-approved':''}`} style={{width:size,height:size,minWidth:size}} title={name}>
    {src&&!broken?<Image src={src} alt={kind==='league'?name+' competition logo':name+' club crest'}
      width={size} height={size} unoptimized priority={priority} sizes={size+'px'}
      style={{width:'100%',height:'100%',objectFit:'contain'}}
      onError={()=>setBroken(true)}/>:
      <span aria-label={name+' official badge unavailable'} className="football-logo-fallback">{initials||'⚽'}</span>}
  </span>;
}
export function CountryFlag({country}:{country:string}){
 const flag=countryIdentity(country);
 return <span className={'football-country-flag '+(flag.iso==='gb-eng'?'flag-england':'')} role="img" title={country} aria-label={country+' flag'}>{flag.iso==='gb-eng'?null:flag.emoji}</span>;
}
