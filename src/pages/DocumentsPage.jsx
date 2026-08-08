import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen, Upload, Search, X, Download, Trash2, FileText,
  File, Image, Eye
} from 'lucide-react';
import { documentsApi, contactsApi, ordersApi, shipmentsApi, accountingApi } from '../services/api';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const FileIcon = ({ mimeType }) => {
  if (mimeType?.startsWith('image/')) return <Image size={20} style={{ color: '#818cf8' }} />;
  if (mimeType === 'application/pdf') return <FileText size={20} style={{ color: '#ef4444' }} />;
  return <File size={20} style={{ color: 'var(--orange-primary)' }} />;
};

const DOC_TYPES = [
  'SWB','SWCInv','BOL','PL-Grower','PL-Customer','INV','CustomerInv','GrowerInv','PO','ISF',
  'Manifest','Phyto','FA','REL/SWB','Photo',
  'Phytosanitary','Invoice','Certificate','General','Other',
];

const categoryColor = (cat) => {
  const map = {
    BOL:           { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8' },
    SWB:           { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8' },
    SWCInv:        { bg: 'rgba(99,102,241,0.12)',  color: '#818cf8' },
    'PL-Grower':   { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
    'PL-Customer': { bg: 'rgba(56,189,248,0.12)',  color: '#38bdf8' },
    INV:           { bg: 'rgba(255,107,0,0.12)',   color: 'var(--orange-primary)' },
    Invoice:       { bg: 'rgba(255,107,0,0.12)',   color: 'var(--orange-primary)' },
    CustomerInv:   { bg: 'rgba(56,189,248,0.12)',  color: '#38bdf8' },
    GrowerInv:     { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
    Phyto:         { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
    Phytosanitary: { bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
    Certificate:   { bg: 'rgba(251,191,36,0.12)',  color: '#fbbf24' },
    FA:            { bg: 'rgba(139,92,246,0.12)',  color: '#8b5cf6' },
    'REL/SWB':     { bg: 'rgba(139,92,246,0.12)',  color: '#8b5cf6' },
    Photo:         { bg: 'rgba(236,72,153,0.12)',  color: '#ec4899' },
    General:       { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' },
    Other:         { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' },
  };
  return map[cat] || { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' };
};

// ─── Upload Modal ─────────────────────────────────────────────────────────────

const UploadModal = ({ onClose, onUploaded, contacts, orders, shipments, invoices }) => {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ category: 'General', contactId: '', orderId: '', shipmentId: '', invoiceId: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFile = (f) => {
    if (f.size > 25 * 1024 * 1024) { setError('File size must be under 25 MB'); return; }
    setFile(f);
    setError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    setSaving(true);
    try {
      await documentsApi.upload(file, form);
      onUploaded();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem' }}>Upload Document</h2>
          <button className="btn btn-glass" style={{ padding: '6px 8px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--orange-primary)' : 'var(--border-glass)'}`,
              borderRadius: 12, padding: 28, textAlign: 'center', cursor: 'pointer',
              background: dragOver ? 'rgba(255,107,0,0.05)' : 'transparent',
              transition: 'all 0.2s'
            }}
          >
            <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
            <Upload size={28} style={{ color: 'var(--orange-primary)', marginBottom: 8 }} />
            {file ? (
              <div>
                <p style={{ fontWeight: 600 }}>{file.name}</p>
                <p className="text-muted" style={{ fontSize: '0.8rem' }}>{fmtSize(file.size)}</p>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 500 }}>Drop file here or click to browse</p>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: 4 }}>PDF, images, Excel, Word — max 25 MB</p>
              </div>
            )}
          </div>

          <div>
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Category</label>
            <select className="ui-input" value={form.category} onChange={e => set('category', e.target.value)}>
              {DOC_TYPES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Link to Customer</label>
              <select className="ui-input" value={form.contactId} onChange={e => set('contactId', e.target.value)}>
                <option value="">— None —</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name} {c.company ? `(${c.company})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Link to Order</label>
              <select className="ui-input" value={form.orderId} onChange={e => set('orderId', e.target.value)}>
                <option value="">— None —</option>
                {orders.map(o => <option key={o.id} value={o.id}>{o.referenceId}</option>)}
              </select>
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Link to Shipment</label>
              <select className="ui-input" value={form.shipmentId} onChange={e => set('shipmentId', e.target.value)}>
                <option value="">— None —</option>
                {shipments.map(s => <option key={s.id} value={s.id}>{s.label} {s.containerNumber ? `· ${s.containerNumber}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Link to Invoice</label>
              <select className="ui-input" value={form.invoiceId} onChange={e => set('invoiceId', e.target.value)}>
                <option value="">— None —</option>
                {invoices.map(i => <option key={i.id} value={i.id}>{i.invoiceNumber}</option>)}
              </select>
            </div>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>{error}</div>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !file}>
              {saving ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Document Card ────────────────────────────────────────────────────────────

const DocumentCard = ({ doc, onDelete, onDownload, onView, canDelete }) => {
  const cat = categoryColor(doc.category);
  const links = [
    doc.contact && `Customer: ${doc.contact.name}`,
    doc.order && `Order: ${doc.order.referenceId}`,
    doc.shipment && `Shipment: ${doc.shipment.label || doc.shipment.containerNumber}`,
    doc.invoice && `Invoice: ${doc.invoice.invoiceNumber}`,
  ].filter(Boolean);

  return (
    <div className="glass-panel" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 10, flexShrink: 0 }}>
        <FileIcon mimeType={doc.mimeType} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={doc.originalName}>
          {doc.originalName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ background: cat.bg, color: cat.color, padding: '1px 8px', borderRadius: 10, fontSize: '0.72rem', fontWeight: 600 }}>{doc.category}</span>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>{fmtSize(doc.size)}</span>
          <span className="text-muted" style={{ fontSize: '0.75rem' }}>{new Date(doc.createdAt).toLocaleDateString()}</span>
          {doc.uploadedBy && <span className="text-muted" style={{ fontSize: '0.75rem' }}>by {doc.uploadedBy}</span>}
        </div>
        {links.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            {links.map((l, i) => (
              <span key={i} style={{ background: 'rgba(255,107,0,0.08)', color: 'var(--orange-primary)', padding: '1px 8px', borderRadius: 10, fontSize: '0.72rem' }}>{l}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button className="btn btn-glass" style={{ padding: '7px 10px' }} onClick={() => onView(doc)} title="View">
          <Eye size={15} />
        </button>
        <button className="btn btn-glass" style={{ padding: '7px 10px' }} onClick={() => onDownload(doc)} title="Download">
          <Download size={15} />
        </button>
        {canDelete && (
          <button className="btn btn-glass" style={{ padding: '7px 10px', color: '#ef4444' }} onClick={() => onDelete(doc.id)} title="Delete">
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main DocumentsPage ───────────────────────────────────────────────────────

const DocumentsPage = ({ selectedCompany }) => {
  const [docs, setDocs] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showUpload, setShowUpload] = useState(false);

  // Role check
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('citrus_user') || '{}');
    } catch {
      return {};
    }
  })();
  const canEdit = ['admin', 'operation', 'logistics'].includes(currentUser.role);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const data = await documentsApi.getAll();
      setDocs(data);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRelated = async () => {
    try {
      const [c, o, s, inv] = await Promise.all([
        contactsApi.getAll('Customer'),
        ordersApi.getAll(),
        shipmentsApi.getAll(),
        accountingApi.getAllInvoices()
      ]);
      setContacts(c);
      setOrders(o);
      setShipments(s);
      setInvoices(inv);
    } catch (err) {
      console.error('Failed to load related data:', err);
    }
  };

  useEffect(() => { loadDocs(); loadRelated(); }, [selectedCompany?.id]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document? This cannot be undone.')) return;
    try {
      await documentsApi.delete(id);
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDownload = (doc) => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const token = localStorage.getItem('citrus_token');
    fetch(`${apiBase}/documents/${doc.id}/download`, { headers: { Authorization: `Bearer ${token}` } })
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

  const handleView = (doc) => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const token = localStorage.getItem('citrus_token');
    fetch(`${apiBase}/documents/${doc.id}/view`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      })
      .catch(err => alert('View failed: ' + err.message));
  };

  const filtered = docs.filter(d => {
    const matchSearch = !search ||
      d.originalName.toLowerCase().includes(search.toLowerCase()) ||
      d.contact?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.order?.referenceId?.toLowerCase().includes(search.toLowerCase()) ||
      d.shipment?.label?.toLowerCase().includes(search.toLowerCase()) ||
      d.invoice?.invoiceNumber?.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'All' || d.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const countByCategory = (cat) => docs.filter(d => d.category === cat).length;

  // Dynamic category chips — only show categories that exist in current docs, sorted by DOC_TYPES order
  const activeCategories = ['All', ...DOC_TYPES.filter(t => docs.some(d => d.category === t)),
    ...docs.map(d => d.category).filter(c => c && !DOC_TYPES.includes(c))
      .filter((c, i, arr) => arr.indexOf(c) === i)
  ];

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <FolderOpen className="text-orange" size={28} /> Documents
          </h1>
          <p className="text-muted" style={{ marginTop: 4 }}>All business documents in one place — linked to customers, orders, shipments and invoices.</p>
        </div>
        {canEdit && (
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Upload size={18} /> Upload Document
          </button>
        )}
      </div>

      {/* Category summary chips — dynamic from actual docs */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {activeCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            style={{
              padding: '6px 16px', borderRadius: 20, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${categoryFilter === cat ? 'var(--orange-primary)' : 'var(--border-glass)'}`,
              background: categoryFilter === cat ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.04)',
              color: categoryFilter === cat ? 'var(--orange-primary)' : 'var(--text-muted)',
              transition: 'all 0.2s'
            }}
          >
            {cat} {cat !== 'All' && <span style={{ opacity: 0.7 }}>({countByCategory(cat)})</span>}
            {cat === 'All' && <span style={{ opacity: 0.7 }}>({docs.length})</span>}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="glass-panel" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Search size={16} className="text-muted" />
        <input
          className="ui-input"
          style={{ border: 'none', background: 'transparent', flex: 1 }}
          placeholder="Search by filename, customer, order, shipment or invoice..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button>}
      </div>

      {/* Documents list */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Loading documents...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <FolderOpen size={40} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
            <p className="text-muted">{search || categoryFilter !== 'All' ? 'No documents match your filters.' : 'No documents uploaded yet. Click "Upload Document" to get started.'}</p>
          </div>
        ) : (
          filtered.map(doc => (
            <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} onDownload={handleDownload} onView={handleView} canDelete={canEdit} />
          ))
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); loadDocs(); }}
          contacts={contacts}
          orders={orders}
          shipments={shipments}
          invoices={invoices}
        />
      )}
    </div>
  );
};

export default DocumentsPage;
