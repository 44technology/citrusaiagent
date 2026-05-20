import { Users, BarChart3, Settings, Citrus, CheckCircle2, LogOut, Truck, ShoppingBag, Receipt, FolderOpen, Leaf } from 'lucide-react';
import '../index.css';

const Sidebar = ({ activeTab, setActiveTab, onLogout }) => {
  const menuItems = [
    { id: 'leads', label: 'Leads', icon: Users },
    { id: 'customers', label: 'Customers', icon: CheckCircle2 },
    { id: 'shipments', label: 'Shipments', icon: Truck },
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'growers', label: 'Growers', icon: Leaf },
    { id: 'accounting', label: 'Accounting', icon: Receipt },
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
          <span className="text-gradient">Citrus</span>AI
        </div>
      </div>

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
