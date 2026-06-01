import { useState } from 'react';
import type { HAEntity } from '../hooks/useHA';
import type { Room } from '../hooks/useRooms';
import DeviceCard from './DeviceCard';
import RoomModal from './RoomModal';
import RenameModal from './RenameModal';

interface Props {
  entities: HAEntity[];
  connected: boolean;
  rooms: Room[];
  getDisplayName: (entity: HAEntity) => string;
  onToggle: (entityId: string, currentState: string) => void;
  onBrightness: (entityId: string, brightness: number) => void;
  onColor: (entityId: string, rgb: [number, number, number]) => void;
  onAddRoom: (name: string, icon: string) => void;
  onUpdateRoom: (id: string, name: string, icon: string) => void;
  onDeleteRoom: (id: string) => void;
  onAssignDevice: (roomId: string, entityId: string) => void;
  onUnassignDevice: (entityId: string) => void;
  onRenameDevice: (entityId: string, name: string) => void;
}

export default function HomeAssistantPanel({
  entities, connected, rooms, getDisplayName,
  onToggle, onBrightness, onColor,
  onAddRoom, onUpdateRoom, onDeleteRoom,
  onAssignDevice, onUnassignDevice, onRenameDevice,
}: Props) {
  const [roomModal, setRoomModal] = useState<{ open: boolean; room?: Room }>({ open: false });
  const [renameModal, setRenameModal] = useState<{ open: boolean; entityId: string; name: string }>({ open: false, entityId: '', name: '' });
  const [assignModal, setAssignModal] = useState<{ open: boolean; roomId: string }>({ open: false, roomId: '' });

  const assignedIds = new Set(rooms.flatMap((r) => r.devices));
  const unassigned = entities.filter((e) => !assignedIds.has(e.entity_id));

  function handleRename(entityId: string, currentName: string) {
    setRenameModal({ open: true, entityId, name: currentName });
  }

  return (
    <div style={{ position: 'relative' }}>
      {!connected && (
        <div className="disconnected-overlay">
          <span>⚠ AGENT DESCONECTADO</span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Cômodos & Dispositivos</h2>
        <button className="pihole-btn active" onClick={() => setRoomModal({ open: true })}>
          + Cômodo
        </button>
      </div>

      {rooms.map((room, ri) => {
        const roomEntities = entities.filter((e) => room.devices.includes(e.entity_id));
        const activeCount = roomEntities.filter((e) => e.state === 'on').length;

        return (
          <div key={room.id} className="room-section glass-panel animate-slide-up" style={{ animationDelay: `${ri * 0.08}s` }}>
            <div className="room-header">
              <div className="room-header-left">
                <span className="room-icon">{room.icon}</span>
                <div>
                  <span className="room-name">{room.name}</span>
                  <span className="room-count">
                    {roomEntities.length} dispositivos{activeCount > 0 && ` · ${activeCount} ativo${activeCount > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>
              <div className="room-actions">
                <button className="room-action-btn" onClick={() => setAssignModal({ open: true, roomId: room.id })} title="Gerenciar dispositivos">📱</button>
                <button className="room-action-btn" onClick={() => setRoomModal({ open: true, room })} title="Editar cômodo">⚙</button>
                <button className="room-action-btn danger" onClick={() => onDeleteRoom(room.id)} title="Excluir cômodo">🗑</button>
              </div>
            </div>

            {roomEntities.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                Clique em 📱 para adicionar dispositivos
              </div>
            ) : (
              <div className="room-devices-grid">
                {roomEntities.map((entity) => (
                  <DeviceCard
                    key={entity.entity_id}
                    entity={entity}
                    displayName={getDisplayName(entity)}
                    onToggle={onToggle}
                    onBrightness={onBrightness}
                    onColor={onColor}
                    onRename={handleRename}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="room-section glass-panel animate-slide-up" style={{ animationDelay: `${rooms.length * 0.08}s` }}>
          <div className="room-header">
            <div className="room-header-left">
              <span className="room-icon">📦</span>
              <div>
                <span className="room-name">Sem Cômodo</span>
                <span className="room-count">{unassigned.length} dispositivos não atribuídos</span>
              </div>
            </div>
          </div>
          <div className="room-devices-grid">
            {unassigned.map((entity) => (
              <DeviceCard
                key={entity.entity_id}
                entity={entity}
                displayName={getDisplayName(entity)}
                onToggle={onToggle}
                onBrightness={onBrightness}
                onColor={onColor}
                onRename={handleRename}
              />
            ))}
          </div>
        </div>
      )}

      {entities.length === 0 && rooms.length === 0 && (
        <div className="empty-state glass-panel">
          <div className="empty-state-icon">🏠</div>
          <p>Nenhum dispositivo encontrado</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Verifique a conexão com o Home Assistant
          </p>
        </div>
      )}

      <RoomModal
        isOpen={roomModal.open}
        onClose={() => setRoomModal({ open: false })}
        onSave={(name, icon) => {
          if (roomModal.room) {
            onUpdateRoom(roomModal.room.id, name, icon);
          } else {
            onAddRoom(name, icon);
          }
        }}
        initialName={roomModal.room?.name}
        initialIcon={roomModal.room?.icon}
        title={roomModal.room ? 'Editar Cômodo' : 'Novo Cômodo'}
      />

      <RenameModal
        isOpen={renameModal.open}
        onClose={() => setRenameModal({ open: false, entityId: '', name: '' })}
        onSave={(name) => onRenameDevice(renameModal.entityId, name)}
        currentName={renameModal.name}
        entityId={renameModal.entityId}
      />

      {assignModal.open && (
        <div className="modal-overlay" onClick={() => setAssignModal({ open: false, roomId: '' })}>
          <div className="modal-content glass-panel neon-glow-cyan" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Gerenciar Dispositivos</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Selecione os dispositivos para este cômodo
            </p>
            <div className="assign-list">
              {entities.map((entity) => {
                const room = rooms.find((r) => r.id === assignModal.roomId);
                const isAssigned = room?.devices.includes(entity.entity_id) || false;
                return (
                  <label key={entity.entity_id} className="assign-item">
                    <input
                      type="checkbox"
                      checked={isAssigned}
                      onChange={() => {
                        if (isAssigned) {
                          onUnassignDevice(entity.entity_id);
                        } else {
                          onAssignDevice(assignModal.roomId, entity.entity_id);
                        }
                      }}
                    />
                    <span className="assign-name">{getDisplayName(entity)}</span>
                    <span className="assign-domain">{entity.entity_id.split('.')[0]}</span>
                  </label>
                );
              })}
            </div>
            <div className="modal-actions">
              <button className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} onClick={() => setAssignModal({ open: false, roomId: '' })}>
                Pronto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
