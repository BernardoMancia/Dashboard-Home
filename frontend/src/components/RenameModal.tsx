import { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  currentName: string;
  entityId: string;
}

export default function RenameModal({ isOpen, onClose, onSave, currentName, entityId }: Props) {
  const [name, setName] = useState(currentName);

  if (!isOpen) return null;

  function handleSave() {
    onSave(name.trim());
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel neon-glow-cyan" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">Renomear Dispositivo</h3>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginBottom: 16 }}>
          {entityId}
        </p>

        <div className="form-group">
          <label className="form-label">Nome</label>
          <input
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome do dispositivo"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          />
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
