import type { HAEntity } from '../hooks/useHA';

interface Props {
  sensors: HAEntity[];
  getDisplayName: (entity: HAEntity) => string;
}

interface SensorGroup {
  label: string;
  icon: string;
  entities: HAEntity[];
}

function categorize(entity: HAEntity): string {
  const dc = entity.attributes.device_class as string || '';
  const eid = entity.entity_id.toLowerCase();
  const name = (entity.attributes.friendly_name || '').toLowerCase();

  if (dc === 'battery' || eid.includes('battery')) return 'battery';
  if (dc === 'energy' || dc === 'power' || eid.includes('energy') || eid.includes('power')) return 'energy';
  if (dc === 'temperature' || dc === 'humidity' || eid.includes('temperature') || eid.includes('humidity')) return 'climate';
  if (eid.includes('sun_') || name.includes('sun ') || name.includes('nascer') || name.includes('pôr') ||
      name.includes('amanhecer') || name.includes('anoitecer') || name.includes('meio-dia') || name.includes('meia-noite')) return 'solar';
  if (eid.includes('internet') || eid.includes('gateway') || dc === 'connectivity') return 'network';
  if (eid.includes('backup') || name.includes('backup')) return 'backup';
  if (dc === 'charger' || eid.includes('charger') || name.includes('charger') || name.includes('charging')) return 'battery';
  return 'other';
}

const GROUP_META: Record<string, { label: string; icon: string; order: number }> = {
  battery: { label: 'Bateria & Carregamento', icon: '🔋', order: 1 },
  energy: { label: 'Energia', icon: '⚡', order: 2 },
  climate: { label: 'Clima & Ambiente', icon: '🌡', order: 3 },
  solar: { label: 'Solar & Horários', icon: '☀️', order: 4 },
  network: { label: 'Rede', icon: '🌐', order: 5 },
  backup: { label: 'Backups', icon: '💾', order: 6 },
  other: { label: 'Outros', icon: '📦', order: 99 },
};

function getBatteryColor(val: number) {
  if (val > 60) return 'var(--neon-green)';
  if (val > 25) return 'var(--neon-amber)';
  return 'var(--neon-red)';
}

function formatSensorValue(entity: HAEntity): string {
  const val = entity.state;
  const unit = entity.attributes.unit_of_measurement || '';

  if (val === 'unknown' || val === 'unavailable') return val;

  if (unit === '%') return `${val}%`;

  const ts = Date.parse(val);
  if (!isNaN(ts) && val.includes('-') && val.length > 10) {
    const d = new Date(ts);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  return unit ? `${val} ${unit}` : val;
}

export default function SensorsPanel({ sensors, getDisplayName }: Props) {
  const groupMap: Record<string, HAEntity[]> = {};
  sensors.forEach((s) => {
    const cat = categorize(s);
    if (!groupMap[cat]) groupMap[cat] = [];
    groupMap[cat].push(s);
  });

  const groups: SensorGroup[] = Object.entries(groupMap)
    .map(([key, entities]) => ({
      ...GROUP_META[key] || GROUP_META.other,
      entities,
    }))
    .sort((a, b) => (GROUP_META[Object.keys(groupMap).find((k) => GROUP_META[k]?.label === a.label) || 'other']?.order || 99)
      - (GROUP_META[Object.keys(groupMap).find((k) => GROUP_META[k]?.label === b.label) || 'other']?.order || 99));

  return (
    <div>
      <h2 className="section-title">Sensores & Monitoramento</h2>

      {groups.length === 0 && (
        <div className="empty-state glass-panel">
          <div className="empty-state-icon">📡</div>
          <p>Nenhum sensor encontrado</p>
        </div>
      )}

      {groups.map((group, gi) => (
        <div key={group.label} className="animate-slide-up" style={{ marginBottom: 28, animationDelay: `${gi * 0.1}s` }}>
          <h3 className="section-title" style={{ fontSize: '0.68rem', marginBottom: 14 }}>
            {group.icon} {group.label}
          </h3>
          <div className="sensor-grid">
            {group.entities.map((entity) => {
              const cat = categorize(entity);
              const val = entity.state;
              const numVal = parseFloat(val);
              const isBattery = cat === 'battery' && !isNaN(numVal) && entity.attributes.unit_of_measurement === '%';

              return (
                <div key={entity.entity_id} className="glass-panel sensor-card">
                  <div className="sensor-card-header">
                    <span className="sensor-card-name">{getDisplayName(entity)}</span>
                    {entity.state === 'unavailable' && (
                      <span className="sensor-unavailable">OFF</span>
                    )}
                  </div>
                  <div className="sensor-card-value" style={{
                    color: isBattery ? getBatteryColor(numVal) : 'var(--text-bright)',
                  }}>
                    {formatSensorValue(entity)}
                  </div>
                  {isBattery && (
                    <div className="progress-bar-track" style={{ marginTop: 8 }}>
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${Math.min(numVal, 100)}%`,
                          background: `linear-gradient(90deg, ${getBatteryColor(numVal)}, ${getBatteryColor(numVal)}88)`,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
