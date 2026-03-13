import React from 'react';
import { Bell, Search } from 'lucide-react';
import '../index.css';

const Header = () => {
  return (
    <header className="header glass-panel">
      <div className="header-left">
        <h2>Active Campaign</h2>
        <div className="status-badge">
          <span className="pulse-dot"></span>
          Ready to Call
        </div>
      </div>
      
      <div className="header-right">
        <div className="search-bar">
          <Search size={18} className="search-icon text-muted" />
          <input type="text" placeholder="Search contacts..." className="search-input" />
        </div>
        
        <button className="icon-btn">
          <Bell size={20} />
          <span className="notification-dot"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
