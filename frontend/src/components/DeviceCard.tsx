import type { HAEntity } from '../hooks/useHA';

interface Props {
  entity: HAEntity;
  onToggle: (entityId: string, currentState: string) => void;
}

const DOMAIN_ICONS: Record<string, string> = {
  light: '💡',
  switch: '⚡',
  sensor: '📡',
  automation: '🤖',
  climate: '❄️',
  cover: '🪟',
  fan: '🌀',
  media_player: '🎵',
  binary_sensor: '🔔',
  camera: '📷',
  lock: '🔒',
  vacuum: '🧹',
  input_boolean: '🎚️',
};

const DOMAIN_COLORS: Record<string, { bg: string; border: string; active: string }> = {
  light: { bg: 'rgba(255, 200, 50, 0.08)', border: 'rgba(255, 200, 50, 0.15)', active: '#ffc832' },
  switch: { bg: 'var(--neon-cyan-dim)', border: 'rgba(0, 240, 255, 0.15)', active: 'var(--neon-cyan)' },
  sensor: { bg: 'var(--neon-purple-dim)', border: 'rgba(168, 85, 247, 0.15)', active: 'var(--neon-purple)' },
  automation: { bg: 'var(--neon-blue-dim)', border: 'rgba(59, 130, 246, 0.15)', active: 'var(--neon-blue)' },
  fan: { bg: 'var(--neon-green-dim)', border: 'rgba(0, 255, 136, 0.15)', active: 'var(--neon-green)' },
};

export default function DeviceCard({ entity, onToggle }: Props) {
  const domain = entity.entity_id.split('.')[0];
  const icon = DOMAIN_ICONS[domain] || '📦';
  const name = entity.attributes.friendly_name || entity.entity_id;
  const isOn = entity.state === 'on';
  const isToggleable = ['light', 'switch', 'automation', 'fan', 'cover', 'media_player', 'input_boolean'].includes(domain);
  const isSensor = domain === 'sensor' || domain === 'binary_sensor';

  const colors = DOMAIN_COLORS[domain] || DOMAIN_COLORS.switch;

  const stateColor = isOn
    ? colors.active
    : entity.state === 'unavailable'
      ? 'var(--neon-red)'
      : 'var(--text-muted)';

  function displayState() {
    if (isSensor) {
      const unit = entity.attributes.unit_of_measurement || '';
      return `${entity.state} ${unit}`.trim();
    }
    if (isOn) return 'Ligado';
    if (entity.state === 'off') return 'Desligado';
    if (entity.state === 'unavailable') return 'Indisponível';
    return entity.state;
  }

  return (
    <div className={`glass-panel device-card ${isOn ? 'is-on' : ''}`}>
      <div
        className="device-icon"
        style={{
          background: isOn ? colors.bg : 'rgba(255,255,255,0.03)',
          color: stateColor,
          borderColor: isOn ? colors.border : undefined,
        }}
      >
        {icon}
      </div>

      <div className="device-info">
        <div className="device-name" title={name}>{name}</div>
        <div className="device-state" style={{ color: stateColor }}>
          {displayState()}
        </div>
      </div>

      {isToggleable && (
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isOn}
            onChange={() => onToggle(entity.entity_id, entity.state)}
          />
          <span className="toggle-slider" />
        </label>
      )}
    </div>
  );
}
