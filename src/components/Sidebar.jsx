import { Users, BarChart3, Settings, Citrus, CheckCircle2, LogOut, Truck, ShoppingBag, Receipt, FolderOpen, Leaf, List, Navigation, Mail, ArrowLeftRight } from 'lucide-react';
import '../index.css';

const Sidebar = ({ activeTab, setActiveTab, onLogout, company, onSwitchCompany }) => {
  const menuItems = [
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'customers', label: 'Customers', icon: CheckCircle2 },
    { id: 'shipments', label: 'Shipments', icon: List },
    { id: 'tracking', label: 'Tracking', icon: Navigation },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'growers', label: 'Growers', icon: Leaf },
    { id: 'accounting', label: 'Accounting', icon: Receipt },
    { id: 'outreach', label: 'Outreach', icon: Mail },
    { id: 'documents', label: 'Documents', icon: FolderOpen },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const username = (() => {
    try {
      const uStr = localStorage.getItem('citrus_user');
      return uStr ? (JSON.parse(uStr).username || uStr) : 'Admin';
    } catch (e) {
      return localStorage.getItem('citrus_user') || 'Admin';
    }
  })();

  return (
    <aside className="sidebar glass-panel">
      <div className="sidebar-logo">
        <div className="logo-icon-container">
          <Citrus className="logo-icon" size={28} />
        </div>
        <div className="logo-text">
          <span className="text-gradient">Citrus</span> World
        </div>
      </div>

      {/* Company badge */}
      {company && (
        <div style={{
          margin: '0 12px 8px',
          padding: '8px 12px',
          borderRadius: 10,
          background: `${company.color || '#ff6b00'}15`,
          border: `1px solid ${company.color || '#ff6b00'}30`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: `${company.color || '#ff6b00'}25`,
            border: `1px solid ${company.color || '#ff6b00'}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.6rem', fontWeight: 800, color: company.color || '#ff6b00',
            fontFamily: 'monospace',
          }}>
            {company.name?.slice(0,2).toUpperCase()}
          </div>
          <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600, color: company.color || '#ff6b00', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {company.name}
          </span>
          {onSwitchCompany && (
            <button
              onClick={onSwitchCompany}
              title="Switch company"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--text-muted)', display: 'flex' }}
            >
              <ArrowLeftRight size={13} />
            </button>
          )}
        </div>
      )}

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} className={isActive ? 'icon-active' : 'icon-inactive'} />
              <span>{item.label}</span>
              {isActive && <div className="active-indicator" />}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="avatar">{username.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{username}</div>
            <div className="user-role">Admin</div>
          </div>
        </div>
        {onLogout && (
          <button 
            className="logout-btn" 
            onClick={onLogout}
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
