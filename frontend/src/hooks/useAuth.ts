import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('dash_token')
  );
  const [checking, setChecking] = useState(true);
  const [role, setRole] = useState<string>('user');
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setChecking(false);
      return;
    }

    fetch(`${API}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) {
          localStorage.removeItem('dash_token');
          setToken(null);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data) {
          setRole(data.role || 'user');
          setUsername(data.user || '');
        }
      })
      .catch(() => {
        localStorage.removeItem('dash_token');
        setToken(null);
      })
      .finally(() => setChecking(false));
  }, [token]);

  const login = useCallback((t: string) => {
    localStorage.setItem('dash_token', t);
    setToken(t);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('dash_token');
    setToken(null);
    setRole('user');
    setUsername('');
  }, []);

  return { token, checking, login, logout, isAuthenticated: !!token, role, username, isAdmin: role === 'admin' };
}
