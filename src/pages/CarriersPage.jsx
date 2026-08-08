import React, { useState, useEffect } from 'react';
import {
  Truck, Ship, Plus, Search, X, Loader2, Edit3, Trash2,
  FolderOpen, Eye, Download, UploadCloud, FileText, Package
} from 'lucide-react';
import { carriersApi, documentsApi, shipmentsApi } from '../services/api';

const TYPE_META = {
  Trucking:       { icon: Truck, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  'Shipping Line': { icon: Ship,  color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
};

// ─── Carrier Documents Modal ────────────────────────────────────────────────
const CarrierDocsModal = ({ carrier, onClose }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    documentsApi.getAll({ carrierId: carrier.id })
      .then(d => setDocs(Array.isArray(d) ? d : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [carrier.id]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await documentsApi.upload(file, { carrierId: carrier.id, category: 'General' });
      }
      load();
    } catch (err) { alert('Upload failed: ' + err.message); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const fetchBlob = (doc, mode) => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const token = localStorage.getItem('citrus_token');
    return fetch(`${apiBase}/documents/${doc.id}/${mode}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error('Request failed'); return r.blob(); });
  };
  const handleView = (doc) => fetchBlob(doc, 'view')
    .then(blob => window.open(URL.createObjectURL(blob), '_blank'))
    .catch(err => alert('View failed: ' + err.message));
  const handleDownload = (doc) => fetchBlob(doc, 'download')
    .then(blob => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = doc.originalName;
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch(err => alert('Download failed: ' + err.message));
  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.originalName}"?`)) return;
    try { await documentsApi.delete(doc.id); setDocs(p => p.filter(d => d.id !== doc.id)); }
    catch (err) { alert('Delete failed: ' + err.message); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: 560, padding: 0, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-glass-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderOpen size={18} className="text-orange" />
            <div>
              <div style={{ fontWeight: 700 }}>{carrier.name} Documents</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{carrier.type}{carrier.scacCode ? ` · SCAC ${carrier.scacCode}` : ''}</div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>

        <div style={{ padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <label style={{ cursor: 'pointer', display: 'block' }}>
            <input type="file" multiple style={{ display: 'none' }} onChange={handleUpload} />
            <span className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
              {uploading ? <><Loader2 size={15} className="animate-spin" /> Uploading…</> : <><UploadCloud size={15} /> Upload Documents</>}
            </span>
          </label>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>Loading…</div>
          ) : docs.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.84rem' }}>No documents yet</div>
          ) : docs.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 22px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <FileText size={15} style={{ color: 'var(--orange-primary)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.originalName}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {(d.size / 1024).toFixed(0)} KB · {new Date(d.createdAt).toLocaleDateString('en-GB')}{d.uploadedBy ? ` · ${d.uploadedBy}` : ''}
                </div>
              </div>
              <button onClick={() => handleView(d)} title="View" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#38bdf8', padding: 3 }}><Eye size={15} /></button>
              <button onClick={() => handleDownload(d)} title="Download" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e', padding: 3 }}><Download size={15} /></button>
              <button onClick={() => handleDelete(d)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.7)', padding: 3 }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Add / Edit Carrier Modal ───────────────────────────────────────────────
const CarrierModal = ({ carrier, onClose, onSaved }) => {
  const isEdit = !!carrier;
  const [form, setForm] = useState({
    name: carrier?.name || '',
    type: carrier?.type || 'Trucking',
    scacCode: carrier?.scacCode || '',
    contactName: carrier?.contactName || '',
    phone: carrier?.phone || '',
    email: carrier?.email || '',
    status: carrier?.status || 'Active',
    notes: carrier?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Name is required'); return; }
    setSaving(true);
    try {
      if (isEdit) await carriersApi.update(carrier.id, form);
      else await carriersApi.create(form);
      onSaved();
      onClose();
    } catch (err) { alert('Save failed: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: 480, padding: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-glass-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>{isEdit ? 'Edit Carrier' : 'Add Carrier'}</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>NAME *</label>
              <input className="ui-input" placeholder="e.g. Maersk, ABC Trucking" value={form.name} onChange={e => set('name', e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>TYPE *</label>
              <select className="ui-select" value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="Trucking">Trucking</option>
                <option value="Shipping Line">Shipping Line</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>SCAC CODE</label>
              <input className="ui-input" placeholder="e.g. MAEU" value={form.scacCode} onChange={e => set('scacCode', e.target.value.toUpperCase())} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>CONTACT NAME</label>
              <input className="ui-input" value={form.contactName} onChange={e => set('contactName', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>STATUS</label>
              <select className="ui-select" value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PHONE</label>
              <input className="ui-input" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>EMAIL</label>
              <input type="email" className="ui-input" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>NOTES</label>
              <input className="ui-input" value={form.notes} onChange={e => set('notes', e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-glass" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : isEdit ? 'Save Changes' : 'Add Carrier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ───────────────────────────────────────────────────────────────
const CarriersPage = () => {
  const [carriers, setCarriers] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editingCarrier, setEditingCarrier] = useState(null);
  const [docsCarrier, setDocsCarrier] = useState(null);

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('citrus_user') || '{}'); } catch { return {}; } })();
  const isSuperAdmin = currentUser.role === 'super admin';

  const load = () => {
    setLoading(true);
    Promise.all([
      carriersApi.getAll(),
      shipmentsApi.getAll().catch(() => []),
    ]).then(([c, s]) => {
      setCarriers(c);
      setShipments(Array.isArray(s) ? s : []);
    }).catch(() => setCarriers([])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  // A carrier's shipment count is matched by name against the field
  // relevant to its type (shippingLine for Shipping Line, truckingCarrier for Trucking)
  const shipmentCount = (carrier) => {
    const field = carrier.type === 'Trucking' ? 'truckingCarrier' : 'shippingLine';
    return shipments.filter(s => s[field] === carrier.name).length;
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete carrier "${c.name}"?`)) return;
    try { await carriersApi.delete(c.id); load(); }
    catch (err) { alert('Delete failed: ' + err.message); }
  };

  const filtered = carriers.filter(c => {
    if (typeFilter !== 'All' && c.type !== typeFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.scacCode || '').toLowerCase().includes(q);
  });

  const truckingCount = carriers.filter(c => c.type === 'Trucking').length;
  const shippingCount = carriers.filter(c => c.type === 'Shipping Line').length;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="flex-between">
        <div className="page-header">
          <div className="page-icon-box">
            <Truck size={24} className="text-orange" />
          </div>
          <div>
            <h1 className="page-title">Carriers</h1>
            <p className="page-subtitle">Trucking companies and shipping lines — SCAC codes and documents.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditingCarrier(null); setShowModal(true); }}>
          <Plus size={18} /> Add Carrier
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {['All', 'Trucking', 'Shipping Line'].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            style={{
              padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: '0.84rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', gap: 8,
              background: typeFilter === t ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.04)',
              border: typeFilter === t ? '1px solid var(--orange-primary)' : '1px solid var(--border-glass)',
              color: typeFilter === t ? 'var(--orange-primary)' : 'var(--text-muted)',
            }}
          >
            {t === 'All' ? `All (${carriers.length})` : t === 'Trucking' ? `Trucking (${truckingCount})` : `Shipping Line (${shippingCount})`}
          </button>
        ))}
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="ui-input"
            placeholder="Search name or SCAC code..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 32 }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No carriers found.</div>
        ) : (
          <table className="customer-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                <th>NAME</th>
                <th>TYPE</th>
                <th>SCAC</th>
                <th>CONTACT</th>
                <th>PHONE</th>
                <th>EMAIL</th>
                <th>STATUS</th>
                <th>SHIPMENTS</th>
                <th>DOCS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const meta = TYPE_META[c.type] || TYPE_META.Trucking;
                const Icon = meta.icon;
                return (
                  <tr key={c.id} className="shipment-card">
                    <td style={{ fontWeight: 700 }}>{c.name}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600, background: meta.bg, color: meta.color }}>
                        <Icon size={12} /> {c.type}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--orange-primary)' }}>{c.scacCode || '—'}</td>
                    <td>{c.contactName || '—'}</td>
                    <td className="text-muted">{c.phone || '—'}</td>
                    <td className="text-muted" style={{ fontSize: '0.82rem' }}>{c.email || '—'}</td>
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600,
                        background: c.status === 'Active' ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.06)',
                        color: c.status === 'Active' ? '#22c55e' : 'var(--text-muted)',
                      }}>{c.status}</span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700, color: shipmentCount(c) > 0 ? 'var(--orange-primary)' : 'var(--text-muted)' }}>
                        <Package size={13} /> {shipmentCount(c)}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-glass" style={{ fontSize: '0.74rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        onClick={() => setDocsCarrier(c)}>
                        <FolderOpen size={13} /> {c._count?.documents > 0 ? c._count.documents : 'Docs'}
                      </button>
                    </td>
                    <td>
                      <div className="flex-center gap-2">
                        <button className="btn btn-glass" style={{ padding: '6px 10px' }}
                          onClick={() => { setEditingCarrier(c); setShowModal(true); }}>
                          <Edit3 size={13} />
                        </button>
                        {isSuperAdmin && (
                          <button className="btn btn-glass" style={{ padding: '6px 10px', color: '#ef4444' }}
                            onClick={() => handleDelete(c)}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <CarrierModal
          carrier={editingCarrier}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}
      {docsCarrier && <CarrierDocsModal carrier={docsCarrier} onClose={() => setDocsCarrier(null)} />}
    </div>
  );
};

export default CarriersPage;
