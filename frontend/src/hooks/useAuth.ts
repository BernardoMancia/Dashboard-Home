import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export function useAuth() {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('dash_token')
  );
  const [checking, setChecking] = useState(true);

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
  }, []);

  return { token, checking, login, logout, isAuthenticated: !!token };
}
