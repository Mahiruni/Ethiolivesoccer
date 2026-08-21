import { Radio, Trophy, Newspaper, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
export default function BottomNav({ onProfile, onAuth, page, onNavigate }) {
  const { user } = useAuth();
  return <nav className="bottom-nav">
    <button onClick={()=>onNavigate('scores')} className={page==='scores'?'active':''}><Radio size={19}/><span>Scores</span></button>
    <button onClick={()=>onNavigate('competitions')} className={page==='competitions'?'active':''}><Trophy size={19}/><span>Leagues</span></button>
    <button onClick={()=>onNavigate('news')} className={page==='news'?'active':''}><Newspaper size={19}/><span>News</span></button>
    <button onClick={user?onProfile:onAuth}><UserRound size={19}/><span>{user?'Profile':'Sign in'}</span></button>
  </nav>
}
