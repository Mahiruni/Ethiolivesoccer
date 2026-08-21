import { useEffect, useState } from 'react';
import Header from './components/Header';
import MatchCenter from './components/MatchCenter';
import ExploreHub from './components/ExploreHub';
import AuthModal from './components/AuthModal';
import ProfileDrawer from './components/ProfileDrawer';
import BottomNav from './components/BottomNav';
import { useAuth } from './context/AuthContext';

export default function App(){
  const { user }=useAuth();
  const [authOpen,setAuthOpen]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [page,setPage]=useState(()=>location.hash.replace('#','')||'scores');
  const [lang,setLang]=useState(localStorage.getItem('lang')||'en');
  const [dark,setDark]=useState(()=>localStorage.getItem('theme')==='dark'||(!localStorage.getItem('theme')&&matchMedia('(prefers-color-scheme: dark)').matches));

  useEffect(()=>{document.documentElement.classList.toggle('dark',dark);localStorage.setItem('theme',dark?'dark':'light')},[dark]);
  useEffect(()=>{document.documentElement.lang=lang;localStorage.setItem('lang',lang)},[lang]);
  useEffect(()=>{const sync=()=>setPage(location.hash.replace('#','')||'scores');addEventListener('hashchange',sync);return()=>removeEventListener('hashchange',sync)},[]);

  const navigate=next=>{location.hash=next;setPage(next);scrollTo({top:0,behavior:'smooth'})};
  const openProfile=()=>user?setProfileOpen(true):setAuthOpen(true);
  const content=page==='competitions'||page==='news'||page==='alerts'
    ?<ExploreHub section={page} lang={lang} onNeedAuth={()=>setAuthOpen(true)}/>
    :<MatchCenter onNeedAuth={()=>setAuthOpen(true)}/>;

  return <>
    <Header dark={dark} onToggleTheme={()=>setDark(x=>!x)} lang={lang} onToggleLang={()=>setLang(x=>x==='en'?'am':'en')} onAuth={()=>setAuthOpen(true)} onProfile={openProfile} page={page} onNavigate={navigate}/>
    {content}
    <BottomNav onProfile={openProfile} onAuth={()=>setAuthOpen(true)} page={page} onNavigate={navigate}/>
    <AuthModal open={authOpen} onClose={()=>setAuthOpen(false)}/>
    <ProfileDrawer open={profileOpen} onClose={()=>setProfileOpen(false)}/>
  </>
}
