import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import ShipmentTracking from './components/ShipmentTracking';
import './index.css';
import OrdersPage from './pages/OrdersPage';
import AccountingPage from './pages/AccountingPage';
import SettingsPage from './pages/SettingsPage';
import DocumentsPage from './pages/DocumentsPage';

// Protected Route Component
const ProtectedRoute = ({ children, isAuthenticated }) => {
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

function App() {
  const [activeTab, setActiveTab] = useState('leads');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
            // Refresh user info from verify response
            localStorage.setItem('citrus_user', JSON.stringify({
              username: userData.username,
              role: userData.role,
              contactId: userData.contactId
            }));
          }
          else {
            localStorage.removeItem('citrus_token');
            localStorage.removeItem('citrus_user');
          }
        })
        .catch(() => {})
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogin = () => setIsAuthenticated(true);
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

  const Layout = () => (
    <>
      <div className="bg-glow-orange"></div>
      <div className="bg-glow-green"></div>
      <div className="app-container">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
        <main className="main-content">
          <Header />
          <div className="scroll-content">
            {(activeTab === 'leads' || activeTab === 'customers') && <Dashboard activeTab={activeTab} />}
            {activeTab === 'shipments' && <ShipmentTracking />}
            {activeTab === 'orders' && <OrdersPage />}
            {activeTab === 'accounting' && <AccountingPage />}
            {activeTab === 'documents' && <DocumentsPage />}
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
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" /> : <SignupPage />} />
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
