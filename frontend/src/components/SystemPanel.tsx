import type { SystemData } from '../hooks/useSystem';

interface Props {
  data: SystemData;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function GaugeCircle({ value, max = 100, color, label, unit = '%' }: {
  value: number; max?: number; color: string; label: string; unit?: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const r = 50;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="gauge-container">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={r} fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease' }}
        />
      </svg>
      <div className="gauge-value">
        <span style={{ color }}>{Math.round(value)}{unit}</span>
        <span className="gauge-label">{label}</span>
      </div>
    </div>
  );
}

function getTempColor(temp: number) {
  if (temp < 50) return 'var(--neon-green)';
  if (temp < 70) return 'var(--neon-amber)';
  return 'var(--neon-red)';
}

export default function SystemPanel({ data }: Props) {
  return (
    <div style={{ position: 'relative' }}>
      {!data.connected && (
        <div className="disconnected-overlay">
          <span>⚠ AGENT DESCONECTADO</span>
        </div>
      )}

      <h2 className="section-title">Métricas do Raspberry Pi</h2>

      <div className="panel-grid" style={{ marginBottom: 24 }}>
        <div className="glass-panel metric-card neon-glow-green animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="metric-header">
            <div className="metric-icon" style={{ background: 'var(--neon-green-dim)', color: 'var(--neon-green)' }}>⏱</div>
          </div>
          <div className="metric-value" style={{ color: 'var(--neon-green)' }}>
            {formatUptime(data.uptime)}
          </div>
          <div className="metric-label">Uptime</div>
        </div>

        <div className="glass-panel metric-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="metric-header">
            <div className="metric-icon" style={{ background: 'var(--neon-cyan-dim)', color: 'var(--neon-cyan)' }}>💾</div>
          </div>
          <div className="metric-value" style={{ color: 'var(--neon-cyan)' }}>
            {data.ram.percent}%
          </div>
          <div className="metric-label">RAM — {formatBytes(data.ram.used)} / {formatBytes(data.ram.total)}</div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{
                width: `${data.ram.percent}%`,
                background: data.ram.percent > 85
                  ? 'var(--neon-red)'
                  : data.ram.percent > 60
                    ? 'var(--neon-amber)'
                    : 'var(--neon-cyan)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="panel-grid">
        <div className="glass-panel metric-card animate-slide-up" style={{ animationDelay: '0.3s', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <GaugeCircle value={data.cpuUsage} color="var(--neon-magenta)" label="CPU" />
        </div>

        <div className="glass-panel metric-card animate-slide-up" style={{ animationDelay: '0.4s', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <GaugeCircle value={data.temperature} max={85} color={getTempColor(data.temperature)} label="Temp" unit="°C" />
        </div>
      </div>
    </div>
  );
}
