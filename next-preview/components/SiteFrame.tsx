'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Activity,House,Trophy,Newspaper,UsersRound,UserRound,ArrowUpRight,Menu,X} from 'lucide-react';
import {useState} from 'react';

const items=[
  {name:'Matchday',href:'/',Icon:House},
  {name:'Leagues',href:'/league/premier-league',Icon:Trophy},
  {name:'Stories',href:'/stories',Icon:Newspaper},
  {name:'Fan zone',href:'/community',Icon:UsersRound},
  {name:'Account',href:'/account',Icon:UserRound}
];
export default function SiteFrame({children}:{children:React.ReactNode}){
 const path=usePathname();
 const [drawer,setDrawer]=useState(false);
 const isActive=(href:string)=>href==='/'?path==='/':href.startsWith('/league')?path.startsWith('/league'):path.startsWith(href);
 return <>
  <header className="site-header"><div className="wrap header-inner">
    <Link href="/" className="wordmark" aria-label="EthioLiveScores home"><span className="wordmark-icon"><Activity size={23} strokeWidth={2.7}/></span><span className="wordmark-copy"><strong>ETHIO<span>LIVE</span></strong><small>THE GLOBAL MATCHDAY</small></span></Link>
    <nav className="header-nav" aria-label="Primary navigation">{items.map(({name,href,Icon})=><Link key={href} href={href} aria-current={isActive(href)?'page':undefined} className={isActive(href)?'active':''}><Icon size={16}/>{name}</Link>)}</nav>
    <div className="header-actions"><span className="preview-pill"><span/> NEXT.JS PREVIEW</span><button type="button" className="menu-toggle" aria-label={drawer?'Close menu':'Open menu'} aria-expanded={drawer} onClick={()=>setDrawer(x=>!x)}>{drawer?<X size={22}/>:<Menu size={22}/>}</button></div>
  </div></header>
  {drawer&&<nav className="mobile-drawer" aria-label="Menu">{items.map(({name,href,Icon})=><Link key={href} href={href} onClick={()=>setDrawer(false)}><Icon size={18}/>{name}<ArrowUpRight size={15}/></Link>)}</nav>}
  <div className="site-ribbon"><div className="wrap ribbon-inner"><span className="ribbon-dot"/><strong>GLOBAL FOOTBALL</strong><span>PREMIER LEAGUE</span><i/><span>LA LIGA</span><i/><span>BUNDESLIGA</span><i/><span>SERIE A</span><i/><span>LIGUE 1</span><span className="ribbon-note">FREE DATA · PARTIAL COVERAGE</span></div></div>
  {children}
  <footer className="site-footer"><div className="wrap footer-inner"><span>© 2026 ETHIOLIVE · A BETTER MATCHDAY.</span><span>DATA BY <a href="https://www.thesportsdb.com/" rel="noreferrer" target="_blank">THESPORTSDB</a> · FIXTURES & TABLES MAY BE PARTIAL</span></div></footer>
  <nav className="bottom-nav" aria-label="Mobile tabs">{items.map(({name,href,Icon})=><Link key={href} href={href} aria-current={isActive(href)?'page':undefined} className={isActive(href)?'active':''}><Icon size={20}/><span>{name==='Matchday'?'Matches':name==='Fan zone'?'Fans':name}</span></Link>)}</nav>
 </>
}
