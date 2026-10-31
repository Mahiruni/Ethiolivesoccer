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
  // Next image optimization is restricted to approved hosts; preserve other verified crests without broken image URLs.
  const optimized=Boolean(src&&/^https:\/\/(?:www|r2)\.thesportsdb\.com\/images\/media\//.test(src));
  const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase();
  return <span className={`football-logo ${className} ${src&&!broken?'football-logo-approved':''}`} style={{width:size,height:size,minWidth:size,background:'transparent',border:'none',boxShadow:'none'}} title={name}>
    {src&&!broken?<Image src={src} alt={kind==='league'?name+' competition logo':name+' club crest'}
      width={size} height={size} unoptimized={!optimized} priority={priority} quality={80} sizes={size+'px'}
      style={{width:'100%',height:'100%',objectFit:'contain',background:'transparent'}}
      onError={()=>setBroken(true)}/>:
      <span aria-label={name+' official badge unavailable'} className="football-logo-fallback">{initials||'⚽'}</span>}
  </span>;
}
export function CountryFlag({country}:{country:string}){
 const flag=countryIdentity(country);
 return <span className={'football-country-flag '+(flag.iso==='gb-eng'?'flag-england':'')} role="img" title={country} aria-label={country+' flag'}>{flag.iso==='gb-eng'?null:flag.emoji}</span>;
}
