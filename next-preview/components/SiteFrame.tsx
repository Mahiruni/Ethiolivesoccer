'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {Activity,House,Trophy,Newspaper,UsersRound,UserRound,ArrowUpRight,Menu,X,Clock3,ShieldCheck,Radio,SunMoon} from 'lucide-react';
import {useState,useEffect} from 'react';
import styles from './SiteNavigation.module.css';

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
 const [theme,setTheme]=useState<'dark'|'light'>('dark');
 useEffect(()=>{const saved=localStorage.getItem('fetan-theme');const next=saved==='dark'||saved==='light'?saved:window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';setTheme(next);document.documentElement.dataset.theme=next;},[]);
 useEffect(()=>{document.documentElement.dataset.theme=theme;},[theme]);
 useEffect(()=>{if(!drawer)return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape')setDrawer(false)};window.addEventListener('keydown',onKey);const back=()=>setDrawer(false);window.history.pushState({fetanMenu:true},'','#menu');window.addEventListener('popstate',back);return()=>{window.removeEventListener('keydown',onKey);window.removeEventListener('popstate',back)}},[drawer]);
 const changeTheme=(next:'dark'|'light')=>{setTheme(next);localStorage.setItem('fetan-theme',next)};
 const isActive=(href:string)=>href==='/'?path==='/':href.startsWith('/league')?path.startsWith('/league'):path.startsWith(href);
 return <>
  <header className="site-header"><div className="wrap header-inner">
    <Link href="/" className="wordmark" aria-label="Fetan home"><span className="wordmark-icon"><Activity size={23} strokeWidth={2.7}/></span><span className="wordmark-copy"><strong>FETAN<span>.</span></strong><small>GLOBAL FOOTBALL LIVE</small></span></Link>
    <nav className="header-nav" aria-label="Primary navigation">{items.map(({name,href,Icon})=><Link key={href} href={href} aria-current={isActive(href)?'page':undefined} className={isActive(href)?'active':''}><Icon size={16}/>{name}</Link>)}</nav>
    <div className="header-actions"><span className="preview-pill"><span/> MATCHDAY LIVE</span><button type="button" className="menu-toggle" aria-label={drawer?'Close menu':'Open menu'} aria-expanded={drawer} onClick={()=>setDrawer(x=>!x)}>{drawer?<X size={22}/>:<Menu size={22}/>}</button></div>
  </div></header>
  {drawer&&<div className={styles.layer}><button className={styles.scrim} type="button" aria-label="Close navigation" onClick={()=>setDrawer(false)}/><aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="FETAN navigation">
    <div className={styles.top}><Link href="/" onClick={()=>setDrawer(false)} className={styles.brand}><Activity size={25}/> FETAN<span>.</span></Link><button type="button" className={styles.close} onClick={()=>setDrawer(false)} aria-label="Close menu"><X size={22}/></button></div>
    <p className={styles.tagline}>THE GLOBAL GAME. ONE DESTINATION.</p>
    <div className={styles.separator}/>
    <p className={styles.label}>DISCOVER</p>
    <nav aria-label="Drawer navigation" className={styles.links}>{items.map(({name,href,Icon},i)=><Link key={href} href={href} onClick={()=>setDrawer(false)} className={isActive(href)?styles.active:styles.link} aria-current={isActive(href)?'page':undefined}><span className={styles.indicator}/><span className={styles.linkText}><strong>{name==='Matchday'?'Matches':name==='Stories'?'Newsroom':name==='Fan zone'?'Fan Zone':name==='Account'?'My Account':name}</strong><small>{['Scores & fixtures','Competitions & tables','Football stories','Community','Profile & preferences'][i]}</small></span><ArrowUpRight size={17}/></Link>)}</nav>
    <div className={styles.separator}/><p className={styles.label}>PREFERENCES & INFORMATION</p>
    <div className={styles.setting}><SunMoon size={18}/><span>Appearance</span><div className={styles.toggle}><button type="button" aria-pressed={theme==='dark'} onClick={()=>changeTheme('dark')}>Dark</button><button type="button" aria-pressed={theme==='light'} onClick={()=>changeTheme('light')}>Light</button></div></div>
    <div className={styles.setting}><Clock3 size={18}/><span>Match times</span><small>Device local time</small></div>
    <Link href="/credits" onClick={()=>setDrawer(false)} className={styles.setting}><ShieldCheck size={18}/><span>Data transparency & credits</span><ArrowUpRight size={15}/></Link>
    <div className={styles.promo}><div><Radio size={18}/><strong>MATCHDAY CENTER</strong></div><p>Explore verified scores, fixtures and competition standings.</p><Link href="/" onClick={()=>setDrawer(false)}>Explore matches <ArrowUpRight size={16}/></Link></div>
    <div className={styles.drawerBottom}>© {new Date().getFullYear()} FETAN <span>FOOTBALL NEVER STOPS.</span></div>
  </aside></div>}
  <div className="site-ribbon"><div className="wrap ribbon-inner"><span className="ribbon-dot"/><strong>GLOBAL FOOTBALL</strong><span>PREMIER LEAGUE</span><i/><span>LA LIGA</span><i/><span>BUNDESLIGA</span><i/><span>SERIE A</span><i/><span>LIGUE 1</span><span className="ribbon-note">FREE DATA · PARTIAL COVERAGE</span></div></div>
  {children}
  <footer className={styles.footer}><div className={`wrap ${styles.footerGrid}`}>
    <div className={styles.footerBrand}><Link href="/" className={styles.brand}><Activity size={25}/> FETAN<span>.</span></Link><p>Football, without borders. Matchday coverage, league tables and source-attributed stories from across the global game.</p><small>THE GLOBAL GAME. ONE DESTINATION.</small></div>
    <div className={styles.footerColumn}><strong>EXPLORE</strong><Link href="/">Matchday & scores</Link><Link href="/league/premier-league">Leagues & standings</Link><Link href="/stories">Football newsroom</Link></div>
    <div className={styles.footerColumn}><strong>FETAN</strong><Link href="/community">Fan zone</Link><Link href="/account">Your account</Link><Link href="/credits">Artwork credits</Link></div>
    <div className={styles.footerColumn}><strong>OUR COMMITMENT</strong><p>Source attribution. Clear data coverage. No invented scores or headlines.</p><a href="https://www.thesportsdb.com/" rel="noopener noreferrer" target="_blank">TheSportsDB <ArrowUpRight size={14}/></a></div>
  </div><div className={`wrap ${styles.footerBottom}`}><span>© {new Date().getFullYear()} FETAN. All rights reserved.</span><span>Independent football coverage · Not affiliated with leagues or clubs · Fixtures and tables may be partial</span><Link href="/credits">Attribution & credits <ArrowUpRight size={13}/></Link></div></footer>
  <nav className="bottom-nav" aria-label="Mobile tabs">{items.map(({name,href,Icon})=><Link key={href} href={href} aria-current={isActive(href)?'page':undefined} className={isActive(href)?'active':''}><Icon size={20}/><span>{name==='Matchday'?'Matches':name==='Fan zone'?'Fans':name}</span></Link>)}</nav>
 </>
}
