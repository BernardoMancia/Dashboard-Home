import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

interface User {
  username: string;
  role: string;
  createdAt: number;
}

interface Props {
  token: string | null;
}

export default function UsersPanel({ token }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<string | null>(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'user' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = useCallback(() => {
    if (!token) return;
    fetch(`${API}/api/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setUsers(data); })
      .catch(() => {});
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function resetForm() {
    setForm({ username: '', password: '', role: 'user' });
    setError('');
    setSuccess('');
    setShowAdd(false);
    setEditUser(null);
  }

  async function handleAdd() {
    if (!form.username.trim() || !form.password.trim()) {
      setError('Username e senha obrigatórios');
      return;
    }
    setError('');
    const res = await fetch(`${API}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setSuccess(`Usuário "${form.username}" criado!`);
    fetchUsers();
    setTimeout(resetForm, 1500);
  }

  async function handleUpdate() {
    if (!editUser) return;
    setError('');
    const body: Record<string, string> = {};
    if (form.password.trim()) body.password = form.password;
    if (form.role) body.role = form.role;

    const res = await fetch(`${API}/api/users/${editUser}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    setSuccess(`Usuário "${editUser}" atualizado!`);
    fetchUsers();
    setTimeout(resetForm, 1500);
  }

  async function handleDelete(username: string) {
    const res = await fetch(`${API}/api/users/${username}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    fetchUsers();
  }

  function openEdit(user: User) {
    setEditUser(user.username);
    setForm({ username: user.username, password: '', role: user.role });
    setShowAdd(false);
    setError('');
    setSuccess('');
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 className="section-title" style={{ margin: 0 }}>Gerenciar Usuários</h2>
        <button className="pihole-btn active" onClick={() => { resetForm(); setShowAdd(true); }}>
          + Novo Usuário
        </button>
      </div>

      <div className="users-grid">
        {users.map((u) => (
          <div key={u.username} className="glass-panel user-card">
            <div className="user-card-header">
              <div className="user-avatar">
                {u.username.charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <span className="user-name">{u.username}</span>
                <span className={`user-role ${u.role}`}>
                  {u.role === 'admin' ? '👑 Admin' : '👤 Usuário'}
                </span>
              </div>
            </div>
            <div className="user-meta">
              Criado em {new Date(u.createdAt).toLocaleDateString('pt-BR')}
            </div>
            <div className="user-actions">
              <button className="room-action-btn" onClick={() => openEdit(u)} title="Editar">⚙</button>
              <button className="room-action-btn danger" onClick={() => handleDelete(u.username)} title="Excluir">🗑</button>
            </div>
          </div>
        ))}
      </div>

      {(showAdd || editUser) && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content glass-panel neon-glow-cyan" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{editUser ? `Editar "${editUser}"` : 'Novo Usuário'}</h3>

            {error && <div className="user-error">{error}</div>}
            {success && <div className="user-success">{success}</div>}

            {!editUser && (
              <div className="form-group">
                <label className="form-label">Username</label>
                <input
                  className="form-input"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="Nome de usuário"
                  autoFocus
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{editUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}</label>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editUser ? '••••••••' : 'Senha'}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Permissão</label>
              <div className="role-picker">
                <button
                  className={`role-option ${form.role === 'user' ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, role: 'user' })}
                >
                  👤 Usuário
                </button>
                <button
                  className={`role-option ${form.role === 'admin' ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, role: 'admin' })}
                >
                  👑 Admin
                </button>
              </div>
            </div>

            <div className="modal-actions">
              <button className="pihole-btn" onClick={resetForm}>Cancelar</button>
              <button className="btn-primary" style={{ width: 'auto', padding: '10px 28px' }}
                onClick={editUser ? handleUpdate : handleAdd}>
                {editUser ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
