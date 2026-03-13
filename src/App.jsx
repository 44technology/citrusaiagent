import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import './index.css';

function App() {
  const [activeTab, setActiveTab] = useState('leads');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check for existing token
    const token = localStorage.getItem('citrus_token');
    if (token) {
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      fetch(`${apiBase}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => {
          if (res.ok) {
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('citrus_token');
            localStorage.removeItem('citrus_user');
          }
        })
        .catch(() => {
          // Server might be down, still show login
        })
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogin = (token, username) => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('citrus_token');
    localStorage.removeItem('citrus_user');
    setIsAuthenticated(false);
  };

  if (checking) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <>
      <div className="bg-glow-orange"></div>
      <div className="bg-glow-green"></div>
      
      <div className="app-container">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
        <main className="main-content">
          <Header />
          <div className="scroll-content">
            {(activeTab === 'leads' || activeTab === 'customers') && (
              <Dashboard activeTab={activeTab} />
            )}
            {activeTab === 'analytics' && <div className="placeholder">Analytics Coming Soon</div>}
            {activeTab === 'settings' && <div className="placeholder">Settings Coming Soon</div>}
          </div>
        </main>
      </div>
    </>
  );
}

export default App;
