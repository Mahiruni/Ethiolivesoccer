import { Bell, Languages, UserRound, ArrowUpRight } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

export default function Header({ lang, onToggleLang, onAuth, onProfile }) {
  const { user } = useAuth();
  return <>
    <header className="topbar">
      <div className="topbar-inner">
        <Link className="brand" to="/" aria-label="FETAN football home">
          <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 24 32" width="19" height="26" fill="none"><path d="M14.5 1 3 17h8l-1.4 14L22 12h-8.1L14.5 1Z" fill="#F31F55"/></svg></span>
          <span className="brand-wordmark"><span className="brand-name">Fetan</span><span className="brand-tagline">Global football live</span></span>
        </Link>
        <div className="header-actions">
          <button type="button" className="icon-btn" onClick={onToggleLang} aria-label="Switch language"><Languages size={17}/><span className="action-label">{lang === 'en' ? 'አማ' : 'EN'}</span></button>
          {user
            ? <button type="button" className="profile-chip" onClick={onProfile} aria-label="Open profile"><Avatar seed={user.avatar_seed || user.username} size={30}/><span>{user.display_name || user.username}</span><Bell size={14}/></button>
            : <button type="button" className="signin-btn" onClick={onAuth}><UserRound size={16}/> Sign in</button>}
        </div>
      </div>
      <nav className="desktop-nav" aria-label="Main navigation">
        <NavLink end to="/" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Match center</NavLink>
        <NavLink to="/competitions" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Leagues</NavLink>
        <NavLink to="/news" className={({isActive})=>`nav-link ${isActive?'active':''}`}>Stories</NavLink>
        <Link to="/#community" className="nav-link">Fan zone</Link>
        {user&&<button className="nav-link nav-button" onClick={onProfile}>My profile</button>}
      </nav>
    </header>
    <div className="live-strip"><span className="live-dot"/><strong>GLOBAL MATCHDAY</strong><span className="velocity-ticker">Premier League <span aria-hidden="true">·</span> La Liga <span aria-hidden="true">·</span> Bundesliga <span aria-hidden="true">·</span> Serie A <span aria-hidden="true">·</span> Ligue 1</span><ArrowUpRight size={12} aria-hidden="true"/></div>
  </>;
}
