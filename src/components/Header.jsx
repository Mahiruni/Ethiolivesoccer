import { Moon, Sun, UserRound, Languages, Bell } from 'lucide-react';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

export default function Header({ dark, onToggleTheme, lang, onToggleLang, onAuth, onProfile }) {
  const { user } = useAuth();
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#scores" aria-label="EthioLiveScores home">
            <span className="brand-mark">⚽</span>
            <span className="brand-name">Ethio<span>Live</span>Scores</span>
          </a>
          <div className="header-actions">
            <button className="icon-btn" onClick={onToggleLang} aria-label="Switch language"><Languages size={17}/><span className="action-label">{lang === 'en' ? 'አማ' : 'EN'}</span></button>
            <button className="icon-btn" onClick={onToggleTheme} aria-label="Toggle theme">{dark ? <Sun size={17}/> : <Moon size={17}/>}</button>
            {user ? (
              <button className="profile-chip" onClick={onProfile}>
                <Avatar seed={user.avatar_seed || user.username} size={30}/>
                <span>{user.display_name || user.username}</span>
                <Bell size={14}/>
              </button>
            ) : (
              <button className="signin-btn" onClick={onAuth}><UserRound size={16}/> Sign in</button>
            )}
          </div>
        </div>
        <nav className="desktop-nav">
          <a href="#scores" className="nav-link active">Scores</a>
          <a href="#fixtures" className="nav-link">Fixtures</a>
          <a href="#standings" className="nav-link">Standings</a>
          <a href="#community" className="nav-link">Community</a>
          {user && <button className="nav-link nav-button" onClick={onProfile}>My profile</button>}
        </nav>
      </header>
      <div className="live-strip"><span className="live-dot"/> LIVE NOW <strong>EthioLiveScores</strong><span className="ticker-text">Ethiopian football, one screen.</span></div>
    </>
  );
}
