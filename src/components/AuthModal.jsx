import { useState } from 'react';
import { X, Mail, LockKeyhole, UserRound, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ open, onClose }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (mode === 'login') await login(form.email, form.password);
      else await register(form);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="auth-modal" role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose}><X size={18}/></button>
        <div className="auth-brand"><span className="brand-mark">⚽</span><div><b>EthioLiveScores</b><small>Match-day account</small></div></div>
        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>Sign in</button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>Create account</button>
        </div>
        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && <label><span>Username</span><div className="field"><UserRound size={16}/><input required minLength={3} maxLength={50} autoComplete="username" value={form.username} onChange={(e) => setForm({...form, username:e.target.value})} placeholder="footballfan"/></div></label>}
          <label><span>Email</span><div className="field"><Mail size={16}/><input required type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({...form, email:e.target.value})} placeholder="you@example.com"/></div></label>
          <label><span>Password</span><div className="field"><LockKeyhole size={16}/><input required type="password" minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(e) => setForm({...form, password:e.target.value})} placeholder="Minimum 8 characters"/></div></label>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-btn" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create my account'}</button>
        </form>
        <div className="auth-note"><ShieldCheck size={15}/> Your account unlocks favorites, alerts, predictions and live chat.</div>
      </section>
    </div>
  );
}
