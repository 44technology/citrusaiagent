import React, { useState, useEffect, useRef } from 'react';
import { Bell, Search, AlertTriangle, Ship, X } from 'lucide-react';
import { shipmentsApi } from '../services/api';
import '../index.css';

const Header = ({ company }) => {
  const [alerts, setAlerts] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    loadAlerts();
    const t = setInterval(loadAlerts, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [company?.id]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowPanel(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadAlerts = async () => {
    try {
      const ships = await shipmentsApi.getAll();
      const now = new Date();
      const urgent = [];
      (Array.isArray(ships) ? ships : []).forEach(s => {
        if (!s.vesselEta) return;
        const eta = new Date(s.vesselEta);
        const daysLeft = Math.ceil((eta - now) / (1000 * 60 * 60 * 24));
        if (daysLeft >= 0 && daysLeft <= 10) {
          urgent.push({ ...s, daysLeft });
        }
      });
      urgent.sort((a, b) => a.daysLeft - b.daysLeft);
      setAlerts(urgent);
    } catch {}
  };

  const urgentCount = alerts.filter(a => a.daysLeft <= 7).length;
  const totalCount  = alerts.length;

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

        {/* Notification Bell */}
        <div style={{ position: 'relative' }} ref={panelRef}>
          <button className="icon-btn" onClick={() => setShowPanel(v => !v)} style={{ position: 'relative' }}>
            <Bell size={20} />
            {totalCount > 0 ? (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: urgentCount > 0 ? '#ef4444' : '#f59e0b',
                color: '#fff', borderRadius: '50%',
                width: 18, height: 18, fontSize: '0.65rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{totalCount}</span>
            ) : (
              <span className="notification-dot" />
            )}
          </button>

          {showPanel && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0, zIndex: 200,
              width: 340, background: '#1a1f2e',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14,
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)', overflow: 'hidden',
            }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Bell size={15} style={{ color: 'var(--orange-primary)' }} /> ETA Reminders
                </span>
                <button onClick={() => setShowPanel(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                  <X size={14} />
                </button>
              </div>

              {alerts.length === 0 ? (
                <div style={{ padding: '24px 18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  No upcoming ETAs in the next 10 days
                </div>
              ) : (
                <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                  {alerts.map(s => {
                    const is7  = s.daysLeft <= 7;
                    const color = s.daysLeft <= 3 ? '#ef4444' : is7 ? '#f59e0b' : '#94a3b8';
                    const etaStr = new Date(s.vesselEta).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
                    return (
                      <div key={s.id} style={{
                        padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex', gap: 12, alignItems: 'flex-start',
                        background: s.daysLeft <= 3 ? 'rgba(239,68,68,0.05)' : is7 ? 'rgba(245,158,11,0.05)' : 'transparent',
                      }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                          {is7 ? <AlertTriangle size={15} style={{ color }} /> : <Ship size={15} style={{ color }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                            {s.containerNumber || s.bolNumber || '—'} · ETA {etaStr}
                          </div>
                          <div style={{ fontSize: '0.72rem', color, fontWeight: 700, marginTop: 3 }}>
                            {s.daysLeft === 0
                              ? '🚨 ETA today — release documents required!'
                              : s.daysLeft === 1
                              ? '🚨 ETA tomorrow — release documents required!'
                              : s.daysLeft <= 7
                              ? `⚠️ ${s.daysLeft} days to ETA — prepare release documents`
                              : `📋 ${s.daysLeft} days to ETA — check release documents`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
