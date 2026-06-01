import { useState } from 'react';
import { Users, BarChart3, Settings, Citrus, CheckCircle2, LogOut, ShoppingBag, Receipt, FolderOpen, Leaf, Navigation, Mail, ChevronDown } from 'lucide-react';
import '../index.css';

const COMPANIES = [
  { id: 'cmp-sweetfresh-0001', name: 'Sweet Fresh', slug: 'sweet-fresh', color: '#ff6b00' },
  { id: 'cmp-wft-0001',        name: 'WFT',         slug: 'wft',         color: '#3b82f6' },
];

const Sidebar = ({ activeTab, setActiveTab, onLogout, company, onSwitchCompany }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const menuItems = [
    { id: 'leads',      label: 'Leads',      icon: Users },
    { id: 'customers',  label: 'Customers',  icon: CheckCircle2 },
    { id: 'tracking',   label: 'Tracking',   icon: Navigation },
    { id: 'orders',     label: 'Orders',     icon: ShoppingBag },
    { id: 'growers',    label: 'Growers',    icon: Leaf },
    { id: 'accounting', label: 'Accounting', icon: Receipt },
    { id: 'outreach',   label: 'Outreach',   icon: Mail },
    { id: 'documents',  label: 'Documents',  icon: FolderOpen },
    { id: 'analytics',  label: 'Analytics',  icon: BarChart3 },
    { id: 'settings',   label: 'Settings',   icon: Settings },
  ];

  const username = (() => {
    try {
      const uStr = localStorage.getItem('citrus_user');
      return uStr ? (JSON.parse(uStr).username || uStr) : 'Admin';
    } catch { return 'Admin'; }
  })();

  const activeCompany = company || COMPANIES[0];

  const handleSelect = (co) => {
    setDropdownOpen(false);
    if (onSwitchCompany) onSwitchCompany(co);
  };

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

      {/* Backdrop to close dropdown */}
      {dropdownOpen && (
        <div
          onClick={() => setDropdownOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 98 }}
        />
      )}

      {/* Company switcher */}
      <div style={{ margin: '0 12px 8px', position: 'relative', zIndex: 99 }}>
        <button
          onClick={() => setDropdownOpen(v => !v)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 10,
            background: `${activeCompany.color}15`,
            border: `1px solid ${activeCompany.color}40`,
            display: 'flex', alignItems: 'center', gap: 8,
            cursor: 'pointer',
          }}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 7, flexShrink: 0,
            background: `${activeCompany.color}25`,
            border: `1px solid ${activeCompany.color}60`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.6rem', fontWeight: 800, color: activeCompany.color,
            fontFamily: 'monospace',
          }}>
            {activeCompany.name.slice(0, 2).toUpperCase()}
          </div>
          <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 700, color: activeCompany.color, textAlign: 'left' }}>
            {activeCompany.name}
          </span>
          <ChevronDown size={13} style={{ color: activeCompany.color, transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }} />
        </button>

        {dropdownOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
            background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 12, padding: '6px',
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          }}>
            {COMPANIES.map(co => {
              const isActive = co.id === activeCompany.id;
              return (
                <button
                  key={co.id}
                  onClick={() => handleSelect(co)}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: isActive ? `${co.color}18` : 'transparent',
                    border: `1px solid ${isActive ? co.color + '40' : 'transparent'}`,
                    borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontSize: '0.84rem', fontWeight: isActive ? 700 : 500,
                    color: isActive ? co.color : 'var(--text-primary)',
                    marginBottom: 2, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = `${co.color}10`; e.currentTarget.style.borderColor = `${co.color}25`; }}}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}}
                >
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: `${co.color}20`, border: `1px solid ${co.color}50`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.58rem', fontWeight: 800, color: co.color, fontFamily: 'monospace',
                  }}>
                    {co.name.slice(0, 2).toUpperCase()}
                  </div>
                  {co.name}
                  {isActive && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: co.color }}>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => { setDropdownOpen(false); setActiveTab(item.id); }}
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
          <button className="logout-btn" onClick={onLogout} title="Sign Out">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
