interface SidebarProps {
  activePanel: string;
  onNavigate: (panel: string) => void;
  connected: boolean;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'system', icon: '⚙', label: 'Sistema' },
  { id: 'pihole', icon: '🛡', label: 'Pi-hole' },
  { id: 'ha', icon: '🏠', label: 'Cômodos' },
  { id: 'sensors', icon: '📡', label: 'Sensores' },
];

export default function Sidebar({ activePanel, onNavigate, connected, onLogout }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo" title="Dash Geral">⛊</div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-btn ${activePanel === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div
          className={`status-dot ${connected ? 'online' : 'offline'}`}
          title={connected ? 'Agent Online' : 'Agent Offline'}
          style={{ margin: '0 auto' }}
        />
        <button
          className="sidebar-btn"
          onClick={onLogout}
          title="Sair"
          style={{ fontSize: '16px' }}
        >
          ⏻
        </button>
      </div>
    </aside>
  );
}
