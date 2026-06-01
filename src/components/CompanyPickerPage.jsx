import React from 'react';
import { Building2, ArrowRight } from 'lucide-react';

const COMPANIES = [
  {
    id:    'cmp-wft-0001',
    name:  'WFT',
    slug:  'wft',
    color: '#3b82f6',
    description: 'World Fruit Trading operations, contacts & shipments',
    initials: 'WFT',
  },
  {
    id:    'cmp-sweetfresh-0001',
    name:  'Sweet Fresh',
    slug:  'sweet-fresh',
    color: '#ff6b00',
    description: 'Sweet Fresh citrus orders, customers & logistics',
    initials: 'SF',
  },
];

const CompanyPickerPage = ({ onSelect }) => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-primary)',
      padding: '24px',
    }}>
      {/* Glows */}
      <div className="bg-glow-orange" style={{ opacity: 0.4 }} />
      <div className="bg-glow-green"  style={{ opacity: 0.2 }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 560 }}>
        {/* Logo / Title */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: 'rgba(255,107,0,0.15)',
            border: '2px solid rgba(255,107,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Building2 size={28} style={{ color: 'var(--orange-primary)' }} />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Select Company
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 8, fontSize: '0.9rem' }}>
            Choose which company you want to work in
          </p>
        </div>

        {/* Company Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {COMPANIES.map(co => (
            <button
              key={co.id}
              onClick={() => onSelect(co)}
              style={{
                width: '100%',
                background: 'var(--bg-card)',
                border: `1px solid var(--border-glass)`,
                borderRadius: 16,
                padding: '24px 28px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = co.color;
                e.currentTarget.style.background  = `${co.color}0d`;
                e.currentTarget.style.transform   = 'translateY(-2px)';
                e.currentTarget.style.boxShadow   = `0 8px 32px ${co.color}20`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-glass)';
                e.currentTarget.style.background  = 'var(--bg-card)';
                e.currentTarget.style.transform   = 'translateY(0)';
                e.currentTarget.style.boxShadow   = 'none';
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 56, height: 56, borderRadius: 14, flexShrink: 0,
                background: `${co.color}20`,
                border: `2px solid ${co.color}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1rem', fontWeight: 800, color: co.color, fontFamily: 'monospace',
              }}>
                {co.initials}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {co.name}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  {co.description}
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight size={20} style={{ color: co.color, flexShrink: 0, opacity: 0.7 }} />
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 28 }}>
          You can switch companies anytime from the sidebar.
        </p>
      </div>
    </div>
  );
};

export default CompanyPickerPage;
