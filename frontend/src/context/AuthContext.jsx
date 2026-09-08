import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setToken, getToken } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    if (!getToken()) { setLoading(false); return; }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch {
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMe(); }, [loadMe]);

  // Step 1: password check. Returns { userId, next, message } — NO token yet.
  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  };
  // Step 2: emailed code -> tokens + user.
  const verifyMfa = async (userId, code) => {
    const { data } = await api.post('/auth/verify-mfa', { userId, code });
    setToken(data.accessToken);
    setUser(data.user);
    return data.user;
  };
  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    return data;
  };
  const verifyEmail = async (userId, code) => {
    const { data } = await api.post('/auth/verify-email', { userId, code });
    return data;
  };
  const resendCode = async (userId, purpose) => {
    const { data } = await api.post('/auth/resend-code', { userId, purpose });
    return data;
  };
  const forgotPassword = async (email) => {
    const { data } = await api.post('/auth/forgot-password', { email });
    return data;
  };
  const resetPassword = async (email, code, newPassword) => {
    const { data } = await api.post('/auth/reset-password', { email, code, newPassword });
    return data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user, setUser, loading,
      login, verifyMfa, register, verifyEmail, resendCode, forgotPassword, resetPassword,
      logout, refreshUser: loadMe,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

const RANK = { viewer: 1, officer: 2, admin: 3, superadmin: 4 };
export function atLeast(role, required) {
  return (RANK[role] || 0) >= (RANK[required] || 0);
}
