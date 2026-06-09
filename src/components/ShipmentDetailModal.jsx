import React, { useState, useEffect, useRef } from 'react';
import {
  X, Ship, MapPin, Calendar, Anchor, Trash2, Save, Edit3,
  CheckCircle2, Navigation, Package, Thermometer, Droplets,
  Wind, Plus, ChevronRight, Truck, Flag, ArrowRight, AlertTriangle,
  ShieldCheck, FileSearch, Building2, Snowflake, DollarSign, TrendingUp, TrendingDown,
  Search, Paperclip, Upload, Download
} from 'lucide-react';
import { shipmentsApi, ordersApi, documentsApi, contactsApi } from '../services/api';
import { formatDateUTC } from '../utils/dateUtils';

// ─── Shipment Documents ───────────────────────────────────────────────────────

const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const DOC_TYPES = [
  { key: 'SWB',      label: 'Sea Waybill' },
  { key: 'BOL',      label: 'Bill of Lading' },
  { key: 'PL',       label: 'Packing List' },
  { key: 'INV',      label: 'Invoice' },
  { key: 'PO',       label: 'Purchase Order' },
  { key: 'ISF',      label: 'ISF Filing' },
  { key: 'Manifest', label: 'Cargo Manifest' },
  { key: 'Phyto',    label: 'Phytosanitary' },
  { key: 'FA',       label: 'Freight Agreement' },
  { key: 'REL/SWB',  label: 'Release / SWB' },
  { key: 'Photo',    label: 'Container Photo' },
  { key: 'Other',    label: 'Other Document' },
];

const ShipmentDocuments = ({ shipment, canEdit }) => {
  const [docs, setDocs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingType, setPendingType] = useState(null);
  const [uploading, setUploading]   = useState(false);
  const fileInputRef  = useRef();
  const dropdownRef   = useRef();

  // close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const load = async () => {
    try {
      const data = await documentsApi.getAll({ shipmentId: shipment.id });
      setDocs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [shipment.id]);

  const handleTypeSelect = (typeKey) => {
    setPendingType(typeKey);
    setShowDropdown(false);
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !pendingType) return;
    setUploading(true);
    try {
      await documentsApi.upload(file, { shipmentId: shipment.id, category: pendingType });
      await load();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
      setPendingType(null);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      await documentsApi.delete(docId);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDownload = (doc) => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const token   = localStorage.getItem('citrus_token');
    fetch(`${apiBase}/documents/${doc.id}/download`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = doc.originalName;
        a.click();
        URL.revokeObjectURL(a.href);
      })
      .catch(err => alert('Download failed: ' + err.message));
  };

  const uploadedTypes = new Set(docs.map(d => d.category));

  return (
    <div className="glass-panel" style={{ padding: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: docs.length > 0 ? 14 : 0 }}>
        <h4 style={{ margin: 0, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Paperclip size={14} style={{ color: 'var(--orange-primary)' }} />
          Documents
          {docs.length > 0 && (
            <span style={{
              background: 'rgba(255,107,0,0.12)', color: 'var(--orange-primary)',
              padding: '1px 8px', borderRadius: 10, fontSize: '0.7rem', marginLeft: 4
            }}>
              {docs.length}/{DOC_TYPES.length} uploaded
            </span>
          )}
        </h4>

        {canEdit && (
          <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button
              className="btn btn-primary"
              style={{ padding: '5px 10px', fontSize: '0.76rem' }}
              onClick={() => setShowDropdown(v => !v)}
              disabled={uploading}
            >
              <Upload size={12} />
              {uploading ? 'Uploading…' : 'Upload'}
            </button>

            {showDropdown && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 200,
                background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
                borderRadius: 10, padding: '4px 0', minWidth: 210,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}>
                {DOC_TYPES.map(t => {
                  const done = uploadedTypes.has(t.key);
                  return (
                    <button
                      key={t.key}
                      onClick={() => handleTypeSelect(t.key)}
                      style={{
                        width: '100%', textAlign: 'left', background: 'none', border: 'none',
                        padding: '7px 14px', cursor: 'pointer', fontSize: '0.82rem',
                        color: done ? 'var(--text-muted)' : 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,0,0.08)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}
                    >
                      <span>
                        <span style={{
                          fontWeight: 700, fontFamily: 'monospace', fontSize: '0.76rem',
                          marginRight: 8, color: 'var(--orange-primary)'
                        }}>{t.key}</span>
                        {t.label}
                      </span>
                      {done && <CheckCircle2 size={12} style={{ color: '#22c55e', flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileChange} />

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Loading…
        </div>
      ) : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '14px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          No documents uploaded yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {docs.map(doc => {
            const typeInfo = DOC_TYPES.find(t => t.key === doc.category) || { key: doc.category, label: doc.category };
            return (
              <div key={doc.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', background: 'rgba(255,255,255,0.03)',
                borderRadius: 8, border: '1px solid var(--border-glass)',
              }}>
                {/* Type badge */}
                <span style={{
                  fontWeight: 700, fontFamily: 'monospace', fontSize: '0.72rem', flexShrink: 0,
                  background: 'rgba(255,107,0,0.12)', color: 'var(--orange-primary)',
                  padding: '2px 8px', borderRadius: 6,
                }}>{typeInfo.key}</span>

                {/* File info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.83rem', fontWeight: 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }} title={doc.originalName}>
                    {doc.originalName}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 1 }}>
                    {fmtSize(doc.size)} · {new Date(doc.createdAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <button
                  className="btn btn-glass"
                  style={{ padding: '5px 8px', flexShrink: 0 }}
                  onClick={() => handleDownload(doc)}
                  title="Download"
                >
                  <Download size={13} />
                </button>
                {canEdit && (
                  <button
                    className="btn btn-glass"
                    style={{ padding: '5px 8px', color: '#ef4444', flexShrink: 0 }}
                    onClick={() => handleDelete(doc.id)}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Product / Variety options ───────────────────────────────────────────────

const PRODUCTS = {
  'Mandarin': ['Nadorcott', 'W Murcott', 'Clementines', 'Tango', 'Other'],
  'Orange':   ['Navel', 'Valencia', 'Maroc Late', 'Blood Orange', 'Cara Cara', 'Other'],
  'Lemon':    ['Eureka', 'Lisbon', 'Meyer', 'Other'],
  'Lime':     ['Persian', 'Key Lime', 'Other'],
};

// ─── Grower Autocomplete ──────────────────────────────────────────────────────

const GrowerAutocomplete = ({ value, onChange, growers }) => {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState(value || '');
  const ref                 = useRef();

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = growers.filter(g =>
    g.name?.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        className="ui-input"
        style={{ padding: '6px 10px', fontSize: '0.84rem' }}
        placeholder="Search grower…"
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && (query || growers.length > 0) && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          maxHeight: 200, overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No growers found</div>
          ) : filtered.map(g => (
            <button
              key={g.id}
              onMouseDown={e => { e.preventDefault(); onChange(g.name); setQuery(g.name); setOpen(false); }}
              style={{
                width: '100%', textAlign: 'left', background: 'none', border: 'none',
                padding: '8px 12px', cursor: 'pointer', fontSize: '0.83rem',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,107,0,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              {g.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Journey config (Morocco → USA) ──────────────────────────────────────────

const EVENT_TYPES = [
  // Origin
  'Pre-Cooling',
  'Stuffing',
  'Gate In (Port of Agadir)',
  'Customs Cleared (Origin)',
  'Vessel Departed',
  // Sea
  'Transshipment Arrived',
  'Transshipment Departed',
  // USA
  'Vessel Arrived',
  'USDA / APHIS Inspection',
  'CBP Customs Clearance',
  'FDA Hold',
  'Released - Out for Delivery',
  'Delivered to Warehouse',
  // Generic
  'Port Inspection',
  'Delay / Exception',
  'Temperature Excursion',
  'Other',
];

const EVENT_META = {
  'Pre-Cooling':                 { icon: Snowflake,     color: '#818cf8', phase: 'origin' },
  'Stuffing':                    { icon: Package,       color: '#fb923c', phase: 'origin' },
  'Gate In (Port of Agadir)':   { icon: ArrowRight,    color: '#fb923c', phase: 'origin' },
  'Customs Cleared (Origin)':   { icon: CheckCircle2,  color: '#22c55e', phase: 'origin' },
  'Vessel Departed':             { icon: Ship,          color: '#38bdf8', phase: 'sea'    },
  'Transshipment Arrived':      { icon: Anchor,        color: '#a78bfa', phase: 'sea'    },
  'Transshipment Departed':     { icon: Ship,          color: '#a78bfa', phase: 'sea'    },
  'Vessel Arrived':              { icon: Anchor,        color: '#22c55e', phase: 'usa'    },
  'USDA / APHIS Inspection':    { icon: FileSearch,    color: '#fbbf24', phase: 'usa'    },
  'CBP Customs Clearance':      { icon: ShieldCheck,   color: '#fbbf24', phase: 'usa'    },
  'FDA Hold':                    { icon: AlertTriangle, color: '#ef4444', phase: 'usa'    },
  'Released - Out for Delivery': { icon: Truck,         color: '#22c55e', phase: 'usa'    },
  'Delivered to Warehouse':     { icon: Building2,     color: '#22c55e', phase: 'usa'    },
  'Port Inspection':             { icon: FileSearch,    color: '#fbbf24', phase: 'usa'    },
  'Delay / Exception':          { icon: AlertTriangle, color: '#ef4444', phase: 'sea'    },
  'Temperature Excursion':      { icon: Thermometer,   color: '#ef4444', phase: 'sea'    },
  'Other':                       { icon: Navigation,    color: '#94a3b8', phase: 'sea'    },
};

const PHASE_LABELS = {
  origin: { label: '🇲🇦 Morocco',        color: '#fb923c' },
  sea:    { label: '🌊 At Sea',           color: '#38bdf8' },
  usa:    { label: '🇺🇸 USA',             color: '#22c55e' },
};

const CONTAINER_TYPES = ['40RF', '40HC-RF', '20RF', '40DRY', '40HC-DRY', '20DRY'];
const STATUS_OPTIONS  = ['Pending', 'Loading', 'Departed', 'Transshipment', 'In Transit', 'Arrived', 'Customs', 'Delivered'];

const isReefer = (type) => type && type.includes('RF');

// ─── Small helpers ────────────────────────────────────────────────────────────

const Field = ({ label, value, editing, children }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
    {editing
      ? children
      : <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{value ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}</div>}
  </div>
);

const Inp = (props) => <input className="ui-input" style={{ padding: '6px 10px', fontSize: '0.84rem' }} {...props} />;

const Sel = ({ opts, ...props }) => (
  <select className="ui-input" style={{ padding: '6px 10px', fontSize: '0.84rem' }} {...props}>
    <option value="">— None —</option>
    {opts.map(o => <option key={o}>{o}</option>)}
  </select>
);

// ─── Reefer Panel ─────────────────────────────────────────────────────────────

const ReeferPanel = ({ s, editing, ed, set, header }) => {
  const diff = s.reeferTempActual != null && s.reeferTempSet != null
    ? +(s.reeferTempActual - s.reeferTempSet).toFixed(1) : null;
  const tempOk = diff !== null && Math.abs(diff) <= 1.5;

  return (
    <div className="glass-panel" style={{ padding: 14, borderLeft: '3px solid #38bdf8' }}>
      {header || (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Snowflake size={14} style={{ color: '#38bdf8' }} />
        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Reefer Temperature</span>
        {diff !== null && (
          <span style={{
            marginLeft: 'auto', fontSize: '0.72rem', fontWeight: 700, padding: '2px 10px', borderRadius: 10,
            background: tempOk ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
            color: tempOk ? '#22c55e' : '#ef4444'
          }}>
            {tempOk ? '✓ On Target' : `⚠ Δ${diff > 0 ? '+' : ''}${diff}°C`}
          </span>
        )}
      </div>)}
      {editing ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxWidth: 320 }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3 }}>Set Temp (°C)</div>
            <Inp type="number" step="0.1" placeholder="e.g. 6.0" value={ed.reeferTempSet ?? ''} onChange={e => set('reeferTempSet', e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 3 }}>Actual Temp (°C)</div>
            <Inp type="number" step="0.1" placeholder="e.g. 5.8" value={ed.reeferTempActual ?? ''} onChange={e => set('reeferTempActual', e.target.value)} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'Set Temp', val: s.reeferTempSet,    unit: '°C', color: '#38bdf8' },
            { label: 'Actual',   val: s.reeferTempActual, unit: '°C', color: '#f87171' },
          ].map(f => (
            <div key={f.label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 16px' }}>
              <div style={{ fontSize: '0.64rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: f.color }}>
                {f.val != null ? `${f.val}${f.unit}` : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 400 }}>—</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Route Progress Bar ───────────────────────────────────────────────────────

const RouteProgress = ({ shipment, events }) => {
  const phases = [
    { key: 'origin', label: '🇲🇦 Agadir',      done: ['Customs Cleared (Origin)', 'Vessel Departed'] },
    { key: 'sea',    label: '🌊 At Sea',         done: ['Vessel Departed', 'Transshipment Arrived', 'Transshipment Departed'] },
    { key: 'newark', label: '⚓ Newark Port',    done: ['Vessel Arrived', 'CBP Customs Clearance', 'USDA / APHIS Inspection', 'Released - Out for Delivery'] },
    { key: 'final',  label: '🏭 Philadelphia',   done: ['Delivered to Warehouse'] },
  ];
  const eventTypes = new Set(events.map(e => e.eventType));
  let activeIdx = -1;
  phases.forEach((p, i) => { if (p.done.some(t => eventTypes.has(t))) activeIdx = i; });

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', gap: 3, marginBottom: 4 }}>
      {phases.map((p, i) => {
        const done   = i < activeIdx;
        const active = i === activeIdx;
        return (
          <div key={p.key} style={{
            flex: 1, padding: '7px 8px', borderRadius: 7, textAlign: 'center',
            background: done ? 'rgba(34,197,94,0.15)' : active ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : active ? 'rgba(255,107,0,0.35)' : 'var(--border-glass)'}`,
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: done ? '#22c55e' : active ? 'var(--orange-primary)' : 'var(--text-muted)' }}>
              {done ? '✓ ' : active ? '● ' : ''}{p.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Add Event Modal ──────────────────────────────────────────────────────────

const LOCATION_HINTS = {
  'Pre-Cooling':                 'Packhouse / Cold Store, Agadir, Morocco',
  'Stuffing':                    'Packhouse, Agadir, Morocco',
  'Gate In (Port of Agadir)':   'Port of Agadir, Morocco',
  'Customs Cleared (Origin)':   'Port of Agadir, Morocco',
  'Vessel Departed':             'Port of Agadir, Morocco',
  'Transshipment Arrived':      'Port of Algeciras, Spain',
  'Transshipment Departed':     'Port of Algeciras, Spain',
  'Vessel Arrived':              'Port of Newark, NJ, USA',
  'USDA / APHIS Inspection':    'Port of Newark, NJ, USA',
  'CBP Customs Clearance':      'Port of Newark, NJ, USA',
  'FDA Hold':                    'Port of Newark, NJ, USA',
  'Released - Out for Delivery': 'Newark, NJ, USA',
  'Delivered to Warehouse':     'Philadelphia, PA, USA',
  'Port Inspection':             'Port of Newark, NJ, USA',
};

const AddEventModal = ({ shipmentId, destination, onClose, onSaved }) => {
  const [form, setForm] = useState({
    eventType: 'Gate In (Port of Agadir)',
    location: LOCATION_HINTS['Gate In (Port of Agadir)'],
    description: '',
    eventDate: new Date().toISOString().slice(0, 10),
    tempReading: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === 'eventType') {
      next.location = k === 'eventType' && v === 'Delivered to Warehouse'
        ? (destination || LOCATION_HINTS[v] || '')
        : (LOCATION_HINTS[v] || '');
    }
    return next;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.location) { setError('Location is required'); return; }
    setSaving(true);
    try {
      await shipmentsApi.createEvent(shipmentId, form);
      onSaved();
    } catch (err) { setError(err.message); setSaving(false); }
  };

  const meta = EVENT_META[form.eventType] || { icon: Ship, color: 'var(--orange-primary)' };
  const Icon = meta.icon;

  const GROUPED = [
    { header: '🇲🇦 Morocco (Origin)', types: EVENT_TYPES.slice(0, 5) },
    { header: '🌊 At Sea',            types: EVENT_TYPES.slice(5, 7) },
    { header: '🇺🇸 USA — Newark → Philadelphia', types: EVENT_TYPES.slice(7, 13) },
    { header: 'Other',               types: EVENT_TYPES.slice(13) },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Icon size={16} style={{ color: meta.color }} /> Add Journey Event
          </h3>
          <button className="btn btn-glass" style={{ padding: '5px 7px' }} onClick={onClose}><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>Event Type</div>
            <select className="ui-input" value={form.eventType} onChange={e => set('eventType', e.target.value)}>
              {GROUPED.map(g => (
                <optgroup key={g.header} label={g.header}>
                  {g.types.map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>Location *</div>
            <Inp placeholder="City, Port, Country" value={form.location} onChange={e => set('location', e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>Date *</div>
              <Inp type="date" value={form.eventDate} onChange={e => set('eventDate', e.target.value)} required />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>Temp Reading (°C)</div>
              <Inp type="number" step="0.1" placeholder="e.g. 5.8" value={form.tempReading} onChange={e => set('tempReading', e.target.value)} />
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 3 }}>Notes</div>
            <textarea className="ui-input" rows={2} style={{ resize: 'vertical', fontSize: '0.84rem' }}
              placeholder="e.g. USDA released, no holds. Reefer temp OK at 5.8°C."
              value={form.description} onChange={e => set('description', e.target.value)} />
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '0.8rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon size={13} />{saving ? 'Saving…' : 'Add Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Journey Timeline ─────────────────────────────────────────────────────────

const JourneyTimeline = ({ shipment, events, onAdd, onDelete, canEdit }) => {
  const grouped = { origin: [], sea: [], usa: [] };
  events.forEach(ev => {
    const phase = EVENT_META[ev.eventType]?.phase || 'sea';
    grouped[phase].push(ev);
  });

  return (
    <div className="glass-panel" style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h4 style={{ margin: 0, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Navigation size={14} style={{ color: 'var(--orange-primary)' }} />
          Journey Log
          <span style={{ background: 'rgba(255,107,0,0.12)', color: 'var(--orange-primary)', padding: '1px 8px', borderRadius: 10, fontSize: '0.7rem', marginLeft: 4 }}>
            {events.length} events
          </span>
        </h4>
        {canEdit && (
          <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.78rem' }} onClick={onAdd}>
            <Plus size={13} /> Add Event
          </button>
        )}
      </div>

      {/* Route strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 16, padding: '9px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, flexWrap: 'wrap', fontSize: '0.82rem' }}>
        <MapPin size={12} style={{ color: '#fb923c' }} />
        <strong>{shipment.portOfLoading || 'Port of Agadir'}</strong>
        {shipment.transshipmentPort && (
          <><ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: '#a78bfa' }}>{shipment.transshipmentPort}</span></>
        )}
        <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
        <Anchor size={11} style={{ color: '#38bdf8' }} />
        <strong style={{ color: '#38bdf8' }}>{shipment.portOfDischarge || 'Port of Newark, NJ'}</strong>
        <ChevronRight size={11} style={{ color: 'var(--text-muted)' }} />
        <Building2 size={11} style={{ color: '#22c55e' }} />
        <strong style={{ color: '#22c55e' }}>{shipment.destination || 'Philadelphia, PA'}</strong>
        {shipment.vesselEta && (
          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            ETA <strong style={{ color: 'var(--orange-primary)' }}>{formatDateUTC(shipment.vesselEta)}</strong>
          </span>
        )}
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
          No events recorded yet. Click "Add Event" to start tracking.
        </div>
      ) : (
        ['origin', 'sea', 'usa'].map(phase => {
          const phaseEvs = grouped[phase];
          if (!phaseEvs.length) return null;
          const ph = PHASE_LABELS[phase];
          return (
            <div key={phase} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.07)' }} />
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: ph.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{ph.label}</span>
                <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.07)' }} />
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: 16, top: 20, bottom: 16, width: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 1 }} />
                {phaseEvs.map((ev, idx) => {
                  const meta = EVENT_META[ev.eventType] || { icon: Ship, color: '#94a3b8' };
                  const Icon = meta.icon;
                  const isAlert = ['FDA Hold', 'Temperature Excursion', 'Delay / Exception'].includes(ev.eventType);
                  return (
                    <div key={ev.id} style={{ display: 'flex', gap: 11, marginBottom: idx < phaseEvs.length - 1 ? 14 : 4, position: 'relative' }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', flexShrink: 0, zIndex: 1,
                        background: `${meta.color}18`, border: `2px solid ${meta.color}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <Icon size={13} style={{ color: meta.color }} />
                      </div>
                      <div style={{ flex: 1, paddingTop: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.84rem', color: isAlert ? '#ef4444' : meta.color }}>
                              {ev.eventType}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2, flexWrap: 'wrap' }}>
                              <MapPin size={10} style={{ color: 'var(--text-muted)' }} />
                              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{ev.location}</span>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>·</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {new Date(ev.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              {ev.tempReading != null && (
                                <>
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>·</span>
                                  <Thermometer size={10} style={{ color: '#38bdf8' }} />
                                  <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>{ev.tempReading}°C</span>
                                </>
                              )}
                            </div>
                            {ev.description && (
                              <div style={{ marginTop: 3, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{ev.description}</div>
                            )}
                          </div>
                          {canEdit && (
                            <button className="btn btn-glass" style={{ padding: '3px 6px', color: '#ef4444', flexShrink: 0 }}
                              onClick={() => onDelete(ev.id)}>
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

// ─── Expenses & Revenue Panel ────────────────────────────────────────────────

const EXPENSE_TYPES = [
  { value: 'PurchaseOfGoods', label: 'Purchase of Goods', desc: 'Box Qty × Box Price' },
  { value: 'Tariff',          label: 'Tariff (10%)',       desc: '% of Purchase of Goods' },
  { value: 'Customs',         label: 'Customs',            desc: 'Manual entry' },
  { value: 'TerminalExamFee', label: 'Terminal Exam Fee',  desc: '' },
  { value: 'USDAExamFee',     label: 'USDA Exam Fee',      desc: 'Invoice number required' },
  { value: 'Revenue',         label: 'Revenue',            desc: 'Income entry' },
  { value: 'Other',           label: 'Other',              desc: '' },
];

const AddExpenseModal = ({ shipmentId, expenses, onClose, onSaved }) => {
  const [type, setType]         = useState('PurchaseOfGoods');
  const [description, setDesc]  = useState('');
  const [amount, setAmount]     = useState('');
  const [boxQty, setBoxQty]     = useState('');
  const [boxPrice, setBoxPrice] = useState('');
  const [tariffPct, setTariffPct] = useState('10');
  const [invoiceNum, setInvoiceNum] = useState('');
  const [isRevenue, setIsRevenue] = useState(false);
  const [saving, setSaving]     = useState(false);

  // Auto-calculate Tariff based on existing PurchaseOfGoods
  useEffect(() => {
    if (type === 'Tariff') {
      const pog = expenses.find(e => e.type === 'PurchaseOfGoods');
      if (pog) {
        const calc = ((pog.amount || 0) * (parseFloat(tariffPct) || 10) / 100).toFixed(2);
        setAmount(calc);
      }
    }
    if (type === 'Revenue') setIsRevenue(true);
    else if (type !== 'Other') setIsRevenue(false);
  }, [type, tariffPct]);

  useEffect(() => {
    if (type === 'PurchaseOfGoods' && boxQty && boxPrice) {
      setAmount((parseFloat(boxQty) * parseFloat(boxPrice)).toFixed(2));
    }
  }, [boxQty, boxPrice, type]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await shipmentsApi.createExpense(shipmentId, {
        type, description, amount, boxQuantity: boxQty, boxPrice,
        tariffPercent: tariffPct, invoiceNumber: invoiceNum, isRevenue
      });
      onSaved();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  const sel = EXPENSE_TYPES.find(t => t.value === type);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <DollarSign size={16} className="text-orange" /> Add Expense / Revenue
          </h4>
          <button className="icon-btn-small" onClick={onClose}><X size={16} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>TYPE</label>
            <select className="ui-select" value={type} onChange={e => setType(e.target.value)} style={{ width: '100%' }}>
              {EXPENSE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}{t.desc ? ` — ${t.desc}` : ''}</option>)}
            </select>
          </div>

          {type === 'PurchaseOfGoods' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>BOX QTY</label>
                <input type="number" className="ui-input" placeholder="0" value={boxQty} onChange={e => setBoxQty(e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>BOX PRICE ($)</label>
                <input type="number" className="ui-input" placeholder="0.00" step="0.01" value={boxPrice} onChange={e => setBoxPrice(e.target.value)} />
              </div>
            </div>
          )}

          {type === 'Tariff' && (
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>TARIFF %</label>
              <input type="number" className="ui-input" value={tariffPct} onChange={e => setTariffPct(e.target.value)} style={{ width: '100%' }} />
            </div>
          )}

          {type === 'USDAExamFee' && (
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>INVOICE NUMBER</label>
              <input className="ui-input" placeholder="Invoice #" value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} style={{ width: '100%' }} />
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              AMOUNT ($){type === 'PurchaseOfGoods' ? ' (auto-calculated)' : type === 'Tariff' ? ' (auto-calculated)' : ''}
            </label>
            <input type="number" className="ui-input" placeholder="0.00" step="0.01"
              value={amount} onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', background: (type === 'PurchaseOfGoods' || type === 'Tariff') ? 'rgba(255,107,0,0.06)' : undefined }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>DESCRIPTION (optional)</label>
            <input className="ui-input" placeholder="Notes..." value={description} onChange={e => setDesc(e.target.value)} style={{ width: '100%' }} />
          </div>

          {type === 'Other' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={isRevenue} onChange={e => setIsRevenue(e.target.checked)} />
              Mark as Revenue (income)
            </label>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn-glass" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Add Entry'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExpensesPanel = ({ shipment, canEdit }) => {
  const [expenses, setExpenses] = useState(shipment.expenses || []);
  const [showAdd, setShowAdd]   = useState(false);

  const reload = async () => {
    try {
      const fresh = await shipmentsApi.getExpenses(shipment.id);
      setExpenses(fresh);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (expId) => {
    if (!window.confirm('Delete this entry?')) return;
    try { await shipmentsApi.deleteExpense(shipment.id, expId); setExpenses(p => p.filter(e => e.id !== expId)); }
    catch (err) { alert(err.message); }
  };

  const totalExpenses = expenses.filter(e => !e.isRevenue).reduce((s, e) => s + (e.amount || 0), 0);
  const totalRevenue  = expenses.filter(e => e.isRevenue).reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit     = totalRevenue - totalExpenses;

  const typeLabel = (t) => EXPENSE_TYPES.find(x => x.value === t)?.label || t;

  return (
    <div className="glass-panel" style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h4 style={{ margin: 0, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <DollarSign size={14} style={{ color: 'var(--orange-primary)' }} />
          Expenses & Revenue
        </h4>
        {canEdit && (
          <button className="btn btn-primary" style={{ padding: '5px 10px', fontSize: '0.76rem' }} onClick={() => setShowAdd(true)}>
            <Plus size={12} /> Add Entry
          </button>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Total Expenses', value: totalExpenses, color: '#ef4444', icon: TrendingDown },
          { label: 'Total Revenue',  value: totalRevenue,  color: '#22c55e', icon: TrendingUp },
          { label: 'Net Profit',     value: netProfit,     color: netProfit >= 0 ? '#22c55e' : '#ef4444', icon: DollarSign },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color }}>${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
        ))}
      </div>

      {expenses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No entries yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {expenses.map(exp => (
            <div key={exp.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: exp.isRevenue ? '#22c55e' : '#f59e0b', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{typeLabel(exp.type)}</div>
                {exp.type === 'PurchaseOfGoods' && exp.boxQuantity && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{exp.boxQuantity} boxes × ${exp.boxPrice}</div>
                )}
                {exp.type === 'USDAExamFee' && exp.invoiceNumber && (
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Invoice: {exp.invoiceNumber}</div>
                )}
                {exp.description && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{exp.description}</div>}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: exp.isRevenue ? '#22c55e' : 'var(--text-primary)', flexShrink: 0 }}>
                {exp.isRevenue ? '+' : ''} ${(exp.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              {canEdit && (
                <button onClick={() => handleDelete(exp.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, opacity: 0.6 }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddExpenseModal
          shipmentId={shipment.id}
          expenses={expenses}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); reload(); }}
        />
      )}
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

const ShipmentDetailModal = ({ isOpen, onClose, shipment, onUpdate, onDelete, embedded = false }) => {
  const [isEditing, setIsEditing]       = useState(false);
  const [editingSection, setEditingSection] = useState(null); // 'cargo' | 'ports' | 'reefer'
  const [ed, setEd]               = useState(null);
  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(false);
  const [showAdd, setShowAdd]     = useState(false);
  const [orders, setOrders]       = useState([]);
  const [growers, setGrowers]     = useState([]);
  const [refIdInput, setRefIdInput] = useState('');
  const [matchedOrder, setMatchedOrder] = useState(null);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('citrus_user') || '{}'); } catch { return {}; }
  })();
  const canEdit    = ['admin', 'operation', 'super admin', 'logistics', 'sales'].includes(currentUser.role);
  const isSuperAdmin = currentUser.role === 'super admin';

  useEffect(() => {
    ordersApi.getAll().then(setOrders).catch(() => {});
    contactsApi.getAll('Grower').then(setGrowers).catch(() => {});
  }, []);

  useEffect(() => {
    if (!shipment) return;
    setEd({
      label: shipment.label || '', origin: shipment.origin || '',
      destination: shipment.destination || '', vesselName: shipment.vesselName || '',
      containerNumber: shipment.containerNumber || '', bolNumber: shipment.bolNumber || '',
      vesselEta: shipment.vesselEta?.split('T')[0] || '',
      vesselDeparture: shipment.vesselDeparture?.split('T')[0] || '',
      vesselArrival: shipment.vesselArrival?.split('T')[0] || '',
      shippingLine: shipment.shippingLine || '', status: shipment.status || 'Pending',
      notes: shipment.notes || '',
      portOfLoading: shipment.portOfLoading || '',
      portOfDischarge: shipment.portOfDischarge || '',
      transshipmentPort: shipment.transshipmentPort || '',
      containerType: shipment.containerType || '', sealNumber: shipment.sealNumber || '',
      grower: shipment.grower || '',
      variety: shipment.variety || '',
      cargoDescription: shipment.cargoDescription || '',
      grossWeight: shipment.grossWeight ?? '', numberOfBoxes: shipment.numberOfBoxes ?? '',
      reeferTempSet: shipment.reeferTempSet ?? '', reeferTempActual: shipment.reeferTempActual ?? '',
      humidity: shipment.humidity ?? '', ventilation: shipment.ventilation ?? '',
      co2Level: shipment.co2Level ?? '',
      advancePaymentStatus: shipment.advancePaymentStatus || '',
      referenceId: shipment.shipmentRefId || shipment.order?.referenceId || '',
      orderId: shipment.orderId || '',
      soNumber: shipment.soNumber || '',
    });
    setRefIdInput(shipment.order?.referenceId ? String(shipment.order.referenceId) : (shipment.shipmentRefId || ''));
    setMatchedOrder(shipment.order || null);
    setEvents(shipment.events || []);
    setIsEditing(false);
  }, [shipment]);

  if (!isOpen || !shipment || !ed) return null;

  const set = (k, v) => setEd(p => ({ ...p, [k]: v }));

  const handleRefIdSearch = (val) => {
    setRefIdInput(val);
    setMatchedOrder(null);
    setEd(p => ({ ...p, orderId: '' }));
    if (!val.trim()) return;
    const found = orders.find(o => String(o.referenceId).toLowerCase() === val.trim().toLowerCase());
    if (found) {
      setMatchedOrder(found);
      setEd(p => ({ ...p, orderId: found.id }));
    }
  };

  const handleSave = async (section = null) => {
    setLoading(true);
    try {
      const updated = await shipmentsApi.update(shipment.id, ed);
      onUpdate(updated); setEvents(updated.events || []);
      setIsEditing(false);
      setEditingSection(null);
    } catch (err) { alert('Save failed: ' + err.message); }
    finally { setLoading(false); }
  };

  // Per-section edit header helper
  const SectionHeader = ({ label, section }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--orange-primary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
      {canEdit && (
        editingSection === section ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-glass" style={{ padding: '3px 10px', fontSize: '0.75rem' }} onClick={() => setEditingSection(null)}>Cancel</button>
            <button className="btn btn-primary" style={{ padding: '3px 10px', fontSize: '0.75rem' }} onClick={() => handleSave(section)} disabled={loading}>
              <Save size={11} /> {loading ? '…' : 'Save'}
            </button>
          </div>
        ) : (
          <button className="btn btn-glass" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => setEditingSection(section)}>
            <Edit3 size={11} /> Edit
          </button>
        )
      )}
    </div>
  );

  const handleDelete = async () => {
    if (!window.confirm('Delete this shipment and all its journey events?')) return;
    try { await shipmentsApi.delete(shipment.id); onDelete(shipment.id); onClose(); }
    catch (err) { alert('Delete failed: ' + err.message); }
  };

  const refreshEvents = async () => {
    try {
      const fresh = await shipmentsApi.getOne(shipment.id);
      setEvents(fresh.events || []); onUpdate(fresh);
    } catch (err) { console.error(err); }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Delete this journey event?')) return;
    try { await shipmentsApi.deleteEvent(shipment.id, eventId); setEvents(p => p.filter(e => e.id !== eventId)); }
    catch (err) { alert('Delete failed: ' + err.message); }
  };

  const showReefer = isReefer(isEditing ? ed.containerType : shipment.containerType) || !shipment.containerType;

  return (
    <>
      <div className={embedded ? '' : 'modal-overlay'} onClick={embedded ? undefined : onClose}>
        <div onClick={e => e.stopPropagation()}
          style={embedded ? { padding: 0 } : { maxWidth: 800, width: '96%', maxHeight: '92vh', overflowY: 'auto', padding: 0, background: 'var(--bg-card)', borderRadius: 16 }}>

          {/* Sticky header — hidden in embedded mode (drawer has its own) */}
          {!embedded && <div style={{
            padding: '13px 18px', borderBottom: '1px solid var(--border-glass)',
            display: 'flex', alignItems: 'center', gap: 10,
            position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 20
          }}>
            <Ship size={16} style={{ color: 'var(--orange-primary)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.94rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {shipment.label}
              </div>
              <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {[shipment.containerNumber, shipment.containerType, shipment.shippingLine].filter(Boolean).join(' · ')}
                {shipment.order?.referenceId && (
                  <span style={{ background: 'rgba(255,107,0,0.15)', color: 'var(--orange-primary)', borderRadius: 6, padding: '1px 8px', fontWeight: 700, fontSize: '0.72rem' }}>
                    REF #{shipment.order.referenceId}
                  </span>
                )}
              </div>
            </div>
            {!isEditing && (
              <span style={{
                padding: '3px 12px', borderRadius: 20, fontSize: '0.74rem', fontWeight: 600, flexShrink: 0,
                background: shipment.status === 'Delivered' ? 'rgba(34,197,94,0.2)' : shipment.status === 'Arrived' ? 'rgba(16,185,129,0.15)' : shipment.status === 'Customs' ? 'rgba(249,115,22,0.15)' : shipment.status === 'In Transit' ? 'rgba(6,182,212,0.15)' : shipment.status === 'Transshipment' ? 'rgba(139,92,246,0.15)' : shipment.status === 'Departed' ? 'rgba(59,130,246,0.15)' : shipment.status === 'Loading' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.07)',
                color: shipment.status === 'Delivered' ? '#22c55e' : shipment.status === 'Arrived' ? '#10b981' : shipment.status === 'Customs' ? '#f97316' : shipment.status === 'In Transit' ? '#06b6d4' : shipment.status === 'Transshipment' ? '#8b5cf6' : shipment.status === 'Departed' ? '#3b82f6' : shipment.status === 'Loading' ? '#f59e0b' : 'var(--text-muted)',
              }}>{shipment.status}</span>
            )}
            {canEdit && (isEditing ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-glass" style={{ fontSize: '0.78rem', padding: '5px 10px' }} onClick={() => setIsEditing(false)}>Cancel</button>
                <button className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '5px 10px' }} onClick={handleSave} disabled={loading}>
                  <Save size={12} />{loading ? 'Saving…' : 'Save'}
                </button>
              </div>
            ) : (
              <button className="btn btn-glass" style={{ fontSize: '0.78rem', padding: '5px 10px' }} onClick={() => setIsEditing(true)}>
                <Edit3 size={12} /> Edit
              </button>
            ))}
            <button className="btn btn-glass" style={{ padding: '5px 7px' }} onClick={onClose}><X size={14} /></button>
          </div>}

          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>


            {/* Progress bar — only in non-embedded modal */}
            {!embedded && <RouteProgress shipment={shipment} events={events} />}

            {/* Container & Cargo */}
            <div className="glass-panel" style={{ padding: 14 }}>
              <SectionHeader label="Container & Cargo" section="cargo" />

              {/* Linked Order — REF ID */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Linked Order (Ref ID)</div>
                {isEditing ? (
                  <div>
                    {/* REF ID search input */}
                    <div style={{ position: 'relative', marginBottom: 6 }}>
                      <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        className="ui-input"
                        placeholder="Type REF ID to auto-link…"
                        value={refIdInput}
                        onChange={e => handleRefIdSearch(e.target.value)}
                        style={{ paddingLeft: 30, padding: '6px 10px 6px 30px', fontSize: '0.84rem', width: '100%' }}
                      />
                    </div>
                    {/* Match feedback */}
                    {refIdInput && matchedOrder && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 7, fontSize: '0.74rem', color: '#22c55e', marginBottom: 6 }}>
                        <CheckCircle2 size={12} /> <strong>#{matchedOrder.referenceId}</strong> — {[matchedOrder.product, matchedOrder.variety].filter(Boolean).join(' ')} · {matchedOrder.boxQuantity} boxes
                      </div>
                    )}
                    {refIdInput && !matchedOrder && (
                      <div style={{ fontSize: '0.74rem', color: '#f87171', marginBottom: 6 }}>No order found — select from list:</div>
                    )}
                    {/* Manual dropdown fallback */}
                    <select className="ui-input" value={ed.orderId}
                      onChange={e => {
                        const o = orders.find(x => x.id === e.target.value);
                        if (o) { setMatchedOrder(o); setRefIdInput(String(o.referenceId)); }
                        else { setMatchedOrder(null); setRefIdInput(''); }
                        set('orderId', e.target.value);
                      }}
                      style={{ padding: '6px 10px', fontSize: '0.84rem', width: '100%' }}>
                      <option value="">— No order link —</option>
                      {orders.map(o => (
                        <option key={o.id} value={o.id}>#{o.referenceId} — {o.product} {o.variety} ({o.boxQuantity} boxes)</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                    {shipment.order
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ background: 'rgba(255,107,0,0.15)', color: 'var(--orange-primary)', borderRadius: 6, padding: '2px 10px', fontWeight: 700, fontSize: '0.82rem', fontFamily: 'monospace' }}>
                            REF #{shipment.order.referenceId}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                            {[shipment.order.product, shipment.order.variety].filter(Boolean).join(' ')} · {shipment.order.boxQuantity} boxes
                          </span>
                        </span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {/* Reference ID — independent from order */}
                <Field
                  label="Reference ID"
                  editing={editingSection === 'cargo'}
                  value={
                    (shipment.shipmentRefId || shipment.order?.referenceId)
                      ? <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--orange-primary)' }}>
                          #{shipment.shipmentRefId || shipment.order?.referenceId}
                        </span>
                      : null
                  }
                >
                  <Inp
                    placeholder="e.g. 260001"
                    value={ed.referenceId}
                    onChange={e => set('referenceId', e.target.value)}
                  />
                </Field>

                <Field label="Container #" value={shipment.containerNumber} editing={editingSection === 'cargo'}>
                  <Inp placeholder="e.g. CMAU1234567" value={ed.containerNumber} onChange={e => set('containerNumber', e.target.value)} />
                </Field>
                <Field label="Container Type" value={shipment.containerType} editing={editingSection === 'cargo'}>
                  <Sel opts={CONTAINER_TYPES} value={ed.containerType} onChange={e => set('containerType', e.target.value)} />
                </Field>
                <Field label="Seal #" value={shipment.sealNumber} editing={editingSection === 'cargo'}>
                  <Inp placeholder="Seal number" value={ed.sealNumber} onChange={e => set('sealNumber', e.target.value)} />
                </Field>
                <Field label="Grower" value={shipment.grower} editing={editingSection === 'cargo'}>
                  <GrowerAutocomplete
                    value={ed.grower}
                    onChange={v => set('grower', v)}
                    growers={growers}
                  />
                </Field>
                <Field label="Variety" value={shipment.variety} editing={editingSection === 'cargo'}>
                  <select
                    className="ui-input"
                    style={{ padding: '6px 10px', fontSize: '0.84rem' }}
                    value={ed.variety}
                    onChange={e => set('variety', e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {Object.entries(PRODUCTS).map(([product, varieties]) => (
                      <optgroup key={product} label={product}>
                        {varieties.map(v => <option key={v} value={v}>{v}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <Field label="Cargo" value={shipment.cargoDescription} editing={editingSection === 'cargo'}>
                  <Inp placeholder="e.g. Citrus - Clementines" value={ed.cargoDescription} onChange={e => set('cargoDescription', e.target.value)} />
                </Field>
                <Field label="Gross Weight" value={shipment.grossWeight ? `${Number(shipment.grossWeight).toLocaleString()} kg` : null} editing={editingSection === 'cargo'}>
                  <Inp type="number" placeholder="kg" value={ed.grossWeight} onChange={e => set('grossWeight', e.target.value)} />
                </Field>
                <Field label="Number of Boxes" value={shipment.numberOfBoxes?.toLocaleString()} editing={editingSection === 'cargo'}>
                  <Inp type="number" placeholder="e.g. 1120" value={ed.numberOfBoxes} onChange={e => set('numberOfBoxes', e.target.value)} />
                </Field>
                <Field label="SU (BC SO#)" value={shipment.soNumber} editing={editingSection === 'cargo'}>
                  <Inp placeholder="e.g. SO-12345" value={ed.soNumber} onChange={e => set('soNumber', e.target.value)} />
                </Field>

                {/* Advance Payment Status — spans full row */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <Field
                    label="Advance Payment Status"
                    editing={editingSection === 'cargo'}
                    value={
                      shipment.advancePaymentStatus
                        ? <span style={{
                            padding: '2px 10px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 600,
                            background: {
                              'Paid':         'rgba(34,197,94,0.15)',
                              'Requested':    'rgba(59,130,246,0.15)',
                              'Pending':      'rgba(245,158,11,0.15)',
                              'Not Required': 'rgba(255,255,255,0.06)',
                            }[shipment.advancePaymentStatus] || 'rgba(255,255,255,0.06)',
                            color: {
                              'Paid':         '#22c55e',
                              'Requested':    '#3b82f6',
                              'Pending':      '#f59e0b',
                              'Not Required': 'var(--text-muted)',
                            }[shipment.advancePaymentStatus] || 'var(--text-muted)',
                          }}>
                            {shipment.advancePaymentStatus}
                          </span>
                        : null
                    }
                  >
                    <Sel
                      opts={['Pending', 'Requested', 'Paid', 'Not Required']}
                      value={ed.advancePaymentStatus}
                      onChange={e => set('advancePaymentStatus', e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Reefer */}
            {showReefer && <ReeferPanel s={shipment} editing={editingSection === 'reefer'} ed={ed} set={set}
              header={<SectionHeader label="Reefer Temperature" section="reefer" />} />}

            {/* Ports & Schedule */}
            <div className="glass-panel" style={{ padding: 14 }}>
              <SectionHeader label="Ports & Schedule" section="ports" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <Field label="Port of Loading" value={shipment.portOfLoading} editing={editingSection === 'ports'}>
                  <Inp placeholder="e.g. Port of Agadir" value={ed.portOfLoading} onChange={e => set('portOfLoading', e.target.value)} />
                </Field>
                <Field label="Transshipment Port" value={shipment.transshipmentPort} editing={editingSection === 'ports'}>
                  <Inp placeholder="e.g. Port of Algeciras" value={ed.transshipmentPort} onChange={e => set('transshipmentPort', e.target.value)} />
                </Field>
                <Field label="Port of Discharge" value={shipment.portOfDischarge} editing={editingSection === 'ports'}>
                  <Inp placeholder="e.g. Port of Newark, NJ" value={ed.portOfDischarge} onChange={e => set('portOfDischarge', e.target.value)} />
                </Field>
                <Field label="Vessel Name" value={shipment.vesselName} editing={editingSection === 'ports'}>
                  <Inp placeholder="Vessel name" value={ed.vesselName} onChange={e => set('vesselName', e.target.value)} />
                </Field>
                <Field label="Shipping Line" value={shipment.shippingLine} editing={editingSection === 'ports'}>
                  <Inp placeholder="e.g. CMA CGM" value={ed.shippingLine} onChange={e => set('shippingLine', e.target.value)} />
                </Field>
                <Field label="BOL Number" value={shipment.bolNumber} editing={editingSection === 'ports'}>
                  <Inp placeholder="BOL #" value={ed.bolNumber} onChange={e => set('bolNumber', e.target.value)} />
                </Field>
                <Field label="Departure Date" value={shipment.vesselDeparture ? formatDateUTC(shipment.vesselDeparture) : null} editing={editingSection === 'ports'}>
                  <Inp type="date" value={ed.vesselDeparture} onChange={e => set('vesselDeparture', e.target.value)} />
                </Field>
                <Field label="ETA (Newark)" value={shipment.vesselEta ? formatDateUTC(shipment.vesselEta) : null} editing={editingSection === 'ports'}>
                  <Inp type="date" value={ed.vesselEta} onChange={e => set('vesselEta', e.target.value)} />
                </Field>
                <Field label="Actual Arrival" value={shipment.vesselArrival ? formatDateUTC(shipment.vesselArrival) : null} editing={editingSection === 'ports'}>
                  <Inp type="date" value={ed.vesselArrival} onChange={e => set('vesselArrival', e.target.value)} />
                </Field>
                {/* Status — always visible, auto-saves on change */}
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Status</div>
                  {canEdit ? (
                    <select
                      className="ui-input"
                      style={{ padding: '6px 10px', fontSize: '0.84rem' }}
                      value={shipment.status}
                      onChange={async e => {
                        const newStatus = e.target.value;
                        try {
                          const updated = await shipmentsApi.update(shipment.id, { status: newStatus });
                          onUpdate(updated);
                          set('status', newStatus);
                        } catch (err) { alert('Failed: ' + err.message); }
                      }}
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{shipment.status}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Journey Timeline */}
            <JourneyTimeline
              shipment={shipment} events={events}
              onAdd={() => setShowAdd(true)}
              onDelete={handleDeleteEvent}
              canEdit={canEdit}
            />

            {/* Expenses & Revenue */}
            <ExpensesPanel shipment={shipment} canEdit={canEdit} />

            {/* Documents */}
            <ShipmentDocuments shipment={shipment} canEdit={canEdit} />

            {/* Notes */}
            <div className="glass-panel" style={{ padding: 14 }}>
              <SectionHeader label="Notes" section="notes" />
              <Field label="" value={shipment.notes} editing={editingSection === 'notes'}>
                <textarea className="ui-input" rows={3}
                  style={{ resize: 'vertical', fontSize: '0.84rem', width: '100%' }}
                  placeholder="Shipping notes, remarks…"
                  value={ed.notes} onChange={e => set('notes', e.target.value)} />
              </Field>
            </div>

            {isSuperAdmin && !editingSection && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-glass" style={{ color: '#ef4444', fontSize: '0.8rem' }} onClick={handleDelete}>
                  <Trash2 size={13} /> Delete Shipment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <AddEventModal
          shipmentId={shipment.id}
          destination={shipment.destination}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); refreshEvents(); }}
        />
      )}
    </>
  );
};

export default ShipmentDetailModal;
