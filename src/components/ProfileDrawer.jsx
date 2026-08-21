import { useEffect, useState } from 'react';
import { X, UserRound, Heart, Bell, Trophy, LogOut, Save, Check, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api';
import Avatar from './Avatar';

const tabs = [
  ['profile', UserRound, 'Profile'], ['favorites', Heart, 'Favorites'], ['alerts', Bell, 'Alerts'], ['predictions', Trophy, 'Predictions']
];

export default function ProfileDrawer({ open, onClose }) {
  const auth = useAuth();
  const [tab, setTab] = useState('profile');
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState({ display_name:'', username:'', avatar_seed:'' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open || !auth.user) return;
    setForm({ display_name: auth.user.display_name || '', username: auth.user.username || '', avatar_seed: auth.user.avatar_seed || '' });
    auth.loadFavorites().catch(()=>{});
    auth.loadPredictions().catch(()=>{});
    apiFetch('/teams').then(setTeams).catch(()=>setTeams([]));
  }, [open, auth.user?.id]);

  if (!open || !auth.user) return null;
  const prefs = auth.preferences || { preferred_language:'en', theme:'system', notify_goals:true, notify_kickoff:true, notify_halftime:false, notify_fulltime:true, notify_red_cards:true, notify_news:false };

  const saveProfile = async () => {
    try { await auth.updateProfile(form); setMessage('Profile saved'); } catch(e) { setMessage(e.message); }
    setTimeout(()=>setMessage(''),2200);
  };
  const savePref = (key, value) => auth.savePreferences({ ...prefs, [key]: value }).catch(()=>{});

  return (
    <div className="drawer-backdrop" onMouseDown={(e)=>e.target===e.currentTarget&&onClose()}>
      <aside className="profile-drawer">
        <div className="drawer-head">
          <div className="drawer-user"><Avatar seed={auth.user.avatar_seed || auth.user.username} size={46}/><div><b>{auth.user.display_name || auth.user.username}</b><small>{auth.user.email}</small></div></div>
          <button className="modal-close" onClick={onClose}><X size={18}/></button>
        </div>
        <div className="profile-tabs">{tabs.map(([id,Icon,label]) => <button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={16}/><span>{label}</span></button>)}</div>
        <div className="drawer-body">
          {tab === 'profile' && <div className="panel-stack">
            <div className="profile-hero"><Avatar seed={form.avatar_seed || form.username} size={72}/><div><h3>{form.display_name || form.username}</h3><p>Community member</p></div></div>
            <label className="setting-field"><span>Display name</span><input value={form.display_name} onChange={(e)=>setForm({...form,display_name:e.target.value})} placeholder="Your public name"/></label>
            <label className="setting-field"><span>Username</span><input value={form.username} onChange={(e)=>setForm({...form,username:e.target.value})}/></label>
            <label className="setting-field"><span>Avatar seed</span><input value={form.avatar_seed} onChange={(e)=>setForm({...form,avatar_seed:e.target.value})} placeholder="Change this to remix your avatar"/></label>
            <button className="primary-btn" onClick={saveProfile}><Save size={15}/> Save profile</button>
            {message && <div className="saved-note"><Check size={14}/>{message}</div>}
          </div>}

          {tab === 'favorites' && <div className="panel-stack"><div className="panel-intro"><h3>Favorite teams</h3><p>Follow clubs for a personalized score feed and future push alerts.</p></div>
            <div className="team-picker">{teams.length ? teams.map(team => { const active=auth.favorites.some(x=>Number(x.id)===Number(team.id)); return <button key={team.id} className={`team-pick ${active?'active':''}`} onClick={()=>auth.toggleFavorite(team.id)}><span className="team-dot">{(team.short_name||team.name_en).slice(0,2)}</span><span><b>{team.name_en}</b><small>{team.name_am}</small></span><Heart size={16} fill={active?'currentColor':'none'}/></button> }) : <div className="empty-state">Connect the database and add teams to choose favorites.</div>}</div>
          </div>}

          {tab === 'alerts' && <div className="panel-stack"><div className="panel-intro"><h3>Match notifications</h3><p>Choose what deserves your attention. Browser push delivery can be attached to these preferences next.</p></div>
            {[
              ['notify_goals','Goal alerts','Every goal from followed teams'], ['notify_kickoff','Kickoff reminders','When a followed match starts'], ['notify_halftime','Half-time','Half-time score updates'], ['notify_fulltime','Full-time','Final score notifications'], ['notify_red_cards','Red cards','Important disciplinary events'], ['notify_news','Club news','News about favorite teams']
            ].map(([key,title,desc]) => <label className="toggle-row" key={key}><span><b>{title}</b><small>{desc}</small></span><input type="checkbox" checked={Boolean(prefs[key])} onChange={(e)=>savePref(key,e.target.checked)}/><span className="switch"/></label>)}
          </div>}

          {tab === 'predictions' && <div className="panel-stack"><div className="panel-intro"><h3>Prediction history</h3><p>Your recent match picks, kept with your account.</p></div>
            <div className="prediction-list">{auth.predictions.length ? auth.predictions.map(p => <div className="prediction-item" key={p.id}><span className={`pick-badge ${p.vote_choice}`}>{p.vote_choice.toUpperCase()}</span><span><b>{p.home_en} vs {p.away_en}</b><small>{p.status} · {p.home_score}–{p.away_score}</small></span><ChevronRight size={15}/></div>) : <div className="empty-state">No predictions yet. Make a pick from a match card and it will appear here.</div>}</div>
          </div>}
        </div>
        <button className="logout-btn" onClick={()=>{auth.logout();onClose();}}><LogOut size={16}/> Sign out</button>
      </aside>
    </div>
  );
}
