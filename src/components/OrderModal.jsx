import React, { useState, useEffect } from 'react';
import { ShoppingBag, X, Loader2 } from 'lucide-react';
import { contactsApi } from '../services/api';

// ── Product / Variety catalogue ──────────────────────────────
const PRODUCTS = {
  'Orange':   ['Navel', 'Valencia', 'Maroc Late', 'Blood Orange', 'Cara Cara', 'Other'],
  'Mandarin': ['Nadorcott', 'W Murcott', 'Clementines', 'Tango', 'Other'],
  'Lemon':    ['Eureka', 'Lisbon', 'Meyer', 'Other'],
  'Lime':     ['Persian', 'Key Lime', 'Kaffir', 'Other'],
};

const EMPTY = {
  grower: '',
  shipper: '',
  product: 'Mandarin',
  label: '',
  variety: 'Nadorcott',
  boxType: '',
  boxQuantity: '',
  purchasePrice: '',
  salePrice: '',
  expense: '',
  receiver: '',
  week: '',
  contactId: ''
};

const Field = ({ label, children, span2 = false }) => (
  <div style={span2 ? { gridColumn: '1 / -1' } : {}}>
    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6, letterSpacing: '0.05em' }}>
      {label}
    </label>
    {children}
  </div>
);

const OrderModal = ({ isOpen, onClose, onAdd, onEdit, initialData, customers, userRole, userContactId }) => {
  const isEdit = !!initialData;
  const isCustomer = userRole === 'customer';

  const [form, setForm] = useState({ ...EMPTY });
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', company: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setForm({
        grower:        initialData.grower || '',
        shipper:       initialData.shipper || '',
        product:       initialData.product || 'Mandarin',
        label:         initialData.label || '',
        variety:       initialData.variety || '',
        boxType:       initialData.boxType || '',
        boxQuantity:   initialData.boxQuantity || '',
        purchasePrice: initialData.purchasePrice || '',
        salePrice:     initialData.salePrice || '',
        expense:       initialData.expense || '',
        receiver:      initialData.receiver || '',
        week:          initialData.week || '',
        contactId:     initialData.contactId || ''
      });
    } else {
      setForm({ ...EMPTY, contactId: isCustomer ? (userContactId || '') : '' });
      setIsNewCustomer(false);
    }
  }, [isOpen, initialData]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // When product changes, reset variety to first option
  const handleProductChange = (product) => {
    const varieties = PRODUCTS[product] || [];
    set('product', product);
    set('variety', varieties[0] || '');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!form.product || !form.variety || !form.boxQuantity) {
      alert('Product, Variety and Box Quantity are required');
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

      const data = { ...form, contactId: finalContactId };
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
        style={{ width: 680, maxWidth: '96vw', maxHeight: '92vh', overflowY: 'auto', padding: 0 }}
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
              <Field label="BOX TYPE">
                <input className="ui-input" placeholder="e.g. 5kg, 10kg, 15kg" value={form.boxType} onChange={e => set('boxType', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Grower */}
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.08em' }}>PARTIES</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 300 }}>
              <Field label="GROWER">
                <input className="ui-input" placeholder="Grower name" value={form.grower} onChange={e => set('grower', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Pricing */}
          <div>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, letterSpacing: '0.08em' }}>PRICING</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
              <Field label="BOX QTY *">
                <input type="number" className="ui-input" placeholder="0" min="0" value={form.boxQuantity} onChange={e => set('boxQuantity', e.target.value)} />
              </Field>
              <Field label="PURCHASE PRICE / BOX ($)">
                <input type="number" className="ui-input" placeholder="0.00" step="0.01" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} />
              </Field>
              <Field label="SALE PRICE / BOX ($)">
                <input type="number" className="ui-input" placeholder="0.00" step="0.01" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} />
              </Field>
              <Field label="EXPENSE ($)">
                <input type="number" className="ui-input" placeholder="0.00" step="0.01" value={form.expense} onChange={e => set('expense', e.target.value)} />
              </Field>
            </div>
            {/* Summary */}
            {(form.purchasePrice || form.salePrice) && form.boxQuantity && (
              <div style={{ marginTop: 12, display: 'flex', gap: 24, padding: '10px 14px', background: 'rgba(255,107,0,0.05)', borderRadius: 8, fontSize: '0.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total Purchase: <strong style={{ color: 'var(--text-primary)' }}>${((parseFloat(form.purchasePrice) || 0) * (parseInt(form.boxQuantity) || 0)).toLocaleString()}</strong></span>
                <span style={{ color: 'var(--text-muted)' }}>Total Sale: <strong style={{ color: '#22c55e' }}>${((parseFloat(form.salePrice) || 0) * (parseInt(form.boxQuantity) || 0)).toLocaleString()}</strong></span>
                {form.salePrice && form.purchasePrice && (
                  <span style={{ color: 'var(--text-muted)' }}>Margin: <strong style={{ color: (parseFloat(form.salePrice) - parseFloat(form.purchasePrice)) >= 0 ? '#22c55e' : '#ef4444' }}>
                    ${(((parseFloat(form.salePrice) || 0) - (parseFloat(form.purchasePrice) || 0)) * (parseInt(form.boxQuantity) || 0)).toLocaleString()}
                  </strong></span>
                )}
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
