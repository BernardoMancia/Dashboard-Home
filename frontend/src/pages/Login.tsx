import { useState, FormEvent } from 'react';
import ParticleBackground from '../components/ParticleBackground';

interface LoginProps {
  onLogin: (token: string) => void;
}

const API = import.meta.env.VITE_API_URL || '';

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Falha na autenticação');
        return;
      }

      localStorage.setItem('dash_token', data.token);
      onLogin(data.token);
    } catch {
      setError('Servidor indisponível');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <ParticleBackground />

      <form className="login-card glass-panel neon-glow-cyan" onSubmit={handleSubmit}>
        <div className="login-logo">
          <div className="login-logo-icon">⛊</div>
          <h1>Dash Geral</h1>
          <p className="login-subtitle">Monitoramento Residencial</p>
        </div>

        {error && <div className="login-error">{error}</div>}

        <div className="form-group">
          <label className="form-label" htmlFor="login-user">Usuário</label>
          <input
            id="login-user"
            className="form-input"
            type="text"
            placeholder="admin"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-pass">Senha</label>
          <input
            id="login-pass"
            className="form-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : 'Acessar Dashboard'}
        </button>
      </form>
    </div>
  );
}
