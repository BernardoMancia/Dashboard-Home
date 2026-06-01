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
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.25)');
    grad.addColorStop(0.5, 'rgba(0, 136, 255, 0.1)');
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

    const lineGrad = ctx.createLinearGradient(0, 0, w, 0);
    lineGrad.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
    lineGrad.addColorStop(0.5, 'rgba(0, 240, 255, 0.9)');
    lineGrad.addColorStop(1, 'rgba(0, 136, 255, 0.6)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 2;
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

      <div className="panel-grid" style={{ marginBottom: 20 }}>
        <div className="glass-panel metric-card accent-cyan animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="metric-header">
            <div className="metric-icon" style={{ background: 'var(--neon-cyan-dim)', color: 'var(--neon-cyan)' }}>📊</div>
            <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>HOJE</span>
          </div>
          <div className="metric-value">{formatNum(data.dns_queries_today)}</div>
          <div className="metric-label">Queries DNS</div>
        </div>

        <div className="glass-panel metric-card accent-magenta animate-slide-up" style={{ animationDelay: '0.15s' }}>
          <div className="metric-header">
            <div className="metric-icon" style={{ background: 'var(--neon-magenta-dim)', color: 'var(--neon-magenta)' }}>🛡</div>
          </div>
          <div className="metric-value">{formatNum(data.ads_blocked_today)}</div>
          <div className="metric-label">Bloqueados</div>
        </div>

        <div className="glass-panel metric-card accent-amber animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="metric-header">
            <div className="metric-icon" style={{ background: 'var(--neon-amber-dim)', color: 'var(--neon-amber)' }}>📈</div>
          </div>
          <div className="metric-value">
            {typeof data.ads_percentage_today === 'number' ? data.ads_percentage_today.toFixed(1) : parseFloat(String(data.ads_percentage_today) || '0').toFixed(1)}%
          </div>
          <div className="metric-label">Taxa de Bloqueio</div>
        </div>

        <div className="glass-panel metric-card accent-green animate-slide-up" style={{ animationDelay: '0.25s' }}>
          <div className="metric-header">
            <div className="metric-icon" style={{ background: 'var(--neon-green-dim)', color: 'var(--neon-green)' }}>🌐</div>
          </div>
          <div className="metric-value">{formatNum(data.domains_being_blocked)}</div>
          <div className="metric-label">Domínios Blocklist</div>
        </div>
      </div>

      <div className="glass-panel animate-slide-up" style={{ padding: 22, marginBottom: 20, animationDelay: '0.3s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Queries — Últimas 24h</h3>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>
            {formatNum(data.unique_clients)} clientes
          </span>
        </div>
        <MiniChart overTime={data.overTime} />
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div className="glass-panel animate-slide-up" style={{ flex: 1, minWidth: 250, padding: 22, animationDelay: '0.35s' }}>
          <h3 className="section-title">Top Queries</h3>
          <ul className="top-list">
            {Object.entries(data.topQueries).slice(0, 6).map(([domain, count]) => (
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

        <div className="glass-panel animate-slide-up" style={{ flex: 1, minWidth: 250, padding: 22, animationDelay: '0.4s' }}>
          <h3 className="section-title">Top Bloqueados</h3>
          <ul className="top-list">
            {Object.entries(data.topAds).slice(0, 6).map(([domain, count]) => (
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

      <div className="glass-panel animate-slide-up" style={{ padding: 22, animationDelay: '0.45s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 className="section-title" style={{ margin: 0 }}>Controles</h3>
          <span
            style={{
              fontSize: '0.68rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              letterSpacing: '1px',
              padding: '4px 12px',
              borderRadius: 'var(--radius-full)',
              background: isEnabled ? 'var(--neon-green-dim)' : 'var(--neon-red-dim)',
              color: isEnabled ? 'var(--neon-green)' : 'var(--neon-red)',
              border: `1px solid ${isEnabled ? 'rgba(0,255,136,0.2)' : 'rgba(255,59,59,0.2)'}`,
            }}
          >
            {isEnabled ? '● ATIVO' : '● INATIVO'}
          </span>
        </div>
        <div className="pihole-controls">
          <button className={`pihole-btn ${isEnabled ? 'active' : ''}`} onClick={() => data.toggle('enable')}>
            ✓ Ativar
          </button>
          <button className="pihole-btn danger" onClick={() => data.toggle('disable', 300)}>
            ⏸ 5 min
          </button>
          <button className="pihole-btn danger" onClick={() => data.toggle('disable', 600)}>
            ⏸ 10 min
          </button>
          <button className="pihole-btn danger" onClick={() => data.toggle('disable', 0)}>
            ⏹ Permanente
          </button>
        </div>
      </div>
    </div>
  );
}
