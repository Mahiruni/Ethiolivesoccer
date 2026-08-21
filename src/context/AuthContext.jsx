import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('ethio_token')));
  const [favorites, setFavorites] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [predictions, setPredictions] = useState([]);

  const refreshMe = useCallback(async () => {
    if (!localStorage.getItem('ethio_token')) {
      setUser(null); setLoading(false); return null;
    }
    try {
      const me = await apiFetch('/auth/me');
      setUser(me.user);
      setPreferences(me.preferences || null);
      return me;
    } catch (error) {
      if (error.status === 401) localStorage.removeItem('ethio_token');
      setUser(null);
      return null;
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refreshMe(); }, [refreshMe]);

  const login = async (email, password) => {
    const result = await apiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('ethio_token', result.token);
    setUser(result.user);
    setPreferences(result.preferences || null);
    return result.user;
  };

  const register = async ({ username, email, password }) => {
    const result = await apiFetch('/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });
    localStorage.setItem('ethio_token', result.token);
    setUser(result.user);
    setPreferences(result.preferences || null);
    return result.user;
  };

  const logout = () => {
    localStorage.removeItem('ethio_token');
    setUser(null); setFavorites([]); setPreferences(null); setPredictions([]);
  };

  const updateProfile = async (patch) => {
    const result = await apiFetch('/auth/me', { method: 'PATCH', body: JSON.stringify(patch) });
    setUser(result.user);
    return result.user;
  };

  const loadFavorites = async () => {
    const result = await apiFetch('/me/favorites');
    setFavorites(result || []);
    return result;
  };

  const toggleFavorite = async (teamId) => {
    const exists = favorites.some((team) => Number(team.id) === Number(teamId));
    await apiFetch(`/me/favorites/${teamId}`, { method: exists ? 'DELETE' : 'POST' });
    return loadFavorites();
  };

  const savePreferences = async (patch) => {
    const result = await apiFetch('/me/preferences', { method: 'PUT', body: JSON.stringify(patch) });
    setPreferences(result);
    return result;
  };

  const loadPredictions = async () => {
    const result = await apiFetch('/me/predictions');
    setPredictions(result || []);
    return result;
  };

  const value = useMemo(() => ({
    user, loading, favorites, preferences, predictions,
    login, register, logout, refreshMe, updateProfile,
    loadFavorites, toggleFavorite, savePreferences, loadPredictions
  }), [user, loading, favorites, preferences, predictions]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
