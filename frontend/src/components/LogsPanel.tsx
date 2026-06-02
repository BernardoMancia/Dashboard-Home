import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

interface LogEntry {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  entityId?: string;
  domain?: string;
  service?: string;
  serviceData?: Record<string, unknown>;
  detail?: string;
}

interface Props {
  token: string | null;
}

const ACTION_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  login: { icon: '🔑', label: 'Login', color: 'var(--neon-cyan)' },
  device_command: { icon: '⚡', label: 'Comando', color: 'var(--neon-amber)' },
  pihole_toggle: { icon: '🛡', label: 'Pi-hole', color: 'var(--neon-magenta)' },
  user_delete: { icon: '🗑', label: 'Excluir Usuário', color: 'var(--neon-red)' },
};

function formatService(service: string) {
  if (service === 'turn_on') return 'Ligou';
  if (service === 'turn_off') return 'Desligou';
  return service;
}

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'agora';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatFullDate(ts: string) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function getDeviceDescription(log: LogEntry) {
  if (log.action === 'device_command' && log.entityId) {
    const name = log.entityId.split('.').slice(1).join('.').replace(/_/g, ' ');
    const svc = log.service ? formatService(log.service) : '';
    let extra = '';
    if (log.serviceData) {
      if (typeof log.serviceData.brightness === 'number') {
        extra = ` → Brilho ${Math.round((log.serviceData.brightness as number) / 255 * 100)}%`;
      }
      if (log.serviceData.rgb_color) {
        extra += ` → Cor`;
      }
    }
    return `${svc} "${name}"${extra}`;
  }
  if (log.detail) return log.detail;
  return log.action;
}

export default function LogsPanel({ token }: Props) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const fetchLogs = useCallback(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API}/api/logs?limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  useEffect(() => {
    const id = setInterval(fetchLogs, 15000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  const filtered = filter === 'all'
    ? logs
    : logs.filter((l) => l.action === filter);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <div className="logs-header">
        <h2 className="section-title" style={{ margin: 0 }}>Registro de Atividades</h2>
        <div className="logs-filters">
          {[
            { key: 'all', label: '🔄 Todos' },
            { key: 'device_command', label: '⚡ Comandos' },
            { key: 'login', label: '🔑 Logins' },
            { key: 'pihole_toggle', label: '🛡 Pi-hole' },
          ].map((f) => (
            <button
              key={f.key}
              className={`logs-filter-btn ${filter === f.key ? 'active' : ''}`}
              onClick={() => { setFilter(f.key); setPage(0); }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
        </div>
      ) : (
        <div className="logs-list">
          {filtered.map((log) => {
            const meta = ACTION_LABELS[log.action] || { icon: '📌', label: log.action, color: 'var(--text-muted)' };
            return (
              <div key={log.id} className="log-item glass-panel">
                <div className="log-icon" style={{ color: meta.color }}>{meta.icon}</div>
                <div className="log-body">
                  <div className="log-main">
                    <span className="log-user">{log.user}</span>
                    <span className="log-action-badge" style={{ background: meta.color + '1a', color: meta.color }}>
                      {meta.label}
                    </span>
                    <span className="log-desc">{getDeviceDescription(log)}</span>
                  </div>
                  <div className="log-time" title={formatFullDate(log.timestamp)}>
                    {formatTime(log.timestamp)}
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
              Nenhum registro encontrado
            </div>
          )}
        </div>
      )}

      {totalPages > 1 && (
        <div className="logs-pagination">
          <button
            className="logs-page-btn"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Anterior
          </button>
          <span className="logs-page-info">
            {page + 1} / {totalPages}
          </span>
          <button
            className="logs-page-btn"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Próximo →
          </button>
        </div>
      )}
    </div>
  );
}
