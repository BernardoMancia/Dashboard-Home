import type { HAEntity } from '../hooks/useHA';

interface Props {
  entity: HAEntity;
  onToggle: (entityId: string, currentState: string) => void;
}

const DOMAIN_ICONS: Record<string, string> = {
  light: '💡',
  switch: '🔌',
  sensor: '📡',
  automation: '⚡',
  climate: '❄️',
  cover: '🪟',
  fan: '🌀',
  media_player: '🎵',
};

export default function DeviceCard({ entity, onToggle }: Props) {
  const domain = entity.entity_id.split('.')[0];
  const icon = DOMAIN_ICONS[domain] || '📦';
  const name = entity.attributes.friendly_name || entity.entity_id;
  const isOn = entity.state === 'on';
  const isToggleable = ['light', 'switch', 'automation', 'fan', 'cover', 'media_player'].includes(domain);
  const isSensor = domain === 'sensor';

  const stateColor = isOn
    ? 'var(--neon-cyan)'
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
    return entity.state;
  }

  return (
    <div className="glass-panel device-card">
      <div
        className="device-icon"
        style={{
          background: isOn ? 'var(--neon-cyan-dim)' : 'rgba(255,255,255,0.03)',
          color: stateColor,
        }}
      >
        {icon}
      </div>

      <div className="device-info">
        <div className="device-name">{name}</div>
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
