import { useState, useEffect, useRef } from 'react';
import type { HAEntity } from '../hooks/useHA';
import type { SystemData } from '../hooks/useSystem';
import type { PiholeData } from '../hooks/usePihole';
import type { Room } from '../hooks/useRooms';

interface Props {
  system: SystemData;
  pihole: PiholeData & { toggle: (action: 'enable' | 'disable', seconds?: number) => Promise<void> };
  haEntities: HAEntity[];
  sensors: HAEntity[];
  rooms: Room[];
  getDisplayName: (entity: HAEntity) => string;
  onToggle: (entityId: string, currentState: string) => void;
}

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function ClockWidget() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="ov-clock glass-panel">
      <div className="ov-clock-greeting">{greeting} 👋</div>
      <div className="ov-clock-time">{timeStr}</div>
      <div className="ov-clock-date">{dateStr}</div>
    </div>
  );
}

function MiniGauge({ value, max, color, label, unit }: { value: number; max: number; color: string; label: string; unit: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const r = 40;
  const circ = Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="ov-gauge">
      <svg width="96" height="56" viewBox="0 0 96 56">
        <path d="M 8 48 A 40 40 0 0 1 88 48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" strokeLinecap="round" />
        <path d="M 8 48 A 40 40 0 0 1 88 48" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease', filter: `drop-shadow(0 0 4px ${color})` }} />
      </svg>
      <div className="ov-gauge-value" style={{ color }}>{Math.round(value)}{unit}</div>
      <div className="ov-gauge-label">{label}</div>
    </div>
  );
}

function BatteryCard({ entity, name }: { entity: HAEntity; name: string }) {
  const val = parseFloat(entity.state);
  const pct = isNaN(val) ? 0 : Math.min(val, 100);
  const color = pct > 60 ? 'var(--neon-green)' : pct > 25 ? 'var(--neon-amber)' : 'var(--neon-red)';
  const charging = entity.state === 'charging' ||
    (entity.attributes as Record<string, unknown>).charging === true ||
    name.toLowerCase().includes('charger');

  return (
    <div className="ov-battery glass-panel">
      <div className="ov-battery-header">
        <span className="ov-battery-name">{name}</span>
        {charging && <span className="ov-battery-charging">⚡</span>}
      </div>
      <div className="ov-battery-value" style={{ color }}>{pct.toFixed(0)}%</div>
      <div className="ov-battery-bar">
        <div className="ov-battery-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function RoomOverviewCard({ room, entities }: {
  room: Room;
  entities: HAEntity[];
}) {
  const activeCount = entities.filter((e) => e.state === 'on').length;
  const totalCount = entities.length;

  const tempSensor = entities.find((e) =>
    e.entity_id.includes('temperature') ||
    (e.attributes.device_class as string) === 'temperature'
  );
  const humiditySensor = entities.find((e) =>
    e.entity_id.includes('humidity') ||
    (e.attributes.device_class as string) === 'humidity'
  );

  return (
    <div className="ov-room glass-panel">
      <div className="ov-room-top">
        <span className="ov-room-name">{room.name}</span>
        <span className="ov-room-icon">{room.icon}</span>
      </div>

      {tempSensor && (
        <div className="ov-room-temp">{parseFloat(tempSensor.state).toFixed(0)}°C</div>
      )}

      <div className="ov-room-meta">
        {humiditySensor && <span>{parseFloat(humiditySensor.state).toFixed(0)}%</span>}
        <span className={`ov-room-status ${activeCount > 0 ? 'active' : ''}`}>
          {activeCount > 0 ? `${activeCount}/${totalCount} on` : 'off'}
        </span>
      </div>

      {activeCount > 0 && (
        <div className="ov-room-bar">
          <div className="ov-room-bar-fill" style={{ width: `${(activeCount / Math.max(totalCount, 1)) * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function PiholeCompact({ data }: { data: PiholeData }) {
  const pct = typeof data.ads_percentage_today === 'number'
    ? data.ads_percentage_today.toFixed(1)
    : parseFloat(String(data.ads_percentage_today) || '0').toFixed(1);

  return (
    <div className="ov-pihole glass-panel">
      <div className="ov-pihole-header">
        <span>🛡 Pi-hole</span>
        <span className={`ov-pihole-status ${data.status === 'enabled' ? 'on' : 'off'}`}>
          {data.status === 'enabled' ? '● Ativo' : '● Inativo'}
        </span>
      </div>
      <div className="ov-pihole-stats">
        <div className="ov-pihole-stat">
          <span className="ov-pihole-stat-value" style={{ color: 'var(--neon-cyan)' }}>
            {typeof data.dns_queries_today === 'number' ? data.dns_queries_today.toLocaleString('pt-BR') : data.dns_queries_today}
          </span>
          <span className="ov-pihole-stat-label">Queries</span>
        </div>
        <div className="ov-pihole-stat">
          <span className="ov-pihole-stat-value" style={{ color: 'var(--neon-magenta)' }}>
            {typeof data.ads_blocked_today === 'number' ? data.ads_blocked_today.toLocaleString('pt-BR') : data.ads_blocked_today}
          </span>
          <span className="ov-pihole-stat-label">Bloqueados</span>
        </div>
        <div className="ov-pihole-stat">
          <span className="ov-pihole-stat-value" style={{ color: 'var(--neon-amber)' }}>{pct}%</span>
          <span className="ov-pihole-stat-label">Taxa</span>
        </div>
      </div>
    </div>
  );
}

function QuickMiniChart({ overTime }: { overTime: Record<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const values = Object.values(overTime);
    if (values.length === 0) return;
    const max = Math.max(...values, 1);
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.2)');
    grad.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

    const step = w / (values.length - 1 || 1);

    ctx.beginPath();
    values.forEach((v, i) => {
      const x = i * step;
      const y = h - (v / max) * (h - 2);
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
      const y = h - (v / max) * (h - 2);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [overTime]);

  return <canvas ref={canvasRef} width={400} height={60} style={{ width: '100%', height: '60px', borderRadius: '8px' }} />;
}

export default function OverviewPanel({ system, pihole, haEntities, sensors, rooms, getDisplayName, onToggle }: Props) {
  const allEntities = [...haEntities, ...sensors];

  const batterySensors = sensors.filter((s) => {
    const dc = s.attributes.device_class as string || '';
    const eid = s.entity_id.toLowerCase();
    return (dc === 'battery' || eid.includes('battery')) && !isNaN(parseFloat(s.state)) && s.attributes.unit_of_measurement === '%';
  });

  const quickDevices = haEntities
    .filter((e) => ['light', 'switch', 'fan'].some((d) => e.entity_id.startsWith(`${d}.`)))
    .slice(0, 8);

  const totalActive = haEntities.filter((e) => e.state === 'on').length;
  const totalDevices = haEntities.length;

  const sunSensors = sensors.filter((s) => {
    const name = (s.attributes.friendly_name || '').toLowerCase();
    return name.includes('nascer') || name.includes('amanhecer') || name.includes('pôr') || name.includes('anoitecer');
  }).slice(0, 2);

  return (
    <div className="ov-layout">
      <div className="ov-col ov-col-left">
        <ClockWidget />

        <div className="ov-system glass-panel">
          <div className="ov-section-label">📊 Raspberry Pi</div>
          <div className="ov-gauges-row">
            <MiniGauge
              value={system.cpuUsage}
              max={100}
              color={system.cpuUsage < 50 ? 'var(--neon-cyan)' : system.cpuUsage < 80 ? 'var(--neon-amber)' : 'var(--neon-red)'}
              label="CPU" unit="%"
            />
            <MiniGauge
              value={system.ram.percent}
              max={100}
              color={system.ram.percent < 60 ? 'var(--neon-green)' : system.ram.percent < 85 ? 'var(--neon-amber)' : 'var(--neon-red)'}
              label="RAM" unit="%"
            />
            <MiniGauge
              value={system.temperature}
              max={85}
              color={system.temperature < 50 ? 'var(--neon-green)' : system.temperature < 70 ? 'var(--neon-amber)' : 'var(--neon-red)'}
              label="Temp" unit="°"
            />
          </div>
          <div className="ov-system-meta">
            <span>⏱ {formatUptime(system.uptime)}</span>
            <span>💾 {formatBytes(system.ram.free)} livre</span>
          </div>
        </div>

        <PiholeCompact data={pihole} />

        {Object.keys(pihole.overTime || {}).length > 0 && (
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div className="ov-section-label" style={{ marginBottom: 10 }}>📈 Queries 24h</div>
            <QuickMiniChart overTime={pihole.overTime} />
          </div>
        )}
      </div>

      <div className="ov-col ov-col-center">
        <div className="ov-header-row">
          <div className="ov-section-label">🏠 Cômodos</div>
          <span className="ov-devices-count">{totalActive}/{totalDevices} ativos</span>
        </div>
        <div className="ov-rooms-grid">
          {rooms.map((room) => {
            const roomEntities = allEntities.filter((e) => room.devices.includes(e.entity_id));
            return (
              <RoomOverviewCard
                key={room.id}
                room={room}
                entities={roomEntities}
              />
            );
          })}
          {rooms.length === 0 && (
            <div className="glass-panel" style={{ padding: 32, textAlign: 'center', gridColumn: '1/-1' }}>
              <p style={{ color: 'var(--text-dim)', fontSize: '0.82rem' }}>
                Configure cômodos na aba 🏠 Cômodos
              </p>
            </div>
          )}
        </div>

        {quickDevices.length > 0 && (
          <>
            <div className="ov-section-label" style={{ marginTop: 20 }}>⚡ Controles Rápidos</div>
            <div className="ov-quick-grid">
              {quickDevices.map((entity) => {
                const isOn = entity.state === 'on';
                const domain = entity.entity_id.split('.')[0];
                const icons: Record<string, string> = { light: '💡', switch: '⚡', fan: '🌀' };
                return (
                  <button
                    key={entity.entity_id}
                    className={`ov-quick-btn glass-panel ${isOn ? 'active' : ''}`}
                    onClick={() => onToggle(entity.entity_id, entity.state)}
                  >
                    <span className="ov-quick-icon">{icons[domain] || '📦'}</span>
                    <span className="ov-quick-name">{getDisplayName(entity)}</span>
                    <span className={`ov-quick-state ${isOn ? 'on' : 'off'}`}>{isOn ? 'ON' : 'OFF'}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <div className="ov-col ov-col-right">
        {batterySensors.length > 0 && (
          <>
            <div className="ov-section-label">🔋 Baterias</div>
            <div className="ov-batteries-grid">
              {batterySensors.map((s) => (
                <BatteryCard key={s.entity_id} entity={s} name={getDisplayName(s)} />
              ))}
            </div>
          </>
        )}

        {sunSensors.length > 0 && (
          <div className="glass-panel ov-sun-card">
            <div className="ov-section-label">☀️ Sol</div>
            {sunSensors.map((s) => {
              let val = s.state;
              const ts = Date.parse(val);
              if (!isNaN(ts) && val.includes('-')) {
                val = new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              }
              return (
                <div key={s.entity_id} className="ov-sun-item">
                  <span className="ov-sun-label">{getDisplayName(s)}</span>
                  <span className="ov-sun-value">{val}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="glass-panel ov-network-card">
          <div className="ov-section-label">🌐 Rede</div>
          <div className="ov-network-stats">
            <div className="ov-network-item">
              <span className="ov-network-label">Raspberry Pi</span>
              <span className={`ov-network-status ${system.connected ? 'on' : 'off'}`}>
                {system.connected ? '● Online' : '● Offline'}
              </span>
            </div>
            <div className="ov-network-item">
              <span className="ov-network-label">Pi-hole</span>
              <span className={`ov-network-status ${pihole.connected ? 'on' : 'off'}`}>
                {pihole.connected ? '● Online' : '● Offline'}
              </span>
            </div>
            <div className="ov-network-item">
              <span className="ov-network-label">Clientes DNS</span>
              <span className="ov-network-value">{pihole.unique_clients || 0}</span>
            </div>
            <div className="ov-network-item">
              <span className="ov-network-label">Blocklist</span>
              <span className="ov-network-value">
                {typeof pihole.domains_being_blocked === 'number' ? pihole.domains_being_blocked.toLocaleString('pt-BR') : pihole.domains_being_blocked}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
