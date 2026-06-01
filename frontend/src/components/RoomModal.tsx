import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, icon: string) => void;
  initialName?: string;
  initialIcon?: string;
  title: string;
}

const ROOM_ICONS = ['🛋️', '🛏️', '🍳', '🚿', '🏢', '🌳', '🚗', '🎮', '🧺', '🏋️', '📚', '🔧'];

export default function RoomModal({ isOpen, onClose, onSave, initialName = '', initialIcon = '🛋️', title }: Props) {
  const [name, setName] = useState(initialName);
  const [icon, setIcon] = useState(initialIcon);

  if (!isOpen) return null;

  function handleSave() {
    if (!name.trim()) return;
    onSave(name.trim(), icon);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel neon-glow-cyan" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>

        <div className="form-group">
          <label className="form-label">Nome do Cômodo</label>
          <input
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Sala, Quarto..."
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label">Ícone</label>
          <div className="icon-picker">
            {ROOM_ICONS.map((ic) => (
              <button
                key={ic}
                className={`icon-option ${icon === ic ? 'active' : ''}`}
                onClick={() => setIcon(ic)}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="pihole-btn" onClick={onClose}>Cancelar</button>
          <button className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }} onClick={handleSave}>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
