import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSystem } from './hooks/useSystem';
import { usePihole } from './hooks/usePihole';
import { useHA } from './hooks/useHA';
import { useRooms } from './hooks/useRooms';
import { useDeviceNames } from './hooks/useDeviceNames';
import Login from './pages/Login';
import ParticleBackground from './components/ParticleBackground';
import Sidebar from './components/Sidebar';
import StatusBar from './components/StatusBar';
import OverviewPanel from './components/OverviewPanel';
import SystemPanel from './components/SystemPanel';
import PiHolePanel from './components/PiHolePanel';
import HomeAssistantPanel from './components/HomeAssistantPanel';
import SensorsPanel from './components/SensorsPanel';
import UsersPanel from './components/UsersPanel';
import LogsPanel from './components/LogsPanel';

const PANEL_TITLES: Record<string, string> = {
  overview: '📊 Overview — Visão Geral',
  system: '⚙ Sistema — Raspberry Pi',
  pihole: '🛡 Pi-hole — Segurança DNS',
  ha: '🏠 Cômodos & Dispositivos',
  sensors: '📡 Sensores & Monitoramento',
  users: '👥 Gerenciamento de Usuários',
  logs: '📋 Registro de Atividades',
};

export default function App() {
  const { token, checking, login, logout, isAuthenticated, isAdmin, username } = useAuth();
  const [activePanel, setActivePanel] = useState('overview');

  const system = useSystem(token);
  const pihole = usePihole(token);
  const ha = useHA(token);
  const { rooms, addRoom, updateRoom, deleteRoom, assignDevice, unassignDevice } = useRooms(token);
  const { setCustomName, getDisplayName } = useDeviceNames(token);

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

  function handleToggle(entityId: string, currentState: string) {
    ha.optimisticToggle(entityId, currentState);
    const domain = entityId.split('.')[0];
    const service = currentState === 'on' ? 'turn_off' : 'turn_on';
    ha.sendCommand(domain, service, entityId);
  }

  function handleBrightness(entityId: string, brightness: number) {
    ha.optimisticBrightness(entityId, brightness);
    ha.sendCommand('light', 'turn_on', entityId, { brightness });
  }

  function handleColor(entityId: string, rgb: [number, number, number]) {
    ha.optimisticColor(entityId, rgb);
    ha.sendCommand('light', 'turn_on', entityId, { rgb_color: rgb });
  }

  return (
    <div className="app-layout">
      <ParticleBackground />
      <Sidebar
        activePanel={activePanel}
        onNavigate={setActivePanel}
        connected={system.connected}
        onLogout={logout}
        isAdmin={isAdmin}
        username={username}
      />
      <div className="main-area">
        <StatusBar
          connected={system.connected}
          lastUpdate={system.lastUpdate}
          panelTitle={PANEL_TITLES[activePanel] || ''}
        />
        <div className="content-area">
          {activePanel === 'overview' && (
            <OverviewPanel
              system={system}
              pihole={pihole}
              haEntities={ha.controllable}
              sensors={ha.sensors}
              rooms={rooms}
              getDisplayName={getDisplayName}
              onToggle={handleToggle}
            />
          )}
          {activePanel === 'system' && <SystemPanel data={system} />}
          {activePanel === 'pihole' && <PiHolePanel data={pihole} />}
          {activePanel === 'ha' && (
            <HomeAssistantPanel
              entities={ha.controllable}
              connected={ha.connected}
              rooms={rooms}
              getDisplayName={getDisplayName}
              onToggle={handleToggle}
              onBrightness={handleBrightness}
              onColor={handleColor}
              onAddRoom={addRoom}
              onUpdateRoom={updateRoom}
              onDeleteRoom={deleteRoom}
              onAssignDevice={assignDevice}
              onUnassignDevice={unassignDevice}
              onRenameDevice={setCustomName}
            />
          )}
          {activePanel === 'sensors' && (
            <SensorsPanel
              sensors={ha.sensors}
              getDisplayName={getDisplayName}
            />
          )}
          {activePanel === 'users' && isAdmin && (
            <UsersPanel token={token} />
          )}
          {activePanel === 'logs' && isAdmin && (
            <LogsPanel token={token} />
          )}
        </div>
      </div>
    </div>
  );
}
