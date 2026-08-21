import { Bell, Languages, UserRound, Zap } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

export default function Header({ lang, onToggleLang, onAuth, onProfile }) {
  const { user } = useAuth();
  return <>
    <header className="topbar">
      <div className="topbar-inner">
        <Link className="brand" to="/" aria-label="EthioLiveScores home">
          <span className="brand-mark"><Zap size={20} strokeWidth={2.8}/></span>
          <span className="brand-name">Ethio<span>Live</span>Scores</span>
        </Link>
        <div className="header-actions">
          <button className="icon-btn" onClick={onToggleLang} aria-label="Switch language"><Languages size={17}/><span className="action-label">{lang === 'en' ? 'አማ' : 'EN'}</span></button>
          {user ? <button className="profile-chip" onClick={onProfile}><Avatar seed={user.avatar_seed || user.username} size={30}/><span>{user.display_name || user.username}</span><Bell size={14}/></button> : <button className="signin-btn" onClick={onAuth}><UserRound size={16}/> Sign in</button>}
        </div>
      </div>
      <nav className="desktop-nav">
        <NavLink end to="/" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Scores</NavLink>
        <NavLink to="/competitions" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Competitions</NavLink>
        <NavLink to="/news" className={({isActive})=>`nav-link ${isActive?'active':''}`}>News</NavLink>
        <Link to="/#community" className="nav-link">Community</Link>
        {user&&<button className="nav-link nav-button" onClick={onProfile}>My profile</button>}
      </nav>
    </header>
    <div className="live-strip"><span className="live-dot"/> LIVE NOW <strong>EthioLiveScores</strong><span className="ticker-text">Live football. Zero clutter.</span></div>
  </>;
}
