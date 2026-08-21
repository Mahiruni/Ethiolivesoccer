import { lazy, Suspense, useEffect, useState } from 'react';
import MatchCenter from './MatchCenter';

const CompetitionHub=lazy(()=>import('./CompetitionHub'));
const NewsHub=lazy(()=>import('./NewsHub'));

export default function HomePage({lang='en',onNeedAuth}){
  const [showExtras,setShowExtras]=useState(false);
  useEffect(()=>{
    let id;
    if('requestIdleCallback' in window) id=window.requestIdleCallback(()=>setShowExtras(true),{timeout:900});
    else id=window.setTimeout(()=>setShowExtras(true),350);
    return()=>{'cancelIdleCallback' in window?window.cancelIdleCallback(id):clearTimeout(id)};
  },[]);
  return <>
    <MatchCenter onNeedAuth={onNeedAuth}/>
    {showExtras&&<Suspense fallback={<div className="page home-extras home-extras-loading"><div className="route-skeleton-card short"/></div>}><div className="page home-extras"><CompetitionHub lang={lang} compact/><NewsHub lang={lang} compact/></div></Suspense>}
  </>;
}
