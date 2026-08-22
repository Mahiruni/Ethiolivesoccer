import { Component,lazy,Suspense,useEffect,useState } from 'react';
import MatchCenter from './MatchCenter';

const CompetitionHub=lazy(()=>import('./CompetitionHub'));
const NewsHub=lazy(()=>import('./NewsHub'));

class HomeSectionBoundary extends Component{
  constructor(props){super(props);this.state={failed:false}}
  static getDerivedStateFromError(){return{failed:true}}
  componentDidCatch(error){console.error('Homepage section failed:',error)}
  render(){
    if(this.state.failed)return <main className="page content-page"><div className="league-card empty-day"><b>Live football data is temporarily unavailable</b><p>The website itself is online. Refresh shortly while the Gemini feed reconnects.</p><button className="mini-refresh" onClick={()=>window.location.reload()}>Reload page</button></div></main>;
    return this.props.children;
  }
}

export default function HomePage({lang='en',onNeedAuth}){
  const [showExtras,setShowExtras]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(min-width: 1025px)').matches);
  useEffect(()=>{
    if(showExtras)return;
    let id;
    if('requestIdleCallback' in window)id=window.requestIdleCallback(()=>setShowExtras(true),{timeout:700});
    else id=window.setTimeout(()=>setShowExtras(true),250);
    return()=>{'cancelIdleCallback' in window?window.cancelIdleCallback(id):clearTimeout(id)};
  },[showExtras]);
  return <>
    <HomeSectionBoundary><MatchCenter onNeedAuth={onNeedAuth}/></HomeSectionBoundary>
    {showExtras&&<HomeSectionBoundary><Suspense fallback={<div className="page home-extras home-extras-loading"><div className="route-skeleton-card short"/></div>}><div className="page home-extras"><CompetitionHub lang={lang} compact/><NewsHub lang={lang} compact/></div></Suspense></HomeSectionBoundary>}
  </>;
}
