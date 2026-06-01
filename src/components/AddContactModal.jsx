import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';

const AddContactModal = ({ isOpen, onClose, onAdd, defaultType = 'Lead' }) => {
  const [name,       setName]       = useState('');
  const [phone,      setPhone]      = useState('');
  const [email,      setEmail]      = useState('');
  const [company,    setCompany]    = useState('');
  const [department, setDepartment] = useState('');
  const [language,   setLanguage]   = useState('English');

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setName(''); setPhone(''); setEmail('');
      setCompany(''); setDepartment(''); setLanguage('English');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) return;
    onAdd({
      id: Date.now().toString(),
      name, phone: phone || 'N/A',
      email: email || 'N/A',
      company: company || 'N/A',
      department: department || 'N/A',
      language, status: 'Pending',
      type: defaultType, credit: 0,
    });
    onClose();
  };

  return (
    <>
      {/* Backdrop — subtle, doesn't block whole screen */}
      {isOpen && (
        <div
          onClick={onClose}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 400, zIndex: 201,
        background: 'var(--bg-card)',
        borderLeft: '1px solid var(--border-glass)',
        boxShadow: '-16px 0 48px rgba(0,0,0,0.4)',
        transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex', alignItems: 'center', gap: 12,
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(255,107,0,0.15)',
            border: '1px solid rgba(255,107,0,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserPlus size={17} style={{ color: 'var(--orange-primary)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Add New Contact</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>{defaultType}</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>NAME *</label>
            <input className="ui-input" placeholder="e.g. John Doe" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>PHONE NUMBER</label>
            <input className="ui-input" placeholder="e.g. +1 234 567 8900" value={phone} onChange={e => setPhone(e.target.value)} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>EMAIL ADDRESS</label>
            <input type="email" className="ui-input" placeholder="e.g. john@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>COMPANY</label>
              <input className="ui-input" placeholder="e.g. Citrus Co." value={company} onChange={e => setCompany(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>DEPARTMENT</label>
              <input className="ui-input" placeholder="e.g. Purchasing" value={department} onChange={e => setDepartment(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>LANGUAGE</label>
            <select className="ui-select" value={language} onChange={e => setLanguage(e.target.value)}>
              <option value="English">English</option>
              <option value="Spanish">Spanish</option>
              <option value="French">French</option>
              <option value="Arabic">Arabic</option>
            </select>
          </div>

          {/* Actions — pinned to bottom */}
          <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-glass" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>Add Contact</button>
          </div>
        </form>
      </div>
    </>
  );
};

export default AddContactModal;
