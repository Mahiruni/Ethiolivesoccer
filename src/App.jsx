import { useEffect, useState } from 'react';
import Header from './components/Header';
import MatchCenter from './components/MatchCenter';
import AuthModal from './components/AuthModal';
import ProfileDrawer from './components/ProfileDrawer';
import BottomNav from './components/BottomNav';
import { useAuth } from './context/AuthContext';

export default function App(){
  const { user }=useAuth();
  const [authOpen,setAuthOpen]=useState(false); const [profileOpen,setProfileOpen]=useState(false);
  const [lang,setLang]=useState(localStorage.getItem('lang')||'en');
  const [dark,setDark]=useState(()=>localStorage.getItem('theme')==='dark'||(!localStorage.getItem('theme')&&matchMedia('(prefers-color-scheme: dark)').matches));
  useEffect(()=>{document.documentElement.classList.toggle('dark',dark);localStorage.setItem('theme',dark?'dark':'light')},[dark]);
  useEffect(()=>{document.documentElement.lang=lang;localStorage.setItem('lang',lang)},[lang]);
  const openProfile=()=> user?setProfileOpen(true):setAuthOpen(true);
  return <>
    <Header dark={dark} onToggleTheme={()=>setDark(x=>!x)} lang={lang} onToggleLang={()=>setLang(x=>x==='en'?'am':'en')} onAuth={()=>setAuthOpen(true)} onProfile={openProfile}/>
    <MatchCenter onNeedAuth={()=>setAuthOpen(true)}/>
    <BottomNav onProfile={openProfile} onAuth={()=>setAuthOpen(true)}/>
    <AuthModal open={authOpen} onClose={()=>setAuthOpen(false)}/>
    <ProfileDrawer open={profileOpen} onClose={()=>setProfileOpen(false)}/>
  </>
}
