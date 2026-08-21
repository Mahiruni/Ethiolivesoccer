import { MessageCircle, Newspaper, Radio, Trophy, UserRound } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function BottomNav({ onProfile, onAuth }) {
  const { user }=useAuth(); const navigate=useNavigate(); const location=useLocation();
  const goCommunity=()=>{if(location.pathname!=='/')navigate('/#community');else document.getElementById('community')?.scrollIntoView({behavior:'smooth',block:'start'});};
  const active=path=>location.pathname===path||(path!=='/'&&location.pathname.startsWith(path));
  return <nav className="bottom-nav" aria-label="Mobile navigation"><button onClick={()=>navigate('/')} className={active('/')?'active':''}><Radio size={19}/><span>Scores</span></button><button onClick={()=>navigate('/competitions')} className={active('/competition')||active('/competitions')?'active':''}><Trophy size={19}/><span>Comps</span></button><button onClick={()=>navigate('/news')} className={active('/news')?'active':''}><Newspaper size={19}/><span>News</span></button><button onClick={goCommunity}><MessageCircle size={19}/><span>Chat</span></button><button onClick={user?onProfile:onAuth}><UserRound size={19}/><span>{user?'Profile':'Sign in'}</span></button></nav>;
}
