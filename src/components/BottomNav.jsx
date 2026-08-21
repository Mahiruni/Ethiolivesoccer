import { Radio, Trophy, MessageCircle, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
export default function BottomNav({ onProfile, onAuth }) {
  const { user } = useAuth();
  const go=id=>document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});
  return <nav className="bottom-nav"><button onClick={()=>go('scores')} className="active"><Radio size={19}/><span>Scores</span></button><button onClick={()=>go('standings')}><Trophy size={19}/><span>Table</span></button><button onClick={()=>go('community')}><MessageCircle size={19}/><span>Chat</span></button><button onClick={user?onProfile:onAuth}><UserRound size={19}/><span>{user?'Profile':'Sign in'}</span></button></nav>
}
