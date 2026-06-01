import { useRef, useEffect } from 'react';
import type { PiholeData } from '../hooks/usePihole';

interface Props {
  data: PiholeData & { toggle: (action: 'enable' | 'disable', seconds?: number) => Promise<void> };
}

function formatNum(n: number | string) {
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (isNaN(num)) return '0';
  return num.toLocaleString('pt-BR');
}

function MiniChart({ overTime }: { overTime: Record<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const entries = Object.entries(overTime);
    if (entries.length === 0) return;

    const values = entries.map(([, v]) => v);
    const max = Math.max(...values, 1);
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.3)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

    ctx.beginPath();
    ctx.moveTo(0, h);

    const step = w / (values.length - 1 || 1);
    values.forEach((v, i) => {
      const x = i * step;
      const y = h - (v / max) * (h - 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    values.forEach((v, i) => {
      const x = i * step;
      const y = h - (v / max) * (h - 4);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [overTime]);

  return (
    <div className="chart-container">
      <canvas ref={canvasRef} width={600} height={120} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}

export default function PiHolePanel({ data }: Props) {
  const isEnabled = data.status === 'enabled';

  return (
    <div style={{ position: 'relative' }}>
      {!data.connected && (
        <div className="disconnected-overlay">
          <span>⚠ AGENT DESCONECTADO</span>
        </div>
      )}

      <h2 className="section-title">Pi-hole — Segurança de Rede</h2>

      <div className="panel-grid" style={{ marginBottom: 24 }}>
        <div className="glass-panel metric-card neon-glow-cyan animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="metric-header">
            <div className="metric-icon" style={{ background: 'var(--neon-cyan-dim)', color: 'var(--neon-cyan)' }}>📊</div>
          </div>
          <div className="metric-value" style={{ color: 'var(--neon-cyan)' }}>
            {formatNum(data.dns_queries_today)}
          </div>
          <div className="metric-label">Queries Hoje</div>
        </div>

        <div className="glass-panel metric-card neon-glow-magenta animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="metric-header">
            <div className="metric-icon" style={{ background: 'var(--neon-magenta-dim)', color: 'var(--neon-magenta)' }}>🚫</div>
          </div>
          <div className="metric-value" style={{ color: 'var(--neon-magenta)' }}>
            {formatNum(data.ads_blocked_today)}
          </div>
          <div className="metric-label">Bloqueados</div>
        </div>

        <div className="glass-panel metric-card neon-glow-amber animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="metric-header">
            <div className="metric-icon" style={{ background: 'var(--neon-amber-dim)', color: 'var(--neon-amber)' }}>⚡</div>
          </div>
          <div className="metric-value" style={{ color: 'var(--neon-amber)' }}>
            {typeof data.ads_percentage_today === 'number' ? data.ads_percentage_today.toFixed(1) : parseFloat(String(data.ads_percentage_today) || '0').toFixed(1)}%
          </div>
          <div className="metric-label">% Bloqueio</div>
        </div>

        <div className="glass-panel metric-card neon-glow-green animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="metric-header">
            <div className="metric-icon" style={{ background: 'var(--neon-green-dim)', color: 'var(--neon-green)' }}>🌐</div>
          </div>
          <div className="metric-value" style={{ color: 'var(--neon-green)' }}>
            {formatNum(data.domains_being_blocked)}
          </div>
          <div className="metric-label">Domínios na Blocklist</div>
        </div>
      </div>

      <div className="glass-panel animate-slide-up" style={{ padding: 20, marginBottom: 24, animationDelay: '0.3s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Queries — Últimas 24h</h3>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Clientes: {formatNum(data.unique_clients)}
          </span>
        </div>
        <MiniChart overTime={data.overTime} />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
        <div className="glass-panel animate-slide-up" style={{ flex: 1, minWidth: 250, padding: 20, animationDelay: '0.35s' }}>
          <h3 className="section-title">Top Queries</h3>
          <ul className="top-list">
            {Object.entries(data.topQueries).slice(0, 5).map(([domain, count]) => (
              <li key={domain} className="top-list-item">
                <span className="domain">{domain}</span>
                <span className="count">{formatNum(count)}</span>
              </li>
            ))}
            {Object.keys(data.topQueries).length === 0 && (
              <li className="top-list-item" style={{ justifyContent: 'center', color: 'var(--text-dim)' }}>Sem dados</li>
            )}
          </ul>
        </div>

        <div className="glass-panel animate-slide-up" style={{ flex: 1, minWidth: 250, padding: 20, animationDelay: '0.4s' }}>
          <h3 className="section-title">Top Bloqueados</h3>
          <ul className="top-list">
            {Object.entries(data.topAds).slice(0, 5).map(([domain, count]) => (
              <li key={domain} className="top-list-item">
                <span className="domain">{domain}</span>
                <span className="count" style={{ color: 'var(--neon-magenta)' }}>{formatNum(count)}</span>
              </li>
            ))}
            {Object.keys(data.topAds).length === 0 && (
              <li className="top-list-item" style={{ justifyContent: 'center', color: 'var(--text-dim)' }}>Sem dados</li>
            )}
          </ul>
        </div>
      </div>

      <div className="glass-panel animate-slide-up" style={{ padding: 20, animationDelay: '0.45s' }}>
        <h3 className="section-title">Controles</h3>
        <div className="pihole-controls">
          <button
            className={`pihole-btn ${isEnabled ? 'active' : ''}`}
            onClick={() => data.toggle('enable')}
          >
            ✓ Ativado
          </button>
          <button
            className="pihole-btn danger"
            onClick={() => data.toggle('disable', 300)}
          >
            Desativar 5min
          </button>
          <button
            className="pihole-btn danger"
            onClick={() => data.toggle('disable', 600)}
          >
            Desativar 10min
          </button>
          <button
            className="pihole-btn danger"
            onClick={() => data.toggle('disable', 0)}
          >
            Desativar Perm.
          </button>
        </div>
      </div>
    </div>
  );
}
