import React, { useState, useEffect, useRef } from 'react';
import {
  Receipt, FileText, ShoppingCart, Plus, Search, X,
  DollarSign, CreditCard, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronRight, Trash2, ArrowLeft, FileSpreadsheet, Edit3, Lock
} from 'lucide-react';
import { accountingApi, paymentsApi, shipmentsApi, documentsApi, contactsApi } from '../services/api';
import { Loader2, FolderOpen, Eye, Download, UploadCloud } from 'lucide-react';
import AccountOfSaleModal from '../components/AccountOfSaleModal';

// ─── PO Documents Modal ─────────────────────────────────────────────────────
const PODocsModal = ({ po, onClose }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    documentsApi.getAll({ poId: po.id })
      .then(d => setDocs(Array.isArray(d) ? d : []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [po.id]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await documentsApi.upload(file, { poId: po.id, category: 'PO' });
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
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content glass-panel" style={{ maxWidth: 560, padding: 0, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border-glass-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FolderOpen size={18} className="text-orange" />
            <div>
              <div style={{ fontWeight: 700 }}>{po.poNumber} Documents</div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{po.supplier?.name}</div>
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

const ADV_STATUSES_LIST = ['Pending', 'Requested', 'Paid', 'Not Required'];

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n) => `$${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const paidAmount = (inv) => (inv.payments || []).reduce((s, p) => s + p.amount, 0);

const statusColor = (status) => {
  switch (status) {
    case 'Paid':    return { bg: 'rgba(34,197,94,0.12)', color: '#22c55e', border: 'rgba(34,197,94,0.25)' };
    case 'Partial': return { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: 'rgba(251,191,36,0.25)' };
    default:        return { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' };
  }
};

const StatusBadge = ({ status }) => {
  const s = statusColor(status);
  return (
    <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 20, padding: '3px 12px', fontSize: '0.78rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {status === 'Paid' && <CheckCircle2 size={12} />}
      {status === 'Partial' && <Clock size={12} />}
      {status === 'Unpaid' && <AlertCircle size={12} />}
      {status}
    </span>
  );
};

// ─── Payment Progress Bar ────────────────────────────────────────────────────

const PaymentProgress = ({ invoice }) => {
  const paid = paidAmount(invoice);
  const total = invoice.amount || 0;
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 4 }}>
        <span className="text-muted">Paid: <strong style={{ color: '#22c55e' }}>{fmt(paid)}</strong></span>
        <span className="text-muted">Remaining: <strong style={{ color: pct < 100 ? '#ef4444' : '#22c55e' }}>{fmt(total - paid)}</strong></span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct >= 100 ? '#22c55e' : pct > 0 ? '#fbbf24' : '#ef4444', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
};

// ─── Record Payment Modal ────────────────────────────────────────────────────

const PaymentModal = ({ invoice, onClose, onSaved, editingPayment }) => {
  const isEdit = !!editingPayment;
  const remaining = invoice.amount - paidAmount(invoice) + (isEdit ? editingPayment.amount : 0);
  const [form, setForm] = useState(() => isEdit ? {
    amount: String(editingPayment.amount ?? ''),
    method: editingPayment.method || 'Bank Transfer',
    reference: editingPayment.reference || '',
    notes: editingPayment.notes || '',
    paidAt: editingPayment.paidAt ? editingPayment.paidAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
  } : { amount: remaining > 0 ? remaining.toFixed(2) : '', method: 'Bank Transfer', reference: '', notes: '', paidAt: new Date().toISOString().slice(0, 10) });
  const [receiptFile, setReceiptFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount must be greater than 0'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await paymentsApi.update(editingPayment.id, form);
      } else {
        await paymentsApi.create(invoice.id, form);
      }
      if (receiptFile) {
        await documentsApi.upload(receiptFile, {
          invoiceId: invoice.id,
          shipmentId: invoice.shipmentId || undefined,
          category: 'PaymentVoucher',
        });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem' }}>{isEdit ? 'Edit Payment' : 'Record Payment'} — {invoice.invoiceNumber}</h2>
          <button className="btn btn-glass" style={{ padding: '6px 8px' }} onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
            <span className="text-muted">Invoice Total</span><strong>{fmt(invoice.amount)}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginTop: 4 }}>
            <span className="text-muted">Already Paid</span><strong style={{ color: '#22c55e' }}>{fmt(paidAmount(invoice))}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginTop: 4 }}>
            <span className="text-muted">Remaining</span><strong style={{ color: remaining > 0 ? '#ef4444' : '#22c55e' }}>{fmt(remaining)}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Amount ($) *</label>
            <input className="ui-input" type="number" step="0.01" min="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} required />
          </div>
          <div>
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Payment Method</label>
            <select className="ui-input" value={form.method} onChange={e => set('method', e.target.value)}>
              {['Bank Transfer', 'Cash', 'Check', 'Card', 'Wire Transfer', 'Other'].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Reference / Transaction ID</label>
            <input className="ui-input" type="text" placeholder="e.g. TRX-12345" value={form.reference} onChange={e => set('reference', e.target.value)} />
          </div>
          <div>
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Payment Date</label>
            <input className="ui-input" type="date" value={form.paidAt} onChange={e => set('paidAt', e.target.value)} />
          </div>
          <div>
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea className="ui-input" rows={2} placeholder="Optional notes..." value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Receipt / Proof of Payment (optional)</label>
            <input className="ui-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setReceiptFile(e.target.files?.[0] || null)} />
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Record Payment'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Invoice Detail Panel ────────────────────────────────────────────────────

const InvoiceDetail = ({ invoice, onBack, onRefresh }) => {
  const [payments, setPayments] = useState(invoice.payments || []);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(null);
  const canEdit = invoice.status !== 'Paid';
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('citrus_user') || '{}'); } catch { return {}; } })();
  const canDeleteDocs = ['admin', 'super admin'].includes(currentUser.role);

  const reload = async () => { onRefresh(); };

  const handleDeleteDoc = async (doc) => {
    if (!window.confirm(`Delete "${doc.originalName}"? This cannot be undone.`)) return;
    setDeletingDoc(doc.id);
    try {
      await documentsApi.delete(doc.id);
      reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeletingDoc(null);
    }
  };

  const handlePaymentSaved = () => { setShowPaymentModal(false); setEditingPayment(null); reload(); };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Delete this payment record?')) return;
    setDeleting(paymentId);
    try {
      await paymentsApi.delete(paymentId);
      reload();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  const [deletingInvoice, setDeletingInvoice] = useState(false);
  const handleDeleteInvoice = async () => {
    const paymentCount = (invoice.payments || []).length;
    if (paymentCount > 0) {
      alert(`This invoice has ${paymentCount} payment${paymentCount > 1 ? 's' : ''} recorded — delete ${paymentCount > 1 ? 'them' : 'it'} first (in Payment History below), then you can delete the invoice.`);
      return;
    }
    if (!window.confirm(`Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`)) return;
    setDeletingInvoice(true);
    try {
      await accountingApi.deleteInvoice(invoice.id);
      onBack();
    } catch (err) {
      alert(err.message);
      setDeletingInvoice(false);
    }
  };

  const paid = paidAmount(invoice);
  const remaining = invoice.amount - paid;
  const invoiceDocs = invoice.shipment?.documents || [];

  const handleDownloadDoc = (doc) => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const token   = localStorage.getItem('citrus_token');
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

  const handleViewDoc = (doc) => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    const token   = localStorage.getItem('citrus_token');
    fetch(`${apiBase}/documents/${doc.id}/view`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => window.open(URL.createObjectURL(blob), '_blank'))
      .catch(err => alert('View failed: ' + err.message));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn btn-glass" style={{ padding: '6px 10px' }} onClick={onBack}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 style={{ fontSize: '1.4rem' }}>{invoice.invoiceNumber}</h2>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>
            {invoice.type} Invoice · Issued {new Date(invoice.issueDate).toLocaleDateString()}
            {invoice.dueDate && ` · Due ${new Date(invoice.dueDate).toLocaleDateString()}`}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {canEdit ? (
            <button className="btn btn-glass" style={{ padding: '7px 14px', fontSize: '0.85rem', gap: 6 }} onClick={() => setShowEditModal(true)}>
              <Edit3 size={14} /> Edit
            </button>
          ) : (
            <span className="text-muted" title="A fully Paid invoice can't be edited" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem' }}>
              <Lock size={12} /> Locked
            </span>
          )}
          <button className="btn btn-glass" style={{ padding: '7px 14px', fontSize: '0.85rem', gap: 6, color: '#ef4444' }} disabled={deletingInvoice} onClick={handleDeleteInvoice}>
            <Trash2 size={14} /> Delete
          </button>
          <StatusBadge status={invoice.status} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="glass-panel" style={{ padding: 20 }}>
          <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 6 }}>TOTAL AMOUNT</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--orange-primary)' }}>{fmt(invoice.amount)}</p>
          <div style={{ marginTop: 12 }}><PaymentProgress invoice={invoice} /></div>
        </div>
        <div className="glass-panel" style={{ padding: 20 }}>
          <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 8 }}>LINKED TO</p>
          {invoice.order && (
            <div style={{ fontSize: '0.88rem', marginBottom: 6 }}>
              <span className="text-muted">Sales Order: </span>
              <strong>{invoice.order.referenceId}</strong>
              {invoice.order.contact && <span className="text-muted"> · {invoice.order.contact.name}</span>}
            </div>
          )}
          {invoice.purchaseOrder && (
            <div style={{ fontSize: '0.88rem', marginBottom: 6 }}>
              <span className="text-muted">Purchase Order: </span>
              <strong>{invoice.purchaseOrder.poNumber}</strong>
              {invoice.purchaseOrder.supplier && <span className="text-muted"> · {invoice.purchaseOrder.supplier.name}</span>}
            </div>
          )}
          {!invoice.order && invoice.contact && (
            <div style={{ fontSize: '0.88rem', marginBottom: 6 }}>
              <span className="text-muted">Customer: </span>
              <strong>{invoice.contact.name}</strong>
            </div>
          )}
          {!invoice.order && !invoice.purchaseOrder && !invoice.contact && (
            <p className="text-muted" style={{ fontSize: '0.82rem' }}>Not linked to a customer, order, or PO.</p>
          )}
          {invoice.shipment && (
            <div style={{ fontSize: '0.88rem', marginBottom: 6 }}>
              <span className="text-muted">Shipment Ref ID: </span>
              <strong>{shipmentRefLabel(invoice.shipment)}</strong>
              {invoice.shipment.containerNumber && <span className="text-muted"> · {invoice.shipment.containerNumber}</span>}
            </div>
          )}
          {invoice.notes && <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: 8 }}>{invoice.notes}</p>}
        </div>
      </div>

      {invoiceDocs.length > 0 && (
        <div className="glass-panel" style={{ padding: 20 }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 12 }}>Documents ({invoiceDocs.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {invoiceDocs.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                <FileText size={15} style={{ color: 'var(--orange-primary)', flexShrink: 0 }} />
                <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 10, flexShrink: 0, color: doc.category === 'PaymentVoucher' ? '#22c55e' : '#38bdf8', background: doc.category === 'PaymentVoucher' ? 'rgba(34,197,94,0.1)' : 'rgba(56,189,248,0.1)', border: `1px solid ${doc.category === 'PaymentVoucher' ? 'rgba(34,197,94,0.25)' : 'rgba(56,189,248,0.25)'}` }}>
                  {doc.category === 'PaymentVoucher' ? 'RECEIPT' : 'INVOICE'}
                </span>
                <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }}>{doc.originalName}</div>
                <button className="btn btn-glass" style={{ padding: '5px 10px', fontSize: '0.78rem', gap: 5 }} onClick={() => handleViewDoc(doc)}>
                  <Eye size={13} /> View
                </button>
                <button className="btn btn-glass" style={{ padding: '5px 10px', fontSize: '0.78rem', gap: 5 }} onClick={() => handleDownloadDoc(doc)}>
                  <Download size={13} /> Download
                </button>
                {canDeleteDocs && (
                  <button className="btn btn-glass" style={{ padding: '5px 8px', color: '#ef4444' }} disabled={deletingDoc === doc.id} onClick={() => handleDeleteDoc(doc)} title="Delete document">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: 20, flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem' }}>Payment History ({(invoice.payments || []).length})</h3>
          {invoice.status !== 'Paid' && (
            <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setShowPaymentModal(true)}>
              <Plus size={15} /> Record Payment
            </button>
          )}
        </div>

        {(invoice.payments || []).length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
            No payments recorded yet.
          </div>
        ) : (
          <table className="customer-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>DATE</th>
                <th>AMOUNT</th>
                <th>METHOD</th>
                <th>REFERENCE</th>
                <th>NOTES</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(invoice.payments || []).map(p => (
                <tr key={p.id} className="shipment-card">
                  <td>{new Date(p.paidAt).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 700, color: '#22c55e' }}>{fmt(p.amount)}</td>
                  <td><span style={{ background: 'rgba(255,107,0,0.1)', color: 'var(--orange-primary)', padding: '2px 10px', borderRadius: 12, fontSize: '0.78rem' }}>{p.method}</span></td>
                  <td className="text-muted" style={{ fontSize: '0.85rem' }}>{p.reference || '—'}</td>
                  <td className="text-muted" style={{ fontSize: '0.82rem' }}>{p.notes || '—'}</td>
                  <td style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-glass" style={{ padding: '4px 8px' }} onClick={() => setEditingPayment(p)} title="Edit payment">
                      <Edit3 size={14} />
                    </button>
                    <button className="btn btn-glass" style={{ padding: '4px 8px', color: '#ef4444' }} disabled={deleting === p.id} onClick={() => handleDeletePayment(p.id)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {(invoice.payments || []).length > 0 && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'flex-end', gap: 32, fontSize: '0.9rem' }}>
            <span className="text-muted">Total Paid: <strong style={{ color: '#22c55e' }}>{fmt(paid)}</strong></span>
            <span className="text-muted">Outstanding: <strong style={{ color: remaining > 0 ? '#ef4444' : '#22c55e' }}>{fmt(Math.max(remaining, 0))}</strong></span>
          </div>
        )}
      </div>

      {(showPaymentModal || editingPayment) && (
        <PaymentModal
          invoice={invoice}
          editingPayment={editingPayment}
          onClose={() => { setShowPaymentModal(false); setEditingPayment(null); }}
          onSaved={handlePaymentSaved}
        />
      )}

      {showEditModal && (
        <CreateInvoiceModal
          editingInvoice={invoice}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); reload(); }}
        />
      )}
    </div>
  );
};

// ─── Create Invoice Modal ────────────────────────────────────────────────────

const shipmentRefLabel = (s) => s.order?.referenceId ? `#${s.order.referenceId}` : s.shipmentRefId ? `#${s.shipmentRefId}` : '(no ref id)';

// Searchable Ref ID (shipment) picker — a plain <select> becomes unusable
// once there are hundreds of shipments to scroll through.
const ShipmentRefSelect = ({ shipments, value, onChange, disabled, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selected = shipments.find(s => s.id === value);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? shipments.filter(s =>
        shipmentRefLabel(s).toLowerCase().includes(q) ||
        (s.contact?.name || '').toLowerCase().includes(q) ||
        (s.containerNumber || '').toLowerCase().includes(q))
    : shipments;

  const handleSelect = (id) => { onChange(id); setOpen(false); setQuery(''); };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        className="ui-input"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1 }}
        onClick={() => !disabled && setOpen(o => !o)}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: selected ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {selected ? `${shipmentRefLabel(selected)} — ${selected.contact?.name || 'No customer'}${selected.containerNumber ? ` — ${selected.containerNumber}` : ''}` : (placeholder || 'Select...')}
        </span>
        <ChevronDown size={14} style={{ flexShrink: 0, color: 'var(--text-muted)' }} />
      </div>

      {open && !disabled && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: '#1a1f2e', border: '1px solid var(--border-glass)', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)', maxHeight: 280, display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              autoFocus className="ui-input" placeholder="Search ref id, container, customer..."
              value={query} onChange={e => setQuery(e.target.value)} onClick={e => e.stopPropagation()}
              style={{ fontSize: '0.82rem', padding: '5px 8px', width: '100%' }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px 14px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>No match</div>
            ) : filtered.map(s => (
              <div
                key={s.id}
                onClick={() => handleSelect(s.id)}
                style={{
                  padding: '8px 14px', cursor: 'pointer', fontSize: '0.84rem', borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background: value === s.id ? 'rgba(255,107,0,0.12)' : 'transparent',
                  color: value === s.id ? 'var(--orange-primary)' : 'var(--text-primary)',
                }}
                onMouseEnter={e => { if (value !== s.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (value !== s.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ fontWeight: 600 }}>{shipmentRefLabel(s)}{s.containerNumber ? ` — ${s.containerNumber}` : ''}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.contact?.name || 'No customer'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CreateInvoiceModal = ({ onClose, onSaved, editingInvoice }) => {
  const isEdit = !!editingInvoice;
  const [form, setForm] = useState(() => isEdit ? {
    invoiceNumber: editingInvoice.invoiceNumber,
    type: editingInvoice.type,
    amount: String(editingInvoice.amount ?? ''),
    issueDate: editingInvoice.issueDate ? editingInvoice.issueDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
    dueDate: editingInvoice.dueDate ? editingInvoice.dueDate.slice(0, 10) : '',
    notes: editingInvoice.notes || '',
    contactId: editingInvoice.contactId || editingInvoice.order?.contactId || '',
    shipmentId: editingInvoice.shipmentId || '',
  } : { invoiceNumber: `INV-${Date.now()}`, type: 'Sales', amount: '', issueDate: new Date().toISOString().slice(0, 10), dueDate: '', notes: '', contactId: '', shipmentId: '' });
  const [shipments, setShipments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [existingInvoiceDocs, setExistingInvoiceDocs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    shipmentsApi.getAll().then(list => setShipments(Array.isArray(list) ? list : [])).catch(() => {});
    contactsApi.getAll('Customer').then(list => setCustomers(Array.isArray(list) ? list : [])).catch(() => {});
  }, []);

  // Pre-fill the "already has an invoice document" warning when editing.
  useEffect(() => {
    if (isEdit && editingInvoice.shipmentId) checkExistingDocs(editingInvoice.shipmentId);
  }, []);

  const checkExistingDocs = (shipmentId) => {
    documentsApi.getAll({ shipmentId })
      .then(docs => setExistingInvoiceDocs((docs || []).filter(d => d.category === 'CustomerInv')))
      .catch(() => setExistingInvoiceDocs([]));
  };

  // Picking the customer first narrows the Ref ID list down to just their
  // shipments — with hundreds of shipments across all customers, hunting
  // for the right one in one long list was the whole problem.
  const shipmentsForCustomer = form.contactId
    ? shipments.filter(s => s.contact?.id === form.contactId || s.id === form.shipmentId)
    : shipments;

  const handleCustomerChange = (contactId) => {
    setForm(f => ({ ...f, contactId, shipmentId: '', orderId: '' }));
    setExistingInvoiceDocs([]);
  };

  const handleShipmentChange = (id) => {
    const s = shipments.find(sh => sh.id === id);
    setForm(f => ({ ...f, shipmentId: id, contactId: s?.contact?.id || f.contactId, orderId: s?.order?.id || '' }));
    if (id) checkExistingDocs(id); else setExistingInvoiceDocs([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount is required'); return; }
    if (form.type === 'Sales' && !form.shipmentId) { setError('Ref ID (shipment) is required'); return; }
    setSaving(true);
    try {
      let invoice;
      if (isEdit) {
        invoice = await accountingApi.updateInvoice(editingInvoice.id, form);
      } else {
        invoice = await accountingApi.createInvoice(form);
      }
      if (invoiceFile) {
        await documentsApi.upload(invoiceFile, {
          shipmentId: form.shipmentId || undefined,
          invoiceId: invoice.id,
          category: 'CustomerInv',
        });
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem' }}>{isEdit ? 'Edit Invoice' : 'New Invoice'}</h2>
          <button className="btn btn-glass" style={{ padding: '6px 8px' }} onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Invoice Number</label>
              <input className="ui-input" value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} required />
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Type</label>
              <select className="ui-input" value={form.type} onChange={e => set('type', e.target.value)}>
                <option>Sales</option>
                <option>Purchase</option>
              </select>
            </div>
          </div>
          {form.type === 'Sales' && (
            <>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Customer</label>
                <select className="ui-input" value={form.contactId} onChange={e => handleCustomerChange(e.target.value)}>
                  <option value="">All customers</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>Narrows the Ref ID list below — optional, you can also just search by ref id or container.</p>
              </div>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Ref ID (Shipment) *</label>
                <ShipmentRefSelect
                  shipments={shipmentsForCustomer}
                  value={form.shipmentId}
                  onChange={handleShipmentChange}
                  placeholder="Search and select a shipment..."
                />
              </div>
            </>
          )}
          <div>
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Amount ($) *</label>
            <input className="ui-input" type="number" step="0.01" min="0" value={form.amount} onChange={e => set('amount', e.target.value)} required />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Issue Date</label>
              <input className="ui-input" type="date" value={form.issueDate} onChange={e => set('issueDate', e.target.value)} />
            </div>
            <div>
              <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Due Date</label>
              <input className="ui-input" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea className="ui-input" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} style={{ resize: 'vertical' }} />
          </div>
          <div>
            <label className="text-muted" style={{ fontSize: '0.8rem', display: 'block', marginBottom: 4 }}>Invoice Document (optional)</label>
            <input className="ui-input" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setInvoiceFile(e.target.files?.[0] || null)} />
            {isEdit && !invoiceFile && <p className="text-muted" style={{ fontSize: '0.72rem', marginTop: 4 }}>Only needed if you want to attach a new file.</p>}
            {existingInvoiceDocs.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginTop: 6, padding: '8px 10px', borderRadius: 8, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)' }}>
                <AlertCircle size={13} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: '0.75rem', color: '#f59e0b', margin: 0 }}>
                  This shipment already has {existingInvoiceDocs.length} invoice document{existingInvoiceDocs.length > 1 ? 's' : ''} uploaded. Uploading a new one adds another — it won't replace the old one. Delete the outdated one from the shipment's Documents tab if it's no longer needed.
                </p>
              </div>
            )}
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Invoice'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main AccountingPage ─────────────────────────────────────────────────────

const AccountingPage = ({ selectedCompany }) => {
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [advPayFilter, setAdvPayFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [docsPo, setDocsPo] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [aosShipment, setAosShipment] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allInvoices, allPOs, allShipments] = await Promise.all([
        accountingApi.getAllInvoices(),
        accountingApi.getAllPOs(),
        shipmentsApi.getAll().catch(() => []),
      ]);
      setInvoices(allInvoices);
      setPurchaseOrders(allPOs);
      setShipments(Array.isArray(allShipments) ? allShipments : []);
      // Functional form — reads the *current* selectedInvoice at the time this
      // resolves, not the stale value closed over when loadData was created.
      // Without this, clicking "back" (which also calls loadData) would race:
      // the closure still saw the old invoice and re-opened it right after.
      setSelectedInvoice(prev => prev ? (allInvoices.find(i => i.id === prev.id) || prev) : null);
    } catch (err) {
      console.error('Failed to load accounting data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedCompany?.id]);

  const filteredInvoices = invoices.filter(inv => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.order?.referenceId?.toLowerCase().includes(q) ||
      inv.order?.contact?.name?.toLowerCase().includes(q) ||
      inv.purchaseOrder?.supplier?.name?.toLowerCase().includes(q) ||
      inv.contact?.name?.toLowerCase().includes(q) ||
      String(inv.shipment?.shipmentRefId || '').toLowerCase().includes(q) ||
      String(inv.shipment?.order?.referenceId || '').toLowerCase().includes(q) ||
      String(inv.shipment?.containerNumber || '').toLowerCase().includes(q) ||
      String(inv.shipment?.bolNumber || '').toLowerCase().includes(q);
    const matchStatus = statusFilter === 'All' || inv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredPOs = purchaseOrders.filter(po =>
    !search ||
    po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
    po.supplier?.name?.toLowerCase().includes(search.toLowerCase()) ||
    po.order?.referenceId?.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const totalOutstanding = invoices.filter(i => i.type === 'Sales' && i.status !== 'Paid').reduce((s, i) => s + (i.amount - paidAmount(i)), 0);
  const totalCollected = invoices.filter(i => i.type === 'Sales').reduce((s, i) => s + paidAmount(i), 0);
  const overdueCount = invoices.filter(i => i.status !== 'Paid' && i.dueDate && new Date(i.dueDate) < new Date()).length;

  if (selectedInvoice) {
    return (
      <div style={{ padding: 24, height: '100%', overflowY: 'auto' }}>
        <InvoiceDetail
          invoice={selectedInvoice}
          onBack={() => { setSelectedInvoice(null); loadData(); }}
          onRefresh={loadData}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20, height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Receipt className="text-orange" size={28} /> Accounting
          </h1>
          <p className="text-muted" style={{ marginTop: 4 }}>Invoices, Purchase Orders & Payment Tracking</p>
        </div>
        {activeTab === 'invoices' && (
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> New Invoice
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 6 }}>TOTAL COLLECTED (SALES)</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: '#22c55e' }}>{fmt(totalCollected)}</p>
        </div>
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 6 }}>OUTSTANDING BALANCE</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--orange-primary)' }}>{fmt(totalOutstanding)}</p>
        </div>
        <div className="glass-panel" style={{ padding: '16px 20px' }}>
          <p className="text-muted" style={{ fontSize: '0.78rem', marginBottom: 6 }}>OVERDUE INVOICES</p>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: overdueCount > 0 ? '#ef4444' : 'var(--text-muted)' }}>{overdueCount}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border-glass)', paddingBottom: 12 }}>
        <button className={`btn ${activeTab === 'invoices' ? 'btn-primary' : 'btn-glass'}`} onClick={() => setActiveTab('invoices')}>
          <FileText size={16} /> Invoices <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '1px 8px', fontSize: '0.75rem', marginLeft: 4 }}>{invoices.length}</span>
        </button>
        <button className={`btn ${activeTab === 'pos' ? 'btn-primary' : 'btn-glass'}`} onClick={() => setActiveTab('pos')}>
          <ShoppingCart size={16} /> Purchase Orders <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '1px 8px', fontSize: '0.75rem', marginLeft: 4 }}>{purchaseOrders.length}</span>
        </button>
        <button className={`btn ${activeTab === 'advance' ? 'btn-primary' : 'btn-glass'}`} onClick={() => setActiveTab('advance')}>
          <CreditCard size={16} /> Advance Payments <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '1px 8px', fontSize: '0.75rem', marginLeft: 4 }}>{shipments.length}</span>
        </button>
        <button className={`btn ${activeTab === 'aos' ? 'btn-primary' : 'btn-glass'}`} onClick={() => setActiveTab('aos')}>
          <FileSpreadsheet size={16} /> Account of Sale <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '1px 8px', fontSize: '0.75rem', marginLeft: 4 }}>{shipments.filter(s => (s.expenses || []).length > 0).length}</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="glass-panel" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <Search size={16} className="text-muted" />
          <input className="ui-input" style={{ border: 'none', background: 'transparent', flex: 1 }} placeholder={activeTab === 'invoices' ? 'Search invoices...' : activeTab === 'aos' ? 'Search by container, grower...' : 'Search purchase orders...'} value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button>}
        </div>
        {activeTab === 'invoices' && (
          <select className="ui-input glass-panel" style={{ padding: '10px 16px', minWidth: 140 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            {['All', 'Unpaid', 'Partial', 'Paid'].map(s => <option key={s}>{s}</option>)}
          </select>
        )}
      </div>

      {/* Invoices Table */}
      {activeTab === 'invoices' && (
        <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
          <table className="customer-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                <th>INVOICE #</th>
                <th>TYPE</th>
                <th>CUSTOMER / SUPPLIER</th>
                <th>CONTAINER #</th>
                <th>AMOUNT</th>
                <th>REMAINING</th>
                <th>PROGRESS</th>
                <th>STATUS</th>
                <th>DUE DATE</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: 40 }}>Loading invoices...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan="10" style={{ textAlign: 'center', padding: 40 }}>No invoices found.</td></tr>
              ) : filteredInvoices.map(inv => {
                const paid = paidAmount(inv);
                const pct = inv.amount > 0 ? Math.min((paid / inv.amount) * 100, 100) : 0;
                const isOverdue = inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < new Date();
                const party = inv.order?.contact?.name || inv.purchaseOrder?.supplier?.name || inv.contact?.name || '—';
                return (
                  <tr key={inv.id} className="shipment-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedInvoice(inv)}>
                    <td style={{ fontWeight: 600 }}>{inv.invoiceNumber}</td>
                    <td>
                      <span style={{ background: inv.type === 'Sales' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)', color: inv.type === 'Sales' ? '#22c55e' : '#818cf8', padding: '2px 10px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>{inv.type}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.88rem' }}>{party}</div>
                      {inv.order && <div className="text-muted" style={{ fontSize: '0.75rem' }}>SO: {inv.order.referenceId}</div>}
                      {inv.purchaseOrder && <div className="text-muted" style={{ fontSize: '0.75rem' }}>PO: {inv.purchaseOrder.poNumber}</div>}
                      {inv.shipment && (
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Ref: {shipmentRefLabel(inv.shipment)}
                          {inv.shipment.documents?.length > 0 && (
                            <FileText size={11} style={{ marginLeft: 5, verticalAlign: -1, color: 'var(--orange-primary)' }} />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="text-muted" style={{ fontSize: '0.85rem' }}>{inv.shipment?.containerNumber || '—'}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(inv.amount)}</td>
                    <td style={{ color: inv.amount - paid > 0 ? '#ef4444' : '#22c55e', fontWeight: 600 }}>{fmt(Math.max(inv.amount - paid, 0))}</td>
                    <td style={{ minWidth: 100 }}>
                      <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: pct >= 100 ? '#22c55e' : pct > 0 ? '#fbbf24' : '#ef4444' }} />
                      </div>
                    </td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td style={{ color: isOverdue ? '#ef4444' : 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                      {isOverdue && <div style={{ fontSize: '0.7rem', color: '#ef4444' }}>OVERDUE</div>}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <ChevronRight size={16} className="text-muted" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Purchase Orders Table */}
      {activeTab === 'pos' && (
        <div className="table-container" style={{ flex: 1, overflowY: 'auto' }}>
          <table className="customer-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
            <thead>
              <tr>
                <th>PO #</th>
                <th>SUPPLIER</th>
                <th>AMOUNT</th>
                <th>LINKED SO</th>
                <th>STATUS</th>
                <th>DATE</th>
                <th>DOCS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
              ) : filteredPOs.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: 40 }}>No purchase orders found.</td></tr>
              ) : filteredPOs.map(po => (
                <tr key={po.id} className="shipment-card">
                  <td style={{ fontWeight: 600 }}>{po.poNumber}</td>
                  <td>{po.supplier?.name || '—'}<div className="text-muted" style={{ fontSize: '0.75rem' }}>{po.supplier?.company}</div></td>
                  <td style={{ fontWeight: 700 }}>{fmt(po.totalAmount)}</td>
                  <td>{po.order?.referenceId || '—'}</td>
                  <td>
                    <span style={{ background: 'rgba(255,107,0,0.1)', color: 'var(--orange-primary)', padding: '3px 12px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>{po.status}</span>
                  </td>
                  <td className="text-muted" style={{ fontSize: '0.85rem' }}>{new Date(po.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-glass" style={{ fontSize: '0.74rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                      onClick={() => setDocsPo(po)}>
                      <FolderOpen size={13} /> Docs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Advance Payments Tab */}
      {activeTab === 'advance' && (() => {
        const ADV_STATUSES = ['Pending','Requested','Paid','Not Required'];
        const ADV_COLORS = { 'Paid': '#22c55e', 'Requested': '#3b82f6', 'Pending': '#f59e0b', 'Not Required': '#94a3b8' };
        const filtered = advPayFilter === 'All'
          ? shipments
          : shipments.filter(s => (s.advancePaymentStatus || 'Pending') === advPayFilter);

        const counts = ADV_STATUSES.reduce((acc, st) => {
          acc[st] = shipments.filter(s => (s.advancePaymentStatus || 'Pending') === st).length;
          return acc;
        }, {});

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {ADV_STATUSES.map(st => (
                <button key={st} onClick={() => setAdvPayFilter(advPayFilter === st ? 'All' : st)}
                  style={{
                    padding: '14px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                    background: advPayFilter === st ? `${ADV_COLORS[st]}20` : `${ADV_COLORS[st]}0a`,
                    border: `1px solid ${advPayFilter === st ? ADV_COLORS[st] : ADV_COLORS[st] + '30'}`,
                    transition: 'all 0.15s',
                  }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: ADV_COLORS[st], textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{st}</div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: ADV_COLORS[st], lineHeight: 1 }}>{counts[st]}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>shipments</div>
                </button>
              ))}
            </div>

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Filter:</span>
              {['All', ...ADV_STATUSES].map(st => (
                <button key={st} onClick={() => setAdvPayFilter(st)}
                  style={{
                    padding: '4px 14px', borderRadius: 20, fontSize: '0.78rem', fontWeight: 600,
                    background: advPayFilter === st ? (ADV_COLORS[st] ? `${ADV_COLORS[st]}20` : 'rgba(255,107,0,0.15)') : 'transparent',
                    border: `1px solid ${advPayFilter === st ? (ADV_COLORS[st] || 'var(--orange-primary)') : 'var(--border-glass)'}`,
                    color: advPayFilter === st ? (ADV_COLORS[st] || 'var(--orange-primary)') : 'var(--text-muted)',
                    cursor: 'pointer',
                  }}>
                  {st}
                </button>
              ))}
            </div>

            {/* Shipments table */}
            <div style={{ borderRadius: 12, border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead style={{ background: 'var(--bg-secondary)' }}>
                  <tr>
                    {['REF ID','CONTAINER #','CUSTOMER','VESSEL','ETD','ETA','ADVANCE STATUS'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>No shipments found</td></tr>
                  ) : filtered.map((s, i) => {
                    const refId = s.order?.referenceId || s.shipmentRefId;
                    const advStatus = s.advancePaymentStatus || 'Pending';
                    const color = ADV_COLORS[advStatus] || '#94a3b8';
                    return (
                      <tr key={s.id} style={{ borderTop: '1px solid var(--border-glass-light)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--orange-primary)', fontWeight: 700 }}>{refId ? `#${refId}` : '—'}</td>
                        <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.78rem' }}>{s.containerNumber || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>{s.contact?.name || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>{s.vesselName || '—'}</td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>{s.vesselDeparture ? new Date(s.vesselDeparture).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '—'}</td>
                        <td style={{ padding: '10px 14px', whiteSpace: 'nowrap', color: '#22c55e' }}>{s.vesselEta ? new Date(s.vesselEta).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) : '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <select
                            value={advStatus}
                            onChange={async e => {
                              const val = e.target.value;
                              try {
                                await shipmentsApi.update(s.id, { advancePaymentStatus: val });
                                setShipments(prev => prev.map(x => x.id === s.id ? { ...x, advancePaymentStatus: val } : x));
                              } catch (err) { alert('Failed: ' + err.message); }
                            }}
                            style={{
                              background: `${color}15`, color,
                              border: `1px solid ${color}40`,
                              borderRadius: 20, padding: '3px 12px',
                              fontSize: '0.75rem', fontWeight: 700,
                              cursor: 'pointer', outline: 'none',
                            }}
                          >
                            {ADV_STATUSES_LIST.map(st => <option key={st} value={st}>{st}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {activeTab === 'aos' && (() => {
        const withActivity = shipments.filter(s => (s.expenses || []).length > 0 && (
          !search ||
          (s.label || '').toLowerCase().includes(search.toLowerCase()) ||
          (s.containerNumber || '').toLowerCase().includes(search.toLowerCase()) ||
          (s.grower || '').toLowerCase().includes(search.toLowerCase()) ||
          (s.contact?.name || '').toLowerCase().includes(search.toLowerCase())
        ));
        return (
          <div style={{ borderRadius: 12, border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead style={{ background: 'var(--bg-secondary)' }}>
                <tr>
                  {['REF ID', 'CONTAINER #', 'GROWER', 'TOTAL REVENUE', 'TOTAL EXPENSES', 'NET PROFIT', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {withActivity.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    No shipments with expense/revenue entries yet. Add them from Shipment Detail → Expenses & Revenue.
                  </td></tr>
                ) : withActivity.map((s, i) => {
                  const refId = s.order?.referenceId || s.shipmentRefId;
                  const rev = (s.expenses || []).filter(e => e.isRevenue).reduce((a, e) => a + (e.amount || 0), 0);
                  const exp = (s.expenses || []).filter(e => !e.isRevenue).reduce((a, e) => a + (e.amount || 0), 0);
                  const net = rev - exp;
                  return (
                    <tr key={s.id} style={{ borderTop: '1px solid var(--border-glass-light)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: 'var(--orange-primary)', fontWeight: 700 }}>{refId ? `#${refId}` : '—'}</td>
                      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '0.78rem' }}>{s.containerNumber || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>{s.grower || '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#22c55e', fontWeight: 700 }}>${rev.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px 14px', color: '#f59e0b', fontWeight: 700 }}>${exp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px 14px', color: net >= 0 ? '#22c55e' : '#ef4444', fontWeight: 800 }}>{net >= 0 ? '+' : '-'}${Math.abs(net).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        <button className="btn btn-glass" style={{ padding: '5px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => setAosShipment(s)}>
                          <FileSpreadsheet size={13} /> View AOS
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {showCreateModal && <CreateInvoiceModal onClose={() => setShowCreateModal(false)} onSaved={() => { setShowCreateModal(false); loadData(); }} />}
      {docsPo && <PODocsModal po={docsPo} onClose={() => setDocsPo(null)} />}
      {aosShipment && <AccountOfSaleModal shipment={aosShipment} onClose={() => setAosShipment(null)} onSaved={loadData} />}
    </div>
  );
};

export default AccountingPage;
