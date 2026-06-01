import type { HAEntity } from '../hooks/useHA';
import DeviceCard from './DeviceCard';

interface Props {
  grouped: Record<string, HAEntity[]>;
  connected: boolean;
  onToggle: (entityId: string, currentState: string) => void;
}

const DOMAIN_LABELS: Record<string, string> = {
  light: '💡 Iluminação',
  switch: '🔌 Switches',
  sensor: '📡 Sensores',
  automation: '⚡ Automações',
  climate: '❄️ Climatização',
  cover: '🪟 Persianas',
  fan: '🌀 Ventiladores',
  media_player: '🎵 Mídia',
};

export default function HomeAssistantPanel({ grouped, connected, onToggle }: Props) {
  const domainEntries = Object.entries(grouped).filter(([, entities]) => entities.length > 0);

  return (
    <div style={{ position: 'relative' }}>
      {!connected && (
        <div className="disconnected-overlay">
          <span>⚠ AGENT DESCONECTADO</span>
        </div>
      )}

      <h2 className="section-title">Home Assistant — Dispositivos</h2>

      {domainEntries.length === 0 && (
        <div className="empty-state glass-panel">
          <div className="empty-state-icon">🏠</div>
          <p>Nenhum dispositivo encontrado</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Verifique a conexão com o Home Assistant
          </p>
        </div>
      )}

      {domainEntries.map(([domain, entities], groupIdx) => (
        <div key={domain} className="animate-slide-up" style={{ marginBottom: 24, animationDelay: `${0.1 + groupIdx * 0.1}s` }}>
          <h3 className="section-title" style={{ fontSize: '0.65rem', marginBottom: 12 }}>
            {DOMAIN_LABELS[domain] || domain.toUpperCase()}
          </h3>
          <div className="panel-grid-2">
            {entities.map((entity) => (
              <DeviceCard key={entity.entity_id} entity={entity} onToggle={onToggle} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
