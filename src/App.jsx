import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import ShipmentTracking from './components/ShipmentTracking';
import './index.css';
import OrdersPage from './pages/OrdersPage';
import AccountingPage from './pages/AccountingPage';
import SettingsPage from './pages/SettingsPage';
import DocumentsPage from './pages/DocumentsPage';
import GrowersPage from './pages/GrowersPage';
import OutreachPage from './pages/OutreachPage';
import ShipmentsListPage from './pages/ShipmentsListPage';

// Protected Route Component
const ProtectedRoute = ({ children, isAuthenticated }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [activeTab, setActiveTab] = useState('leads');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const DEFAULT_COMPANY = { id: 'cmp-sweetfresh-0001', name: 'Sweet Fresh', slug: 'sweet-fresh', color: '#ff6b00' };
  const [selectedCompany, setSelectedCompany] = useState(() => {
    try { return JSON.parse(localStorage.getItem('citrus_company') || 'null') || DEFAULT_COMPANY; } catch { return DEFAULT_COMPANY; }
  });
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('citrus_token');
    if (token) {
      const apiBase = import.meta.env.VITE_API_URL || '/api';
      fetch(`${apiBase}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(async res => {
          if (res.ok) {
            const userData = await res.json();
            setIsAuthenticated(true);
            localStorage.setItem('citrus_user', JSON.stringify({
              username: userData.username,
              role: userData.role,
              contactId: userData.contactId
            }));
          } else {
            localStorage.removeItem('citrus_token');
            localStorage.removeItem('citrus_user');
            localStorage.removeItem('citrus_company');
          }
        })
        .catch(() => {})
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogin = () => setIsAuthenticated(true);

  const handleCompanySelect = (company) => {
    localStorage.setItem('citrus_company', JSON.stringify(company));
    setSelectedCompany(company);
  };

  const handleSwitchCompany = (co) => {
    localStorage.setItem('citrus_company', JSON.stringify(co));
    setSelectedCompany(co);
  };

  const handleLogout = () => {
    localStorage.removeItem('citrus_token');
    localStorage.removeItem('citrus_user');
    localStorage.removeItem('citrus_company');
    setIsAuthenticated(false);
    setSelectedCompany(null);
  };

  if (checking) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        Loading...
      </div>
    );
  }

  const Layout = () => (
    <>
      <div className="bg-glow-orange"></div>
      <div className="bg-glow-green"></div>
      <div className="app-container">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onLogout={handleLogout}
          company={selectedCompany}
          onSwitchCompany={handleSwitchCompany}
        />
        <main className="main-content">
          <Header company={selectedCompany} />
          <div className="scroll-content" key={selectedCompany?.id}>
            {(activeTab === 'leads' || activeTab === 'customers') && <Dashboard activeTab={activeTab} selectedCompany={selectedCompany} />}
            {activeTab === 'shipments' && <ShipmentsListPage selectedCompany={selectedCompany} />}
            {activeTab === 'tracking' && <ShipmentTracking selectedCompany={selectedCompany} />}
            {activeTab === 'orders' && <OrdersPage selectedCompany={selectedCompany} />}
            {activeTab === 'accounting' && <AccountingPage selectedCompany={selectedCompany} />}
            {activeTab === 'documents' && <DocumentsPage selectedCompany={selectedCompany} />}
            {activeTab === 'growers' && <GrowersPage selectedCompany={selectedCompany} />}
            {activeTab === 'outreach' && <OutreachPage />}
            {activeTab === 'analytics' && <div className="placeholder">Analytics Coming Soon</div>}
            {activeTab === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>
    </>
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage onLogin={handleLogin} />} />
<Route 
          path="/dashboard" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Layout />
            </ProtectedRoute>
          } 
        />
        {/* Redirect Root to Dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
