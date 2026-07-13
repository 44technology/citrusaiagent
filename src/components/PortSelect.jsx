import React, { useState, useRef, useEffect } from 'react';
import { Plus, MapPin, X } from 'lucide-react';

/**
 * Port/city autocomplete.
 * - All users: pick from saved list via dropdown.
 * - Super admin: can also type a new entry and save it permanently.
 */
const PortSelect = ({ value, onChange, ports = [], onAddPort, isSuperAdmin, placeholder = 'Select location...' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query.trim()
    ? ports.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : ports;

  const handleSelect = (name) => {
    onChange(name);
    setOpen(false);
    setQuery('');
  };

  const handleClear = () => { onChange(''); setQuery(''); };

  const handleSave = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await onAddPort(newName.trim());
      onChange(newName.trim());
      setNewName('');
      setAdding(false);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Display / trigger */}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 10px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border-glass)',
          borderRadius: 8,
          cursor: 'pointer',
          minHeight: 36,
        }}
        onClick={() => { setOpen(o => !o); setQuery(''); }}
      >
        <MapPin size={13} style={{ color: 'var(--orange-primary)', flexShrink: 0 }} />
        <span style={{
          flex: 1,
          fontSize: '0.84rem',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value || placeholder}
        </span>
        {value && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); handleClear(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0 }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, marginTop: 4,
          background: '#1a1f2e',
          border: '1px solid var(--border-glass)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          maxHeight: 280,
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Search */}
          <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              autoFocus
              className="ui-input"
              placeholder="Search..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onClick={e => e.stopPropagation()}
              style={{ fontSize: '0.82rem', padding: '5px 8px', width: '100%' }}
            />
          </div>

          {/* List */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {ports.length === 0 ? 'No locations saved yet' : 'No match'}
              </div>
            ) : (
              filtered.map(p => (
                <div
                  key={p.id}
                  onClick={() => handleSelect(p.name)}
                  style={{
                    padding: '9px 14px',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: value === p.name ? 'rgba(255,107,0,0.12)' : 'transparent',
                    color: value === p.name ? 'var(--orange-primary)' : 'var(--text-primary)',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                  }}
                  onMouseEnter={e => { if (value !== p.name) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (value !== p.name) e.currentTarget.style.background = 'transparent'; }}
                >
                  <MapPin size={12} style={{ color: 'var(--orange-primary)', flexShrink: 0 }} />
                  {p.name}
                </div>
              ))
            )}
          </div>

          {/* Super admin: add new */}
          {isSuperAdmin && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '8px 10px' }}>
              {adding ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    autoFocus
                    className="ui-input"
                    placeholder="New location name..."
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave(); } }}
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, fontSize: '0.82rem', padding: '5px 8px' }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '5px 10px', fontSize: '0.76rem', flexShrink: 0 }}
                    disabled={saving || !newName.trim()}
                    onClick={e => { e.stopPropagation(); handleSave(); }}
                  >
                    {saving ? '…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-glass"
                    style={{ padding: '5px 8px', fontSize: '0.76rem', flexShrink: 0 }}
                    onClick={e => { e.stopPropagation(); setAdding(false); setNewName(''); }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 8,
                    background: 'rgba(255,107,0,0.06)', border: '1px dashed rgba(255,107,0,0.3)',
                    cursor: 'pointer', color: 'var(--orange-primary)',
                    fontSize: '0.8rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                  onClick={e => { e.stopPropagation(); setAdding(true); }}
                >
                  <Plus size={13} /> Add New Location
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PortSelect;
