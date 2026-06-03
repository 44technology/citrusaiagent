import React, { useState, useEffect } from 'react';
import {
  Receipt, FileText, ShoppingCart, Plus, Search, X,
  DollarSign, CreditCard, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronRight, Trash2, ArrowLeft
} from 'lucide-react';
import { accountingApi, paymentsApi, shipmentsApi } from '../services/api';

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

const PaymentModal = ({ invoice, onClose, onSaved }) => {
  const remaining = invoice.amount - paidAmount(invoice);
  const [form, setForm] = useState({ amount: remaining > 0 ? remaining.toFixed(2) : '', method: 'Bank Transfer', reference: '', notes: '', paidAt: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount must be greater than 0'); return; }
    setSaving(true);
    try {
      await paymentsApi.create(invoice.id, form);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem' }}>Record Payment — {invoice.invoiceNumber}</h2>
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
          {error && <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Record Payment'}</button>
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
  const [deleting, setDeleting] = useState(null);

  const reload = async () => { onRefresh(); };

  const handlePaymentSaved = () => { setShowPaymentModal(false); reload(); };

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

  const paid = paidAmount(invoice);
  const remaining = invoice.amount - paid;

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
        <div style={{ marginLeft: 'auto' }}><StatusBadge status={invoice.status} /></div>
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
          {invoice.notes && <p className="text-muted" style={{ fontSize: '0.82rem', marginTop: 8 }}>{invoice.notes}</p>}
        </div>
      </div>

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
                  <td>
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

      {showPaymentModal && (
        <PaymentModal invoice={invoice} onClose={() => setShowPaymentModal(false)} onSaved={handlePaymentSaved} />
      )}
    </div>
  );
};

// ─── Create Invoice Modal ────────────────────────────────────────────────────

const CreateInvoiceModal = ({ onClose, onSaved }) => {
  const [form, setForm] = useState({ invoiceNumber: `INV-${Date.now()}`, type: 'Sales', amount: '', issueDate: new Date().toISOString().slice(0, 10), dueDate: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) { setError('Amount is required'); return; }
    setSaving(true);
    try {
      await accountingApi.createInvoice(form);
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.2rem' }}>New Invoice</h2>
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
          {error && <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Invoice'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main AccountingPage ─────────────────────────────────────────────────────

const AccountingPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('invoices');
  const [advPayFilter, setAdvPayFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      if (selectedInvoice) {
        const updated = allInvoices.find(i => i.id === selectedInvoice.id);
        if (updated) setSelectedInvoice(updated);
      }
    } catch (err) {
      console.error('Failed to load accounting data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = !search ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.order?.referenceId?.toLowerCase().includes(search.toLowerCase()) ||
      inv.order?.contact?.name?.toLowerCase().includes(search.toLowerCase()) ||
      inv.purchaseOrder?.supplier?.name?.toLowerCase().includes(search.toLowerCase());
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
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="glass-panel" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <Search size={16} className="text-muted" />
          <input className="ui-input" style={{ border: 'none', background: 'transparent', flex: 1 }} placeholder={activeTab === 'invoices' ? 'Search invoices...' : 'Search purchase orders...'} value={search} onChange={e => setSearch(e.target.value)} />
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
                <th>AMOUNT</th>
                <th>PAID</th>
                <th>PROGRESS</th>
                <th>STATUS</th>
                <th>DUE DATE</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40 }}>Loading invoices...</td></tr>
              ) : filteredInvoices.length === 0 ? (
                <tr><td colSpan="9" style={{ textAlign: 'center', padding: 40 }}>No invoices found.</td></tr>
              ) : filteredInvoices.map(inv => {
                const paid = paidAmount(inv);
                const pct = inv.amount > 0 ? Math.min((paid / inv.amount) * 100, 100) : 0;
                const isOverdue = inv.status !== 'Paid' && inv.dueDate && new Date(inv.dueDate) < new Date();
                const party = inv.order?.contact?.name || inv.purchaseOrder?.supplier?.name || '—';
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
                    </td>
                    <td style={{ fontWeight: 700 }}>{fmt(inv.amount)}</td>
                    <td style={{ color: '#22c55e', fontWeight: 600 }}>{fmt(paid)}</td>
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
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
              ) : filteredPOs.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: 40 }}>No purchase orders found.</td></tr>
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
                          <span style={{ background: `${color}15`, color, border: `1px solid ${color}40`, borderRadius: 20, padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700 }}>
                            {advStatus}
                          </span>
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

      {showCreateModal && <CreateInvoiceModal onClose={() => setShowCreateModal(false)} onSaved={() => { setShowCreateModal(false); loadData(); }} />}
    </div>
  );
};

export default AccountingPage;
