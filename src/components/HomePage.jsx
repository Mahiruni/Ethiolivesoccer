import { lazy, Suspense, useEffect, useState } from 'react';
import MatchCenter from './MatchCenter';

const CompetitionHub=lazy(()=>import('./CompetitionHub'));
const NewsHub=lazy(()=>import('./NewsHub'));

export default function HomePage({lang='en',onNeedAuth}){
  const [showExtras,setShowExtras]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(min-width: 1025px)').matches);
  useEffect(()=>{
    if(showExtras)return;
    let id;
    if('requestIdleCallback' in window) id=window.requestIdleCallback(()=>setShowExtras(true),{timeout:700});
    else id=window.setTimeout(()=>setShowExtras(true),250);
    return()=>{'cancelIdleCallback' in window?window.cancelIdleCallback(id):clearTimeout(id)};
  },[showExtras]);
  return <>
    <MatchCenter onNeedAuth={onNeedAuth}/>
    {showExtras&&<Suspense fallback={<div className="page home-extras home-extras-loading"><div className="route-skeleton-card short"/></div>}><div className="page home-extras"><CompetitionHub lang={lang} compact/><NewsHub lang={lang} compact/></div></Suspense>}
  </>;
}
