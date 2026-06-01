interface SidebarProps {
  activePanel: string;
  onNavigate: (panel: string) => void;
  connected: boolean;
  onLogout: () => void;
  isAdmin: boolean;
  username: string;
}

const NAV_ITEMS = [
  { id: 'overview', icon: '📊', label: 'Overview', adminOnly: false },
  { id: 'system', icon: '⚙', label: 'Sistema', adminOnly: false },
  { id: 'pihole', icon: '🛡', label: 'Pi-hole', adminOnly: false },
  { id: 'ha', icon: '🏠', label: 'Cômodos', adminOnly: false },
  { id: 'sensors', icon: '📡', label: 'Sensores', adminOnly: false },
  { id: 'users', icon: '👥', label: 'Usuários', adminOnly: true },
];

export default function Sidebar({ activePanel, onNavigate, connected, onLogout, isAdmin, username }: SidebarProps) {
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || isAdmin);

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" title="Dash Geral">⛊</div>

      <nav className="sidebar-nav">
        {items.map((item) => (
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
        <div className="sidebar-user" title={`${username} (${isAdmin ? 'admin' : 'user'})`}>
          {username.charAt(0).toUpperCase()}
        </div>
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
