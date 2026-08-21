import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import Header from './components/Header';
import HomePage from './components/HomePage';
import BottomNav from './components/BottomNav';
import { useAuth } from './context/AuthContext';

const MatchDetails=lazy(()=>import('./components/MatchDetails'));
const CompetitionHub=lazy(()=>import('./components/CompetitionHub'));
const CompetitionPage=lazy(()=>import('./components/CompetitionPage'));
const NewsHub=lazy(()=>import('./components/NewsHub'));
const ArticlePage=lazy(()=>import('./components/ArticlePage'));
const AuthModal=lazy(()=>import('./components/AuthModal'));
const ProfileDrawer=lazy(()=>import('./components/ProfileDrawer'));

function RouteSkeleton(){return <main className="page route-skeleton" aria-busy="true"><div className="route-skeleton-line wide"/><div className="route-skeleton-line"/><div className="route-skeleton-card"/><div className="route-skeleton-card short"/></main>}

export default function App(){
  const { user }=useAuth();
  const [authOpen,setAuthOpen]=useState(false);
  const [profileOpen,setProfileOpen]=useState(false);
  const [lang,setLang]=useState(()=>localStorage.getItem('lang')||'en');
  const location=useLocation();

  useEffect(()=>{document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';localStorage.setItem('theme','dark')},[]);
  useEffect(()=>{document.documentElement.lang=lang;localStorage.setItem('lang',lang)},[lang]);
  useEffect(()=>{if(location.hash){const id=location.hash.slice(1);requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:'auto',block:'start'}));}else window.scrollTo({top:0,behavior:'auto'});},[location.pathname,location.hash]);

  const openProfile=useCallback(()=>user?setProfileOpen(true):setAuthOpen(true),[user]);
  const toggleLang=useCallback(()=>setLang(x=>x==='en'?'am':'en'),[]);
  const needAuth=useCallback(()=>setAuthOpen(true),[]);

  return <>
    <Header lang={lang} onToggleLang={toggleLang} onAuth={needAuth} onProfile={openProfile}/>
    <Suspense fallback={<RouteSkeleton/>}>
      <Routes>
        <Route path="/" element={<HomePage lang={lang} onNeedAuth={needAuth}/>}/>
        <Route path="/match/:id" element={<MatchDetails onNeedAuth={needAuth}/>}/>
        <Route path="/competitions" element={<CompetitionHub lang={lang}/>}/>
        <Route path="/competition/:slug" element={<CompetitionPage lang={lang}/>}/>
        <Route path="/news" element={<NewsHub lang={lang}/>}/>
        <Route path="/news/:slug" element={<ArticlePage lang={lang} onToggleLang={toggleLang} onOpenProfile={openProfile}/>}/>
        <Route path="*" element={<HomePage lang={lang} onNeedAuth={needAuth}/>}/>
      </Routes>
    </Suspense>
    <BottomNav onProfile={openProfile} onAuth={needAuth}/>
    {authOpen&&<Suspense fallback={null}><AuthModal open onClose={()=>setAuthOpen(false)}/></Suspense>}
    {profileOpen&&<Suspense fallback={null}><ProfileDrawer open onClose={()=>setProfileOpen(false)}/></Suspense>}
  </>;
}
