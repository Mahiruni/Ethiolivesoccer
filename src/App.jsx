import { useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './components/HomePage';
import CompetitionHub from './components/CompetitionHub';
import CompetitionPage from './components/CompetitionPage';
import NewsHub from './components/NewsHub';
import ArticlePage from './components/ArticlePage';
import MatchDetails from './components/MatchDetails';
import AuthModal from './components/AuthModal';
import ProfileDrawer from './components/ProfileDrawer';
import BottomNav from './components/BottomNav';
import { useAuth } from './context/AuthContext';

export default function App(){
  const { user }=useAuth();
  const [authOpen,setAuthOpen]=useState(false);const [profileOpen,setProfileOpen]=useState(false);
  const [lang,setLang]=useState(localStorage.getItem('lang')||'en');
  const location=useLocation();
  useEffect(()=>{document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';localStorage.setItem('theme','dark')},[]);
  useEffect(()=>{document.documentElement.lang=lang;localStorage.setItem('lang',lang)},[lang]);
  useEffect(()=>{if(location.hash){const id=location.hash.slice(1);requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'}));}else window.scrollTo({top:0,behavior:'auto'});},[location.pathname,location.hash]);
  const openProfile=()=>user?setProfileOpen(true):setAuthOpen(true);const toggleLang=()=>setLang(x=>x==='en'?'am':'en');const needAuth=()=>setAuthOpen(true);
  return <>
    <Header lang={lang} onToggleLang={toggleLang} onAuth={needAuth} onProfile={openProfile}/>
    <Routes>
      <Route path="/" element={<HomePage lang={lang} onNeedAuth={needAuth}/>}/>
      <Route path="/match/:id" element={<MatchDetails onNeedAuth={needAuth}/>}/>
      <Route path="/competitions" element={<CompetitionHub lang={lang}/>}/>
      <Route path="/competition/:slug" element={<CompetitionPage lang={lang}/>}/>
      <Route path="/news" element={<NewsHub lang={lang}/>}/>
      <Route path="/news/:slug" element={<ArticlePage lang={lang} onToggleLang={toggleLang} onOpenProfile={openProfile}/>}/>
      <Route path="*" element={<HomePage lang={lang} onNeedAuth={needAuth}/>}/>
    </Routes>
    <BottomNav onProfile={openProfile} onAuth={needAuth}/>
    <AuthModal open={authOpen} onClose={()=>setAuthOpen(false)}/>
    <ProfileDrawer open={profileOpen} onClose={()=>setProfileOpen(false)}/>
  </>;
}
