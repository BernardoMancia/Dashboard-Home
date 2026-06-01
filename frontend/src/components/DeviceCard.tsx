import { useState } from 'react';
import type { HAEntity } from '../hooks/useHA';
import LightControls from './LightControls';

interface Props {
  entity: HAEntity;
  displayName: string;
  onToggle: (entityId: string, currentState: string) => void;
  onBrightness: (entityId: string, brightness: number) => void;
  onColor: (entityId: string, rgb: [number, number, number]) => void;
  onRename: (entityId: string, currentName: string) => void;
}

const DOMAIN_ICONS: Record<string, string> = {
  light: '💡',
  switch: '⚡',
  automation: '🤖',
  climate: '❄️',
  cover: '🪟',
  fan: '🌀',
  media_player: '🎵',
  input_boolean: '🎚️',
  camera: '📷',
  lock: '🔒',
  vacuum: '🧹',
};

const DOMAIN_COLORS: Record<string, { bg: string; border: string; active: string }> = {
  light: { bg: 'rgba(255, 200, 50, 0.08)', border: 'rgba(255, 200, 50, 0.15)', active: '#ffc832' },
  switch: { bg: 'var(--neon-cyan-dim)', border: 'rgba(0, 240, 255, 0.15)', active: 'var(--neon-cyan)' },
  automation: { bg: 'var(--neon-blue-dim)', border: 'rgba(59, 130, 246, 0.15)', active: 'var(--neon-blue)' },
  fan: { bg: 'var(--neon-green-dim)', border: 'rgba(0, 255, 136, 0.15)', active: 'var(--neon-green)' },
  climate: { bg: 'var(--neon-purple-dim)', border: 'rgba(168, 85, 247, 0.15)', active: 'var(--neon-purple)' },
};

export default function DeviceCard({ entity, displayName, onToggle, onBrightness, onColor, onRename }: Props) {
  const [expanded, setExpanded] = useState(false);
  const domain = entity.entity_id.split('.')[0];
  const icon = DOMAIN_ICONS[domain] || '📦';
  const isOn = entity.state === 'on';
  const isToggleable = ['light', 'switch', 'automation', 'fan', 'cover', 'media_player', 'input_boolean'].includes(domain);
  const isLight = domain === 'light';

  const colors = DOMAIN_COLORS[domain] || DOMAIN_COLORS.switch;

  const stateColor = isOn
    ? colors.active
    : entity.state === 'unavailable'
      ? 'var(--neon-red)'
      : 'var(--text-muted)';

  function displayState() {
    if (isOn) {
      if (isLight && entity.attributes.brightness) {
        const pct = Math.round((entity.attributes.brightness / 255) * 100);
        return `Ligado · ${pct}%`;
      }
      return 'Ligado';
    }
    if (entity.state === 'off') return 'Desligado';
    if (entity.state === 'unavailable') return 'Indisponível';
    return entity.state;
  }

  return (
    <div className={`glass-panel device-card-wrapper ${isOn ? 'is-on' : ''} ${expanded ? 'expanded' : ''}`}>
      <div className="device-card-row">
        <div
          className="device-icon"
          style={{
            background: isOn ? colors.bg : 'rgba(255,255,255,0.03)',
            color: stateColor,
            borderColor: isOn ? colors.border : undefined,
            cursor: isLight ? 'pointer' : 'default',
          }}
          onClick={() => isLight && setExpanded(!expanded)}
        >
          {icon}
        </div>

        <div className="device-info" onClick={() => isLight && setExpanded(!expanded)} style={{ cursor: isLight ? 'pointer' : 'default' }}>
          <div className="device-name" title={displayName}>
            {displayName}
            <button
              className="rename-btn"
              onClick={(e) => { e.stopPropagation(); onRename(entity.entity_id, displayName); }}
              title="Renomear"
            >
              ✏️
            </button>
          </div>
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

      {isLight && expanded && isOn && (
        <LightControls
          entity={entity}
          onBrightness={(val) => onBrightness(entity.entity_id, val)}
          onColor={(rgb) => onColor(entity.entity_id, rgb)}
        />
      )}
    </div>
  );
}
