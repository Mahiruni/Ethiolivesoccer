import { useEffect, useMemo, useState } from 'react';
import { BellRing, BookOpen, CalendarDays, ChevronRight, Globe2, Newspaper, ShieldCheck, Star, Trophy } from 'lucide-react';
import { apiFetch } from '../api';
import { useAuth } from '../context/AuthContext';

const fallbackCompetitions = [
  {id:1,slug:'ethiopian-premier-league',name_en:'Ethiopian Premier League',name_am:'የኢትዮጵያ ፕሪሚየር ሊግ',category:'Domestic',season:'2026/27',team_count:16,accent:'#f5c400'},
  {id:2,slug:'ethiopian-higher-league',name_en:'Ethiopian Higher League',name_am:'የኢትዮጵያ ከፍተኛ ሊግ',category:'Domestic',season:'2026/27',team_count:24,accent:'#2b63ff'},
  {id:3,slug:'ethiopian-cup',name_en:'Ethiopian Cup',name_am:'የኢትዮጵያ ዋንጫ',category:'Cup',season:'2026',team_count:32,accent:'#f5c400'},
  {id:4,slug:'ethiopia-national-team',name_en:'Ethiopia National Team',name_am:'የኢትዮጵያ ብሔራዊ ቡድን',category:'National',season:'International',team_count:1,accent:'#2b63ff'},
  {id:5,slug:'caf-champions-league',name_en:'CAF Champions League',name_am:'የካፍ ቻምፒዮንስ ሊግ',category:'CAF',season:'2026/27',team_count:64,accent:'#f5c400'},
  {id:6,slug:'caf-confederation-cup',name_en:'CAF Confederation Cup',name_am:'የካፍ ኮንፌዴሬሽን ዋንጫ',category:'CAF',season:'2026/27',team_count:64,accent:'#2b63ff'}
];

const fallbackNews = [
  {id:1,category:'Match Preview',title_en:'Title race intensifies ahead of the weekend fixtures',title_am:'የሻምፒዮና ፉክክር ከሳምንቱ ጨዋታዎች በፊት ተጠናክሯል',summary_en:'Key fixtures, players to watch and the table implications across the Ethiopian Premier League.',summary_am:'በኢትዮጵያ ፕሪሚየር ሊግ ዋና ጨዋታዎች፣ ተጠባባቂ ተጫዋቾችና የደረጃ ሰንጠረዥ ተፅዕኖ።',published_at:new Date().toISOString(),featured:true},
  {id:2,category:'National Team',title_en:'Walia squad focus shifts to the next international window',title_am:'የዋልያዎቹ ትኩረት ወደ ቀጣዩ ዓለም አቀፍ መስኮት ተዘዋውሯል',summary_en:'Selection questions, form updates and the road ahead for Ethiopia.',summary_am:'የቡድን ምርጫ፣ የተጫዋቾች ብቃት እና የኢትዮጵያ ቀጣይ ጉዞ።',published_at:new Date(Date.now()-3600000).toISOString()},
  {id:3,category:'Transfers',title_en:'Domestic transfer tracker: confirmed moves and negotiations',title_am:'የአገር ውስጥ ዝውውር፡ የተረጋገጡ ዝውውሮችና ድርድሮች',summary_en:'A rolling overview of verified club movement without rumor inflation.',summary_am:'ያልተረጋገጠ ወሬ ሳይጨመር የተረጋገጡ የክለብ ዝውውሮች።',published_at:new Date(Date.now()-7200000).toISOString()},
  {id:4,category:'Analysis',title_en:'What the latest results changed in the top-five race',title_am:'የቅርብ ውጤቶች በከፍተኛ አምስት ፉክክር ላይ ምን ቀየሩ?',summary_en:'Form trends, goal difference and the matches that could define the table.',summary_am:'የቅርብ ጊዜ ብቃት፣ የግብ ልዩነትና ሰንጠረዡን ሊወስኑ የሚችሉ ጨዋታዎች።',published_at:new Date(Date.now()-10800000).toISOString()}
];

export default function ExploreHub({ section='competitions', lang='en', onNeedAuth }) {
  const { user } = useAuth();
  const [competitions,setCompetitions]=useState([]);
  const [news,setNews]=useState([]);
  const [pushState,setPushState]=useState(Notification.permission);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');

  useEffect(()=>{
    Promise.allSettled([apiFetch('/competitions'),apiFetch('/news')]).then(([c,n])=>{
      setCompetitions(c.status==='fulfilled'&&c.value?.length?c.value:fallbackCompetitions);
      setNews(n.status==='fulfilled'&&n.value?.length?n.value:fallbackNews);
    });
  },[]);

  const enablePush = async () => {
    if(!user){onNeedAuth();return}
    setBusy(true); setMessage('');
    try{
      const permission=await Notification.requestPermission();
      setPushState(permission);
      if(permission!=='granted') throw new Error('Notification permission was not granted.');
      const registration=await navigator.serviceWorker.ready;
      let config={};
      try{config=await apiFetch('/push/public-key')}catch{}
      if(config.publicKey){
        const subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlBase64ToUint8Array(config.publicKey)});
        await apiFetch('/me/push-subscriptions',{method:'POST',body:JSON.stringify(subscription)});
        setMessage('Goal and match alerts are enabled on this device.');
      }else{
        await registration.showNotification('EthioLiveScores alerts enabled',{body:'Your device is ready. Server delivery starts after VAPID keys are configured.'});
        setMessage('Device notifications are enabled. Add VAPID keys to activate server delivery.');
      }
    }catch(error){setMessage(error.message||'Could not enable notifications.')}
    finally{setBusy(false)}
  };

  if(section==='news') return <NewsPage news={news} lang={lang}/>;
  if(section==='alerts') return <AlertsPage permission={pushState} busy={busy} message={message} enablePush={enablePush} user={user}/>;
  return <CompetitionsPage competitions={competitions} lang={lang}/>;
}

function CompetitionsPage({competitions,lang}){
  const groups=useMemo(()=>competitions.reduce((a,c)=>{(a[c.category||'Other']||=[]).push(c);return a},{}),[competitions]);
  return <main className="hub-page">
    <Hero eyebrow="Football directory" title={lang==='am'?'ውድድሮች':'Competitions'} text={lang==='am'?'የኢትዮጵያ ሊጎች፣ ዋንጫዎች፣ ብሔራዊ ቡድን እና የካፍ ውድድሮች።':'Navigate Ethiopian leagues, cups, the national team and CAF competitions from one place.'} icon={<Trophy/>}/>
    {Object.entries(groups).map(([name,items])=><section className="hub-section" key={name}>
      <div className="hub-section-title"><div><small>ETHIOLIVESCORES</small><h2>{name}</h2></div><span>{items.length} competitions</span></div>
      <div className="competition-grid">{items.map(c=><article className="competition-card" key={c.id}>
        <div className="competition-emblem" style={{'--accent':c.accent||'#f5c400'}}><Trophy size={23}/></div>
        <div className="competition-copy"><span>{c.season}</span><h3>{lang==='am'&&c.name_am?c.name_am:c.name_en}</h3><p>{c.team_count} {c.team_count===1?'team':'teams'} · Fixtures · Table · News</p></div>
        <button aria-label={`Open ${c.name_en}`}><ChevronRight size={18}/></button>
      </article>)}</div>
    </section>)}
  </main>
}

function NewsPage({news,lang}){
  const featured=news.find(n=>n.featured)||news[0];
  const rest=news.filter(n=>n!==featured);
  const title=n=>lang==='am'&&n.title_am?n.title_am:n.title_en;
  const summary=n=>lang==='am'&&n.summary_am?n.summary_am:n.summary_en;
  return <main className="hub-page">
    <Hero eyebrow="Bilingual newsroom" title={lang==='am'?'ዜና እና ትንታኔ':'News & analysis'} text={lang==='am'?'የኢትዮጵያ እግር ኳስ ዜና፣ ቅድመ ጨዋታ፣ ዝውውርና ትንታኔ በአማርኛና በእንግሊዝኛ።':'Verified Ethiopian football reporting, previews, transfers and analysis in Amharic and English.'} icon={<Newspaper/>}/>
    {featured&&<article className="lead-story">
      <div className="story-visual"><span>{featured.category}</span><Newspaper size={50}/></div>
      <div className="lead-copy"><small>{new Date(featured.published_at).toLocaleString()}</small><h2>{title(featured)}</h2><p>{summary(featured)}</p><button>Read full story <ChevronRight size={16}/></button></div>
    </article>}
    <section className="news-grid">{rest.map(n=><article className="news-card" key={n.id}>
      <div className="news-art"><span>{n.category}</span><BookOpen size={28}/></div>
      <div><small>{new Date(n.published_at).toLocaleDateString()}</small><h3>{title(n)}</h3><p>{summary(n)}</p><button>Read story <ChevronRight size={14}/></button></div>
    </article>)}</section>
    <div className="editorial-note"><ShieldCheck size={20}/><div><b>Editorial standard</b><span>Clearly distinguish confirmed reporting, analysis and transfer rumors. Publish corrections transparently.</span></div></div>
  </main>
}

function AlertsPage({permission,busy,message,enablePush,user}){
  const alertTypes=[
    ['Kickoff reminders','A reminder before followed clubs begin playing.'],
    ['Goals','Instant score changes for your favorite teams.'],
    ['Red cards','High-impact disciplinary events as they happen.'],
    ['Half-time & full-time','Key match-state summaries without opening the app.'],
    ['Club news','Important verified stories involving followed teams.']
  ];
  return <main className="hub-page">
    <Hero eyebrow="Personal match alerts" title="Notifications" text="Follow clubs and receive the moments that matter, with granular controls in your profile." icon={<BellRing/>}/>
    <section className="alerts-layout">
      <div className="push-card">
        <div className="push-icon"><BellRing size={30}/></div>
        <small>DEVICE STATUS</small><h2>{permission==='granted'?'Notifications enabled':'Never miss a decisive moment'}</h2>
        <p>{user?'Enable browser push on this device. Your detailed event preferences remain controlled from your profile.':'Sign in first, then enable alerts for the clubs you follow.'}</p>
        <button onClick={enablePush} disabled={busy}>{busy?'Enabling…':permission==='granted'?'Refresh subscription':'Enable notifications'}</button>
        {message&&<span className="push-message">{message}</span>}
      </div>
      <div className="alert-list">{alertTypes.map(([name,text])=><article key={name}><Star size={17}/><div><b>{name}</b><p>{text}</p></div><ChevronRight size={17}/></article>)}</div>
    </section>
    <section className="notification-roadmap"><Globe2/><div><b>Production delivery requirement</b><p>Configure VAPID public/private keys and PostgreSQL, then scheduled match-event workers can deliver alerts even when the app is closed.</p></div><CalendarDays/></section>
  </main>
}

function Hero({eyebrow,title,text,icon}){
  return <section className="hub-hero"><div><span>{eyebrow}</span><h1>{title}</h1><p>{text}</p></div><div className="hub-hero-icon">{icon}</div></section>
}
function urlBase64ToUint8Array(value){
  const padding='='.repeat((4-value.length%4)%4);const base64=(value+padding).replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(base64);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}
