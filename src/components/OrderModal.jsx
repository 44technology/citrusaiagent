import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, Loader2, Plus, Trash2, Calculator } from 'lucide-react';
import { contactsApi } from '../services/api';

// ── Product / Variety catalogue ──────────────────────────────
const PRODUCTS = {
  'Orange':   ['Navel', 'Valencia', 'Maroc Late', 'Blood Orange', 'Cara Cara', 'Other'],
  'Mandarin': ['Nadorcott', 'W Murcott', 'Clementines', 'Tango', 'Other'],
  'Lemon':    ['Eureka', 'Lisbon', 'Meyer', 'Other'],
  'Lime':     ['Persian', 'Key Lime', 'Kaffir', 'Other'],
};

const EMPTY_ROW = { boxType: '', size: '', boxQty: '', price: '' };

const EMPTY = {
  grower: '',
  product: 'Mandarin',
  label: '',
  variety: 'Nadorcott',
  boxQuantity: '',
  purchasePrice: '',
  salePrice: '',
  expense: '',
  week: '',
  contactId: '',
  advancePaymentTerms: '',
  advancePaymentPct: '',
  advancePaymentAmount: '',
};

const Field = ({ label, children, span2 = false }) => (
  <div style={span2 ? { gridColumn: '1 / -1' } : {}}>
    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>
      {label}
    </label>
    {children}
  </div>
);

// ── Inline P&L Calculator ────────────────────────────────────
const OrderPLCalculator = ({ totalPrice, totalBoxQty }) => {
  const [open, setOpen] = useState(false);
  const [salePrice, setSalePrice] = useState('');
  const [freight, setFreight] = useState('');
  const [customs, setCustoms] = useState('');
  const [handling, setHandling] = useState('');
  const [otherExp, setOtherExp] = useState('');

  const totalExpense = [freight, customs, handling, otherExp].reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalSale = (parseFloat(salePrice) || 0) * totalBoxQty;
  const netProfit = totalSale - totalPrice - totalExpense;

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
          background: 'rgba(255,107,0,0.06)', border: '1px dashed rgba(255,107,0,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          color: 'var(--orange-primary)', fontSize: '0.85rem', fontWeight: 600,
        }}>
        <Calculator size={16} /> Open P&L Calculator
      </button>
    );
  }

  return (
    <div style={{ padding: 16, borderRadius: 12, background: '#1a1f2e', border: '1px solid rgba(255,107,0,0.25)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calculator size={15} style={{ color: 'var(--orange-primary)' }} />
          <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>P&L Calculator</span>
        </div>
        <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
          <X size={14} />
        </button>
      </div>

      {/* Purchase total (from box rows) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 10 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Purchase (from box rows)</span>
        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>SALE PRICE / BOX ($)</label>
          <input type="number" step="0.01" className="ui-input" placeholder="0.00" value={salePrice} onChange={e => setSalePrice(e.target.value)} style={{ fontSize: '0.84rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>FREIGHT ($)</label>
          <input type="number" step="0.01" className="ui-input" placeholder="0.00" value={freight} onChange={e => setFreight(e.target.value)} style={{ fontSize: '0.84rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>CUSTOMS ($)</label>
          <input type="number" step="0.01" className="ui-input" placeholder="0.00" value={customs} onChange={e => setCustoms(e.target.value)} style={{ fontSize: '0.84rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>HANDLING ($)</label>
          <input type="number" step="0.01" className="ui-input" placeholder="0.00" value={handling} onChange={e => setHandling(e.target.value)} style={{ fontSize: '0.84rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>OTHER EXPENSE ($)</label>
          <input type="number" step="0.01" className="ui-input" placeholder="0.00" value={otherExp} onChange={e => setOtherExp(e.target.value)} style={{ fontSize: '0.84rem' }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ width: '100%', padding: '8px 12px', borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div style={{ fontSize: '0.65rem', color: '#f59e0b', fontWeight: 700, marginBottom: 2 }}>TOTAL EXPENSE</div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f59e0b' }}>${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 6 }}>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>TOTAL SALE</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22c55e' }}>${totalSale.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>TOTAL COST</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ef4444' }}>${(totalPrice + totalExpense).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style={{ padding: '10px 12px', borderRadius: 8, background: netProfit >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', textAlign: 'center', border: `1px solid ${netProfit >= 0 ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}` }}>
          <div style={{ fontSize: '0.65rem', color: netProfit >= 0 ? '#22c55e' : '#ef4444', fontWeight: 600, marginBottom: 2 }}>NET PROFIT</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: netProfit >= 0 ? '#22c55e' : '#ef4444' }}>${Math.abs(netProfit).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>
    </div>
  );
};

const OrderModal = ({ isOpen, onClose, onAdd, onEdit, initialData, customers, userRole, userContactId }) => {
  const isEdit = !!initialData;
  const isCustomer = userRole === 'customer';

  const [form, setForm] = useState({ ...EMPTY });
  const [boxRows, setBoxRows] = useState([{ ...EMPTY_ROW }]);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', company: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        grower:        initialData.grower || '',
        product:       initialData.product || 'Mandarin',
        label:         initialData.label || '',
        variety:       initialData.variety || '',
        boxQuantity:   initialData.boxQuantity || '',
        purchasePrice: initialData.purchasePrice || '',
        salePrice:     initialData.salePrice || '',
        expense:       initialData.expense || '',
        week:          initialData.week || '',
        contactId:     initialData.contactId || '',
        advancePaymentTerms:  initialData.advancePaymentTerms || '',
        advancePaymentPct:    initialData.advancePaymentPct || '',
        advancePaymentAmount: initialData.advancePaymentAmount || '',
      });
      // Parse boxRows from boxType JSON if exists
      try {
        const parsed = JSON.parse(initialData.boxType || '[]');
        setBoxRows(Array.isArray(parsed) && parsed.length > 0 ? parsed : [{ ...EMPTY_ROW }]);
      } catch {
        setBoxRows(initialData.boxType ? [{ boxType: initialData.boxType, size: '', boxQty: initialData.boxQuantity || '', price: '' }] : [{ ...EMPTY_ROW }]);
      }
    } else {
      setForm({ ...EMPTY, contactId: isCustomer ? (userContactId || '') : '' });
      setBoxRows([{ ...EMPTY_ROW }]);
      setIsNewCustomer(false);
    }
  }, [isOpen, initialData]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleProductChange = (product) => {
    const varieties = PRODUCTS[product] || [];
    set('product', product);
    set('variety', varieties[0] || '');
  };

  // Box rows helpers
  const updateRow = (idx, field, value) => {
    setBoxRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };
  const addRow = () => setBoxRows(prev => [...prev, { ...EMPTY_ROW }]);
  const removeRow = (idx) => setBoxRows(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));

  // Calculated totals from box rows
  const totalBoxQty = boxRows.reduce((s, r) => s + (parseInt(r.boxQty) || 0), 0);
  const totalPrice = boxRows.reduce((s, r) => {
    const qty = parseInt(r.boxQty) || 0;
    const price = parseFloat(r.price) || 0;
    return s + (qty * price);
  }, 0);

  // Row weight = boxType (kg) × boxQty
  const rowWeight = (r) => {
    const kg = parseFloat(r.boxType) || 0;
    const qty = parseInt(r.boxQty) || 0;
    return kg > 0 && qty > 0 ? (kg * qty).toLocaleString() : '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.product || !form.variety || totalBoxQty === 0) {
      alert('Product, Variety and at least one box row with quantity are required');
      return;
    }
    setSubmitting(true);
    try {
      let finalContactId = form.contactId;
      if (!isEdit && isNewCustomer) {
        if (!newCustomer.name || !newCustomer.phone) { alert('Please fill customer name and phone'); setSubmitting(false); return; }
        const created = await contactsApi.create({ ...newCustomer, type: 'Customer' });
        finalContactId = created.id;
      }
      if (!finalContactId) { alert('Please select a customer'); setSubmitting(false); return; }

      const data = {
        ...form,
        contactId: finalContactId,
        boxQuantity: totalBoxQty,
        boxType: JSON.stringify(boxRows.filter(r => r.boxType || r.boxQty)),
        purchasePrice: totalPrice > 0 ? totalPrice : (parseFloat(form.purchasePrice) || null),
      };
      if (isEdit) await onEdit(initialData.id, data);
      else await onAdd(data);
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save order: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  const varieties = PRODUCTS[form.product] || [];

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="modal-content glass-panel"
        style={{ width: 740, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-glass-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 10 }}>
          <div className="flex-center gap-3">
            <ShoppingBag className="text-orange" size={22} />
            <div>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{isEdit ? `Order #${initialData?.referenceId}` : 'New Order'}</h2>
              {isEdit && <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Edit order details</p>}
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Customer */}
          {!isCustomer && (
            <div style={{ background: 'rgba(255,107,0,0.04)', borderRadius: 10, padding: 16, border: '1px solid var(--border-glass-light)' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 10 }}>CUSTOMER</label>
              {!isEdit && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <button type="button" className={`btn ${!isNewCustomer ? 'btn-primary' : 'btn-glass'}`} style={{ flex: 1, fontSize: '0.82rem' }} onClick={() => setIsNewCustomer(false)}>Existing</button>
                  <button type="button" className={`btn ${isNewCustomer ? 'btn-primary' : 'btn-glass'}`} style={{ flex: 1, fontSize: '0.82rem' }} onClick={() => setIsNewCustomer(true)}>+ New Customer</button>
                </div>
              )}
              {isNewCustomer && !isEdit ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input className="ui-input" placeholder="Name *" value={newCustomer.name} onChange={e => setNewCustomer(p => ({ ...p, name: e.target.value }))} />
                  <input className="ui-input" placeholder="Phone *" value={newCustomer.phone} onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))} />
                  <input className="ui-input" placeholder="Email" value={newCustomer.email} onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))} />
                  <input className="ui-input" placeholder="Company" value={newCustomer.company} onChange={e => setNewCustomer(p => ({ ...p, company: e.target.value }))} />
                </div>
              ) : (
                <select className="ui-select" value={form.contactId} onChange={e => set('contactId', e.target.value)} style={{ width: '100%' }}>
                  <option value="">-- Select Customer --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company && c.company !== 'N/A' ? ` — ${c.company}` : ''}</option>)}
                </select>
              )}
            </div>
          )}

          {/* Ref ID (read-only on edit) */}
          {isEdit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,107,0,0.06)', borderRadius: 8, border: '1px solid rgba(255,107,0,0.2)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>REF ID</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--orange-primary)' }}>#{initialData?.referenceId}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>Auto-generated</span>
            </div>
          )}

          {/* Product & Variety */}
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.08em' }}>PRODUCT</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Field label="PRODUCT *">
                <select className="ui-select" value={form.product} onChange={e => handleProductChange(e.target.value)}>
                  {Object.keys(PRODUCTS).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="VARIETY *">
                <select className="ui-select" value={form.variety} onChange={e => set('variety', e.target.value)}>
                  {varieties.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </Field>
              <Field label="LABEL (optional)">
                <input className="ui-input" placeholder="e.g. Sweet Fresh" value={form.label} onChange={e => set('label', e.target.value)} />
              </Field>
              <Field label="GROWER">
                <input className="ui-input" placeholder="Grower name" value={form.grower} onChange={e => set('grower', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Box Rows Table */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', margin: 0, letterSpacing: '0.08em' }}>BOX DETAILS</p>
              <button type="button" className="btn btn-glass" style={{ padding: '4px 12px', fontSize: '0.76rem' }} onClick={addRow}>
                <Plus size={13} /> Add Row
              </button>
            </div>
            <div style={{ borderRadius: 10, border: '1px solid var(--border-glass)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,107,0,0.08)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--orange-primary)', letterSpacing: '0.05em' }}>BOX TYPE (kg)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--orange-primary)', letterSpacing: '0.05em' }}>SIZE</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--orange-primary)', letterSpacing: '0.05em' }}>BOX QTY</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--orange-primary)', letterSpacing: '0.05em' }}>PRICE ($)</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>WEIGHT</th>
                    <th style={{ padding: '8px 6px', width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {boxRows.map((row, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid var(--border-glass-light)' }}>
                      <td style={{ padding: '6px 10px' }}>
                        <input className="ui-input" placeholder="e.g. 17" value={row.boxType} onChange={e => updateRow(idx, 'boxType', e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '0.82rem', width: '100%' }} />
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <input className="ui-input" placeholder="e.g. 113" value={row.size} onChange={e => updateRow(idx, 'size', e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '0.82rem', width: '100%' }} />
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <input type="number" className="ui-input" placeholder="0" value={row.boxQty} onChange={e => updateRow(idx, 'boxQty', e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '0.82rem', width: '100%' }} />
                      </td>
                      <td style={{ padding: '6px 10px' }}>
                        <input type="number" step="0.01" className="ui-input" placeholder="0.00" value={row.price} onChange={e => updateRow(idx, 'price', e.target.value)}
                          style={{ padding: '5px 8px', fontSize: '0.82rem', width: '100%' }} />
                      </td>
                      <td style={{ padding: '6px 10px', color: '#22c55e', fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {rowWeight(row) ? `${rowWeight(row)} kg` : '—'}
                      </td>
                      <td style={{ padding: '6px 4px' }}>
                        {boxRows.length > 1 && (
                          <button type="button" onClick={() => removeRow(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.5)', padding: 2 }}
                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.color = 'rgba(239,68,68,0.5)'}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals */}
                <tfoot>
                  <tr style={{ borderTop: '2px solid var(--border-glass)', background: 'rgba(255,107,0,0.04)' }}>
                    <td colSpan={2} style={{ padding: '8px 12px', fontWeight: 700, fontSize: '0.78rem', color: 'var(--orange-primary)' }}>TOTALS</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalBoxQty || '—'}</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#22c55e' }}>{totalPrice > 0 ? `$${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                    <td colSpan={2} style={{ padding: '8px 12px', fontWeight: 700, color: '#22c55e' }}>
                      {boxRows.reduce((s, r) => s + ((parseFloat(r.boxType) || 0) * (parseInt(r.boxQty) || 0)), 0) > 0
                        ? `${boxRows.reduce((s, r) => s + ((parseFloat(r.boxType) || 0) * (parseInt(r.boxQty) || 0)), 0).toLocaleString()} kg`
                        : ''}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* P&L Calculator (inline) */}
          <OrderPLCalculator totalPrice={totalPrice} totalBoxQty={totalBoxQty} />

          {/* Advance Payment */}
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.08em' }}>ADVANCE PAYMENT</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <Field label="TERMS (DAYS)">
                <input type="number" className="ui-input" placeholder="e.g. 15, 30" min="0" value={form.advancePaymentTerms}
                  onChange={e => set('advancePaymentTerms', e.target.value)}
                />
              </Field>
              <Field label="ADVANCE (%)">
                <input type="number" className="ui-input" placeholder="e.g. 70" min="0" max="100" value={form.advancePaymentPct}
                  onChange={e => {
                    const pct = e.target.value;
                    set('advancePaymentPct', pct);
                    if (pct && totalPrice > 0) {
                      set('advancePaymentAmount', ((parseFloat(pct) / 100) * totalPrice).toFixed(2));
                    }
                  }}
                />
              </Field>
              <Field label="ADVANCE AMOUNT ($)">
                <input type="number" className="ui-input" placeholder="Auto-calculated" step="0.01" value={form.advancePaymentAmount}
                  onChange={e => set('advancePaymentAmount', e.target.value)}
                  style={{ background: form.advancePaymentPct ? 'rgba(255,107,0,0.06)' : undefined }}
                />
              </Field>
            </div>
            {form.advancePaymentTerms && form.advancePaymentAmount && (
              <div style={{ marginTop: 10, padding: '8px 14px', background: 'rgba(34,197,94,0.06)', borderRadius: 8, fontSize: '0.82rem', color: '#22c55e' }}>
                Advance Payment: <strong>${parseFloat(form.advancePaymentAmount).toLocaleString()}</strong> due within <strong>{form.advancePaymentTerms} days</strong>
              </div>
            )}
          </div>

          {/* Week */}
          <Field label="WEEK / TIMING">
            <input className="ui-input" placeholder="e.g. Week 22, 2025" value={form.week} onChange={e => set('week', e.target.value)} />
          </Field>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
            <button type="button" className="btn btn-glass" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={submitting}>
              {submitting ? <><Loader2 className="animate-spin" size={18} /> Saving...</> : isEdit ? 'Update Order' : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OrderModal;
