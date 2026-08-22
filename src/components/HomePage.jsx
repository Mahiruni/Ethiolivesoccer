import { Component,lazy,Suspense,useEffect,useState } from 'react';

const MatchCenter=lazy(()=>import('./MatchCenter'));
const CompetitionHub=lazy(()=>import('./CompetitionHub'));
const NewsHub=lazy(()=>import('./NewsHub'));

class HomeSectionBoundary extends Component{
  constructor(props){super(props);this.state={failed:false}}
  static getDerivedStateFromError(){return{failed:true}}
  componentDidCatch(error){console.error('Homepage section failed:',error)}
  render(){
    if(this.state.failed)return <section className="page home-safe-state"><div className="league-card empty-day"><b>This section could not load</b><p>The homepage is still available. Live Gemini data may be temporarily unavailable.</p><button className="mini-refresh" onClick={()=>window.location.reload()}>Reload section</button></div></section>;
    return this.props.children;
  }
}

function MatchCenterFallback(){
  return <main className="page score-swipe-surface" id="scores" aria-busy="true">
    <div className="page-head"><div><span className="eyebrow">Match center</span><h1>Football scores</h1><p className="page-subtitle">The app is online. Connecting to the Gemini football feed…</p></div></div>
    <div className="content-grid"><section className="match-column"><div className="league-card"><div className="loading-shimmer"/><div className="loading-shimmer short"/><div className="loading-shimmer"/></div></section></div>
  </main>;
}

export default function HomePage({lang='en',onNeedAuth}){
  const [showExtras,setShowExtras]=useState(false);

  useEffect(()=>{
    const id=window.setTimeout(()=>setShowExtras(true),900);
    return()=>window.clearTimeout(id);
  },[]);

  return <>
    <HomeSectionBoundary>
      <Suspense fallback={<MatchCenterFallback/>}>
        <MatchCenter onNeedAuth={onNeedAuth}/>
      </Suspense>
    </HomeSectionBoundary>

    {showExtras&&<HomeSectionBoundary>
      <Suspense fallback={null}>
        <div className="page home-extras"><CompetitionHub lang={lang} compact/><NewsHub lang={lang} compact/></div>
      </Suspense>
    </HomeSectionBoundary>}
  </>;
}
