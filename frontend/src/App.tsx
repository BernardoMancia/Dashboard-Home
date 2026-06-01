import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSystem } from './hooks/useSystem';
import { usePihole } from './hooks/usePihole';
import { useHA } from './hooks/useHA';
import Login from './pages/Login';
import ParticleBackground from './components/ParticleBackground';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import SystemPanel from './components/SystemPanel';
import PiHolePanel from './components/PiHolePanel';
import HomeAssistantPanel from './components/HomeAssistantPanel';

const PANEL_TITLES: Record<string, string> = {
  system: '⚙ Sistema — Raspberry Pi',
  pihole: '🛡 Pi-hole — Segurança DNS',
  ha: '🏠 Home Assistant — Automação',
};

export default function App() {
  const { token, checking, login, logout, isAuthenticated } = useAuth();
  const [activePanel, setActivePanel] = useState('system');

  const system = useSystem(token);
  const pihole = usePihole(token);
  const ha = useHA(token);

  if (checking) {
    return (
      <div className="login-page">
        <ParticleBackground />
        <div style={{ zIndex: 2, textAlign: 'center' }}>
          <div className="spinner" style={{ width: 32, height: 32, color: 'var(--neon-cyan)' }} />
          <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Verificando sessão...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={login} />;
  }

  function handleHAToggle(entityId: string, currentState: string) {
    const domain = entityId.split('.')[0];
    const service = currentState === 'on' ? 'turn_off' : 'turn_on';
    ha.sendCommand(domain, service, entityId);
  }

  return (
    <div className="app-layout">
      <ParticleBackground />
      <Sidebar
        activePanel={activePanel}
        onNavigate={setActivePanel}
        connected={system.connected}
        onLogout={logout}
      />
      <div className="main-area">
        <StatusBar
          connected={system.connected}
          lastUpdate={system.lastUpdate}
          panelTitle={PANEL_TITLES[activePanel] || ''}
        />
        <div className="content-area">
          {activePanel === 'system' && <SystemPanel data={system} />}
          {activePanel === 'pihole' && <PiHolePanel data={pihole} />}
          {activePanel === 'ha' && (
            <HomeAssistantPanel
              grouped={ha.grouped}
              connected={ha.connected}
              onToggle={handleHAToggle}
            />
          )}
        </div>
      </div>
    </div>
  );
}
