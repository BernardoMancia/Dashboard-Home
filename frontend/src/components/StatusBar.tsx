import { useState, useEffect } from 'react';

interface StatusBarProps {
  connected: boolean;
  lastUpdate: number | null;
  panelTitle: string;
}

export default function StatusBar({ connected, lastUpdate, panelTitle }: StatusBarProps) {
  const [clock, setClock] = useState(formatClock());

  useEffect(() => {
    const id = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(id);
  }, []);

  function formatClock() {
    return new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  function timeSince(ts: number | null) {
    if (!ts) return '—';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return 'agora';
    if (diff < 60) return `${diff}s atrás`;
    return `${Math.floor(diff / 60)}m atrás`;
  }

  return (
    <header className="status-bar">
      <div className="status-bar-left">
        <span className="status-bar-title">{panelTitle}</span>
      </div>
      <div className="status-bar-right">
        <span className="status-badge" style={{ opacity: 0.6 }}>
          📡 10.0.0.88
        </span>
        <span className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
          <span className={`status-dot ${connected ? 'online' : 'offline'}`} style={{ width: 6, height: 6 }} />
          {connected ? `Sync ${timeSince(lastUpdate)}` : 'Offline'}
        </span>
        <span className="clock">{clock}</span>
      </div>
    </header>
  );
}
