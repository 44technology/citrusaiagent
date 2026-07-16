import React, { useState, useEffect } from 'react';
import { Leaf, Plus, Search, X, ChevronDown, ChevronRight, Phone, Mail, Building, DollarSign, Package, Loader2, Trash2, FolderOpen, Edit3, Save } from 'lucide-react';
import { contactsApi, ordersApi } from '../services/api';

import { PRODUCTS } from '../constants/products';

// ── Add Grower Modal ──────────────────────────────────────────
const AddGrowerModal = ({ onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '',
    country: 'Morocco', region: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.name) { alert('Grower name is required'); return; }
    setSaving(true);
    try {
      await contactsApi.create({
        name: form.name,
        company: form.company || 'N/A',
        phone: form.phone || 'N/A',
        email: form.email || 'N/A',
        type: 'Grower',
        department: form.region || '',
        language: form.country || 'Morocco',
        status: 'Active',
      });
      onSaved();
      onClose();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ maxWidth: 480, padding: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-glass-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="flex-center gap-2">
            <Leaf size={18} className="text-orange" />
            <h3 style={{ margin: 0 }}>Add Grower</h3>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            { label: 'GROWER NAME *', key: 'name', placeholder: 'e.g. Ahmed Farms' },
            { label: 'COMPANY', key: 'company', placeholder: 'Company name' },
            { label: 'PHONE', key: 'phone', placeholder: '+212 ...' },
            { label: 'EMAIL', key: 'email', placeholder: 'email@example.com' },
            { label: 'COUNTRY', key: 'country', placeholder: 'Morocco' },
            { label: 'REGION', key: 'region', placeholder: 'e.g. Agadir, Souss-Massa' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>{label}</label>
              <input className="ui-input" placeholder={placeholder} value={form[key]} onChange={e => set(key, e.target.value)} style={{ width: '100%' }} />
            </div>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-glass" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Save Grower'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Add Offer Modal ───────────────────────────────────────────
const AddOfferModal = ({ grower, onClose, onSaved }) => {
  const [form, setForm] = useState({
    product: 'Mandarin', variety: 'Nadorcott',
    purchasePrice: '', incoterm: 'FOB', paymentTerms: '',
    departureWeek: '', producer: grower.name || '',
    fclCount: '', arrivalPort: '', quality: '', sizes: '',
    fclBoxes: '', boxType: '', boxQuantity: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Total boxes auto-derives from FCL × FCL BOXES unless typed manually
  const autoTotal = (parseInt(form.fclCount) || 0) * (parseInt(form.fclBoxes) || 0);
  const totalBoxes = form.boxQuantity !== '' ? parseInt(form.boxQuantity) || 0 : autoTotal;

  const handleSave = async () => {
    if (!form.product || !form.variety || !form.purchasePrice || totalBoxes === 0) {
      alert('Please fill Product, Variety, Price and FCL / Boxes');
      return;
    }
    setSaving(true);
    try {
      // One order per container — each gets its own reference number
      const containers = Math.max(1, parseInt(form.fclCount) || 1);
      const boxesPerContainer = parseInt(form.fclBoxes) || Math.round(totalBoxes / containers);
      const base = {
        product: form.product,
        variety: form.variety,
        boxType: form.boxType,
        purchasePrice: form.purchasePrice,
        incoterm: form.incoterm,
        paymentTerms: form.paymentTerms,
        departureWeek: form.departureWeek,
        producer: form.producer,
        fclCount: 1,
        fclBoxes: form.fclBoxes,
        arrivalPort: form.arrivalPort,
        quality: form.quality,
        sizes: form.sizes,
        grower: grower.name,
        contactId: grower.id,
        status: 'offer',
      };
      const created = [];
      // Sequential — server generates consecutive reference IDs
      for (let i = 0; i < containers; i++) {
        const o = await ordersApi.create({ ...base, boxQuantity: boxesPerContainer });
        created.push(o.referenceId);
      }
      if (containers > 1) {
        alert(`${containers} orders created: ${created.map(r => '#' + r).join(', ')}`);
      }
      onSaved();
      onClose();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const varieties = PRODUCTS[form.product] || [];
  const F = ({ label, children }) => (
    <div>
      <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ maxWidth: 620, padding: 0, maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-glass-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--bg-primary)', zIndex: 5 }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={18} className="text-orange" /> Add Purchase Offer
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>from {grower.name}</p>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <F label="PRODUCT *">
              <select className="ui-select" value={form.product} onChange={e => { set('product', e.target.value); set('variety', PRODUCTS[e.target.value]?.[0] || ''); }}>
                {Object.keys(PRODUCTS).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </F>
            <F label="VARIETY *">
              <select className="ui-select" value={form.variety} onChange={e => set('variety', e.target.value)}>
                {varieties.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </F>
            <F label="PRICE ($) *">
              <input type="number" className="ui-input" placeholder="e.g. 15.50" step="0.01" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} />
            </F>
            <F label="INCOTERM *">
              <select className="ui-select" value={form.incoterm} onChange={e => set('incoterm', e.target.value)}>
                <option value="FOB">FOB</option>
                <option value="CIF">CIF</option>
                <option value="DDP">DDP</option>
              </select>
            </F>
            <F label="PAYMENT">
              <input className="ui-input" placeholder="e.g. 100% UPFRONT" value={form.paymentTerms} onChange={e => set('paymentTerms', e.target.value)} />
            </F>
            <F label="ETD WEEK">
              <input type="number" className="ui-input" placeholder="e.g. 30" min="1" max="53" value={form.departureWeek} onChange={e => set('departureWeek', e.target.value)} />
            </F>
            <F label="PRODUCER">
              <input className="ui-input" placeholder="Producer name" value={form.producer} onChange={e => set('producer', e.target.value)} />
            </F>
            <F label="DESTINATION">
              <input className="ui-input" placeholder="e.g. PHILLY" value={form.arrivalPort} onChange={e => set('arrivalPort', e.target.value)} />
            </F>
            <F label="QUALITY">
              <input className="ui-input" placeholder="e.g. CAT 1" value={form.quality} onChange={e => set('quality', e.target.value)} />
            </F>
            <F label="SIZE">
              <input className="ui-input" placeholder="e.g. 100s 50% AND 113s 50%" value={form.sizes} onChange={e => set('sizes', e.target.value)} />
            </F>
            <F label="FCL (CONTAINERS)">
              <input type="number" className="ui-input" placeholder="e.g. 3" value={form.fclCount} onChange={e => set('fclCount', e.target.value)} />
            </F>
            <F label="FCL BOXES (PER CONTAINER)">
              <input type="number" className="ui-input" placeholder="e.g. 1480" value={form.fclBoxes} onChange={e => set('fclBoxes', e.target.value)} />
            </F>
            <F label="NET WEIGHT (BOX)">
              <input className="ui-input" placeholder="e.g. 17-18KG" value={form.boxType} onChange={e => set('boxType', e.target.value)} />
            </F>
            <F label={`TOTAL BOXES ${autoTotal > 0 ? '(auto: FCL × FCL BOXES)' : '*'}`}>
              <input type="number" className="ui-input" placeholder={autoTotal > 0 ? String(autoTotal) : '0'} value={form.boxQuantity} onChange={e => set('boxQuantity', e.target.value)}
                style={{ background: autoTotal > 0 && form.boxQuantity === '' ? 'rgba(255,107,0,0.06)' : undefined }} />
            </F>
          </div>

          {form.purchasePrice && totalBoxes > 0 && (
            <div style={{ padding: '10px 14px', background: 'rgba(255,107,0,0.06)', borderRadius: 8, fontSize: '0.85rem', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <span>Total Boxes: <strong>{totalBoxes.toLocaleString()}</strong></span>
              <span>Offer Value: <strong style={{ color: 'var(--orange-primary)' }}>
                ${(parseFloat(form.purchasePrice) * totalBoxes).toLocaleString('en-US', { minimumFractionDigits: 2 })} {form.incoterm}
              </strong></span>
              {(parseInt(form.fclCount) || 1) > 1 && (
                <span style={{ color: '#a3e635' }}>
                  → will create <strong>{form.fclCount} separate orders</strong> (one ref # per container)
                </span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn btn-glass" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Add Offer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Grower Card ───────────────────────────────────────────────
const GrowerCard = ({ grower, orders, onAddOffer, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState('orders');
  const [docs, setDocs] = useState([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const [infoForm, setInfoForm] = useState({});
  const [savingInfo, setSavingInfo] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [orderForm, setOrderForm] = useState({});
  const [savingOrder, setSavingOrder] = useState(false);

  const startEditOrder = (o) => {
    setEditingOrderId(o.id);
    setOrderForm({
      referenceId:   o.referenceId || '',
      product:       o.product || '',
      variety:       o.variety || '',
      boxType:       o.boxType || '',
      boxQuantity:   o.boxQuantity ?? '',
      purchasePrice: o.purchasePrice ?? '',
      departureWeek: o.departureWeek ?? '',
      arrivalWeek:   o.arrivalWeek ?? '',
      advancePaymentAmount: o.advancePaymentAmount ?? '',
      status:        o.status || 'offer',
    });
  };

  const saveOrderEdit = async () => {
    setSavingOrder(true);
    try {
      await ordersApi.update(editingOrderId, orderForm);
      setEditingOrderId(null);
      onRefresh();
    } catch (err) { alert('Save failed: ' + err.message); }
    finally { setSavingOrder(false); }
  };

  const currentUser = (() => { try { return JSON.parse(localStorage.getItem('citrus_user') || '{}'); } catch { return {}; } })();
  const isSuperAdmin = currentUser.role === 'super admin';

  const growerOrders = orders.filter(o =>
    o.grower?.toLowerCase() === grower.name?.toLowerCase() ||
    o.contactId === grower.id
  );

  const totalBoxes   = growerOrders.reduce((s, o) => s + (o.boxQuantity || 0), 0);
  const totalValue   = growerOrders.reduce((s, o) => s + ((o.purchasePrice || 0) * (o.boxQuantity || 0)), 0);
  const avgPrice     = growerOrders.length
    ? (growerOrders.reduce((s, o) => s + (o.purchasePrice || 0), 0) / growerOrders.length).toFixed(2)
    : null;

  const country = grower.language || 'Morocco';
  const region  = grower.department || '';

  const loadDocs = async () => {
    if (docsLoaded) return;
    try {
      const { documentsApi } = await import('../services/api');
      const data = await documentsApi.getAll({ contactId: grower.id });
      setDocs(Array.isArray(data) ? data : []);
    } catch { setDocs([]); }
    setDocsLoaded(true);
  };

  const handleTabChange = (t) => {
    setTab(t);
    if (t === 'documents') loadDocs();
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      const { documentsApi } = await import('../services/api');
      const failed = [];
      for (const file of files) {
        try {
          await documentsApi.upload(file, { contactId: grower.id, category: 'General' });
        } catch (err) {
          failed.push(`${file.name}: ${err.message}`);
        }
      }
      const data = await documentsApi.getAll({ contactId: grower.id });
      setDocs(Array.isArray(data) ? data : []);
      if (failed.length > 0) alert('Some uploads failed:\n' + failed.join('\n'));
    } catch (err) { alert('Upload failed: ' + err.message); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Delete this document?')) return;
    try {
      const { documentsApi } = await import('../services/api');
      await documentsApi.delete(docId);
      setDocs(d => d.filter(x => x.id !== docId));
    } catch (err) { alert('Delete failed: ' + err.message); }
  };

  return (
    <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14 }}
        onClick={() => setExpanded(p => !p)}
      >
        {/* Avatar */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, rgba(255,107,0,0.3), rgba(255,107,0,0.1))',
          border: '2px solid rgba(255,107,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', fontWeight: 700, color: 'var(--orange-primary)'
        }}>
          {grower.name?.charAt(0)?.toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{grower.name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {grower.company && grower.company !== 'N/A' && <span><Building size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> {grower.company}</span>}
            <span>🌍 {country}{region ? `, ${region}` : ''}</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--orange-primary)' }}>{growerOrders.length}</div>
            <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>Orders</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{totalBoxes.toLocaleString()}</div>
            <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>Boxes</div>
          </div>
          {avgPrice && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#22c55e' }}>${avgPrice}</div>
              <div style={{ fontSize: '0.67rem', color: 'var(--text-muted)' }}>Avg Price</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-primary" style={{ fontSize: '0.75rem', padding: '5px 10px', whiteSpace: 'nowrap' }}
              onClick={e => { e.stopPropagation(); onAddOffer(grower); }}>
              <Plus size={13} /> Offer
            </button>
            {expanded ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
          </div>
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ borderTop: '1px solid var(--border-glass-light)', background: 'rgba(255,255,255,0.02)' }}>
          {/* Contact info */}
          <div style={{ padding: '10px 20px', display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass-light)' }}>
            {grower.phone && grower.phone !== 'N/A' && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={13} /> {grower.phone}</span>}
            {grower.email && grower.email !== 'N/A' && <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={13} /> {grower.email}</span>}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, padding: '10px 20px 0', borderBottom: '1px solid var(--border-glass-light)' }}>
            {[
              ['orders', `Orders (${growerOrders.length})`, 'var(--orange-primary)'],
              ['info', 'Info', '#94a3b8'],
              ['documents', 'Documents', '#3b82f6'],
            ].map(([id, label, color]) => (
              <button key={id} onClick={() => handleTabChange(id)} style={{
                padding: '6px 16px', fontSize: '0.78rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                borderRadius: '8px 8px 0 0', background: tab === id ? 'rgba(255,255,255,0.06)' : 'transparent',
                color: tab === id ? color : 'var(--text-muted)',
                borderBottom: tab === id ? `2px solid ${color}` : '2px solid transparent',
              }}>{label}</button>
            ))}
          </div>

          <div style={{ padding: '14px 20px' }}>

            {/* Orders tab */}
            {tab === 'orders' && (
              growerOrders.length === 0
                ? <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No offers yet — click <strong>+ Offer</strong> to add one</div>
                : <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border-glass-light)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                          {['Ref ID', 'Product', 'Variety', 'Box Type', 'Qty', 'Purchase Price', 'Total', 'Dep. Week', 'Arr. Week', 'Adv. Payment', 'Status', 'Entered', ...(isSuperAdmin ? [''] : [])].map((h, hi) => (
                            <th key={hi} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {growerOrders.map((o, i) => {
                          const total = (o.purchasePrice || 0) * (o.boxQuantity || 0);
                          const isEditingRow = editingOrderId === o.id;
                          const inp = (key, opts = {}) => (
                            <input
                              className="ui-input"
                              type={opts.num ? 'number' : 'text'}
                              step={opts.step}
                              value={orderForm[key]}
                              onChange={e => setOrderForm(p => ({ ...p, [key]: e.target.value }))}
                              style={{ padding: '4px 8px', fontSize: '0.78rem', width: opts.w || 80 }}
                            />
                          );
                          if (isEditingRow) {
                            return (
                              <tr key={o.id} style={{ borderTop: '1px solid var(--border-glass-light)', background: 'rgba(255,107,0,0.05)' }}>
                                <td style={{ padding: '6px 10px' }}>{inp('referenceId', { w: 90 })}</td>
                                <td style={{ padding: '6px 10px' }}>
                                  <select className="ui-select" value={orderForm.product}
                                    onChange={e => setOrderForm(p => ({ ...p, product: e.target.value, variety: (PRODUCTS[e.target.value] || [])[0] || '' }))}
                                    style={{ padding: '4px 8px', fontSize: '0.78rem', width: 100 }}>
                                    {Object.keys(PRODUCTS).map(p => <option key={p} value={p}>{p}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '6px 10px' }}>
                                  <select className="ui-select" value={orderForm.variety}
                                    onChange={e => setOrderForm(p => ({ ...p, variety: e.target.value }))}
                                    style={{ padding: '4px 8px', fontSize: '0.78rem', width: 110 }}>
                                    {(PRODUCTS[orderForm.product] || []).map(v => <option key={v} value={v}>{v}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '6px 10px' }}>{inp('boxType', { w: 70 })}</td>
                                <td style={{ padding: '6px 10px' }}>{inp('boxQuantity', { num: true, w: 75 })}</td>
                                <td style={{ padding: '6px 10px' }}>{inp('purchasePrice', { num: true, step: '0.01', w: 80 })}</td>
                                <td style={{ padding: '6px 10px', fontWeight: 700, color: 'var(--orange-primary)', whiteSpace: 'nowrap' }}>
                                  ${((parseFloat(orderForm.purchasePrice) || 0) * (parseInt(orderForm.boxQuantity) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                </td>
                                <td style={{ padding: '6px 10px' }}>{inp('departureWeek', { num: true, w: 55 })}</td>
                                <td style={{ padding: '6px 10px' }}>{inp('arrivalWeek', { num: true, w: 55 })}</td>
                                <td style={{ padding: '6px 10px' }}>{inp('advancePaymentAmount', { num: true, step: '0.01', w: 80 })}</td>
                                <td style={{ padding: '6px 10px' }}>
                                  <select className="ui-select" value={orderForm.status}
                                    onChange={e => setOrderForm(p => ({ ...p, status: e.target.value }))}
                                    style={{ padding: '4px 8px', fontSize: '0.78rem', width: 110 }}>
                                    {['offer', 'pending', 'confirmed', 'pending shipment', 'in-transit', 'completed'].map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                </td>
                                <td style={{ padding: '6px 10px', color: 'var(--text-muted)', fontSize: '0.72rem' }}>—</td>
                                <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
                                  <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '0.72rem', marginRight: 6 }}
                                    disabled={savingOrder} onClick={saveOrderEdit}>
                                    {savingOrder ? '…' : 'Save'}
                                  </button>
                                  <button className="btn btn-glass" style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                                    onClick={() => setEditingOrderId(null)}>✕</button>
                                </td>
                              </tr>
                            );
                          }
                          return (
                            <tr key={o.id} style={{ borderTop: '1px solid var(--border-glass-light)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                              <td style={{ padding: '8px 12px', color: 'var(--orange-primary)', fontWeight: 700 }}>#{o.referenceId}</td>
                              <td style={{ padding: '8px 12px' }}>{o.product}</td>
                              <td style={{ padding: '8px 12px' }}>{o.variety}</td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{o.boxType || '—'}</td>
                              <td style={{ padding: '8px 12px', fontWeight: 600 }}>{(o.boxQuantity || 0).toLocaleString()}</td>
                              <td style={{ padding: '8px 12px', color: '#f59e0b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                                {o.purchasePrice ? `$${parseFloat(o.purchasePrice).toFixed(2)}` : '—'}
                                {o.incoterm && <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 4 }}>{o.incoterm}</span>}
                              </td>
                              <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--orange-primary)' }}>{total > 0 ? `$${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}</td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{o.departureWeek ? `W${o.departureWeek}` : '—'}</td>
                              <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{o.arrivalWeek ? `W${o.arrivalWeek}` : '—'}</td>
                              <td style={{ padding: '8px 12px' }}>
                                {o.advancePaymentAmount
                                  ? <span style={{ color: '#22c55e', fontWeight: 600 }}>${parseFloat(o.advancePaymentAmount).toLocaleString()}{o.advancePaymentPct ? ` (${o.advancePaymentPct}%)` : ''}</span>
                                  : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                              </td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: '0.7rem', fontWeight: 600,
                                  background: o.status === 'offer' ? 'rgba(245,158,11,0.15)' : o.status === 'confirmed' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
                                  color: o.status === 'offer' ? '#f59e0b' : o.status === 'confirmed' ? '#22c55e' : 'var(--text-muted)' }}>
                                  {o.status || 'pending'}
                                </span>
                              </td>
                              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  {o.createdAt ? new Date(o.createdAt).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </div>
                                {o.createdBy && <div style={{ fontSize: '0.68rem', color: 'var(--orange-primary)', fontWeight: 600 }}>{o.createdBy}</div>}
                              </td>
                              {isSuperAdmin && (
                                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                                  <button onClick={() => startEditOrder(o)} title="Edit offer"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, marginRight: 6 }}>
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!window.confirm(`Delete offer #${o.referenceId}? This cannot be undone.`)) return;
                                      try { await ordersApi.delete(o.id); onRefresh(); }
                                      catch (err) { alert('Delete failed: ' + err.message); }
                                    }}
                                    title="Delete offer"
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.6)', padding: 2 }}>
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                      {growerOrders.length > 1 && (
                        <tfoot>
                          <tr style={{ borderTop: '2px solid var(--border-glass-light)', background: 'rgba(255,255,255,0.03)' }}>
                            <td colSpan={4} style={{ padding: '8px 12px', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700 }}>{totalBoxes.toLocaleString()}</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: '#f59e0b' }}>${avgPrice} avg</td>
                            <td style={{ padding: '8px 12px', fontWeight: 700, color: 'var(--orange-primary)' }}>${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                            <td colSpan={isSuperAdmin ? 6 : 5} />
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
            )}

            {/* Info tab */}
            {tab === 'info' && (
              <div>
                {/* Edit / Save / Cancel buttons — super admin only */}
                {isSuperAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12, gap: 8 }}>
                    {editingInfo ? (
                      <>
                        <button className="btn btn-glass" style={{ fontSize: '0.78rem', padding: '5px 14px' }}
                          onClick={() => setEditingInfo(false)}>Cancel</button>
                        <button className="btn btn-primary" style={{ fontSize: '0.78rem', padding: '5px 14px' }}
                          disabled={savingInfo}
                          onClick={async () => {
                            setSavingInfo(true);
                            try {
                              await contactsApi.update(grower.id, {
                                name:       infoForm.name,
                                company:    infoForm.company || 'N/A',
                                phone:      infoForm.phone   || 'N/A',
                                email:      infoForm.email   || 'N/A',
                                language:   infoForm.country,
                                department: infoForm.region,
                                address:    infoForm.address,
                                website:    infoForm.website,
                                status:     infoForm.status,
                              });
                              setEditingInfo(false);
                              onRefresh();
                            } catch (err) { alert('Save failed: ' + err.message); }
                            finally { setSavingInfo(false); }
                          }}>
                          {savingInfo ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : <><Save size={13} /> Save</>}
                        </button>
                      </>
                    ) : (
                      <button className="btn btn-glass" style={{ fontSize: '0.78rem', padding: '5px 14px' }}
                        onClick={() => {
                          setInfoForm({
                            name:    grower.name || '',
                            company: grower.company !== 'N/A' ? grower.company : '',
                            phone:   grower.phone !== 'N/A' ? grower.phone : '',
                            email:   grower.email !== 'N/A' ? grower.email : '',
                            country: grower.language || 'Morocco',
                            region:  grower.department || '',
                            address: grower.address || '',
                            website: grower.website || '',
                            status:  grower.status || 'Active',
                          });
                          setEditingInfo(true);
                        }}>
                        <Edit3 size={13} /> Edit
                      </button>
                    )}
                  </div>
                )}

                {editingInfo ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {[
                      { key: 'name',    label: 'Name' },
                      { key: 'company', label: 'Company' },
                      { key: 'country', label: 'Country' },
                      { key: 'region',  label: 'Region' },
                      { key: 'phone',   label: 'Phone' },
                      { key: 'email',   label: 'Email' },
                      { key: 'address', label: 'Address' },
                      { key: 'website', label: 'Website' },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                        <input className="ui-input" style={{ width: '100%', boxSizing: 'border-box' }}
                          value={infoForm[key] || ''} onChange={e => setInfoForm(p => ({ ...p, [key]: e.target.value }))} />
                      </div>
                    ))}
                    <div>
                      <label style={{ display: 'block', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
                      <select className="ui-select" value={infoForm.status || 'Active'} onChange={e => setInfoForm(p => ({ ...p, status: e.target.value }))}>
                        {['Active', 'Inactive'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {[
                      { label: 'Name',    value: grower.name },
                      { label: 'Company', value: grower.company !== 'N/A' ? grower.company : null },
                      { label: 'Country', value: country },
                      { label: 'Region',  value: region || null },
                      { label: 'Phone',   value: grower.phone !== 'N/A' ? grower.phone : null },
                      { label: 'Email',   value: grower.email !== 'N/A' ? grower.email : null },
                      { label: 'Address', value: grower.address || null },
                      { label: 'Website', value: grower.website || null },
                      { label: 'Status',  value: grower.status },
                    ].filter(f => f.value).map(({ label, value }) => (
                      <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border-glass-light)' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)', fontWeight: 500 }}>{value}</div>
                      </div>
                    ))}
                    {grower.notes && (
                      <div style={{ gridColumn: '1/-1', background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border-glass-light)' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Notes</div>
                        <div style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>{grower.notes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Documents tab */}
            {tab === 'documents' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <label style={{ cursor: 'pointer' }}>
                    <input type="file" multiple style={{ display: 'none' }} onChange={handleUpload} />
                    <span className="btn btn-glass" style={{ fontSize: '0.78rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      {uploading ? <><Loader2 size={13} className="animate-spin" /> Uploading…</> : <><Plus size={13} /> Upload Documents</>}
                    </span>
                  </label>
                </div>
                {docs.length === 0
                  ? <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No documents yet — click Upload to add one</div>
                  : <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {docs.map(d => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border-glass-light)' }}>
                          <FolderOpen size={15} style={{ color: '#3b82f6', flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.originalName || d.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{d.category} · {new Date(d.createdAt).toLocaleDateString()}</div>
                          </div>
                          <a href={`/api/documents/${d.id}/download`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: '0.75rem', textDecoration: 'none' }}>Download</a>
                          <button onClick={() => handleDeleteDoc(d.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                }
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

// ── Add Vendor Package Modal ──────────────────────────────────
const AddVendorPackageModal = ({ grower, onClose, onSaved }) => {
  const [form, setForm] = useState({
    product: 'Mandarin', variety: 'Nadorcott', boxType: '', size: '',
    quantity: '', pricePerBox: '', week: '', season: '', notes: '', status: 'Available'
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const varieties = PRODUCTS[form.product] || [];

  const handleSave = async () => {
    if (!form.quantity) { alert('Quantity is required'); return; }
    setSaving(true);
    try {
      await vendorPackagesApi.create({ ...form, growerId: grower.id });
      onSaved();
      onClose();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content glass-panel" style={{ maxWidth: 520, padding: 0 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-glass-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}><Package size={18} className="text-orange" /> Add Vendor Package</h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>from {grower.name}</p>
          </div>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PRODUCT *</label>
              <select className="ui-select" value={form.product} onChange={e => { set('product', e.target.value); set('variety', PRODUCTS[e.target.value]?.[0] || ''); }}>
                {Object.keys(PRODUCTS).map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>VARIETY *</label>
              <select className="ui-select" value={form.variety} onChange={e => set('variety', e.target.value)}>
                {varieties.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>BOX TYPE (kg)</label>
              <input className="ui-input" placeholder="e.g. 17, 18" value={form.boxType} onChange={e => set('boxType', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>SIZE</label>
              <input className="ui-input" placeholder="e.g. 113, 95" value={form.size} onChange={e => set('size', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>QUANTITY *</label>
              <input type="number" className="ui-input" placeholder="0" value={form.quantity} onChange={e => set('quantity', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>PRICE / BOX ($)</label>
              <input type="number" step="0.01" className="ui-input" placeholder="0.00" value={form.pricePerBox} onChange={e => set('pricePerBox', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>WEEK</label>
              <input type="number" className="ui-input" placeholder="e.g. 22" value={form.week} onChange={e => set('week', e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>SEASON</label>
              <input className="ui-input" placeholder="e.g. 2025-2026" value={form.season} onChange={e => set('season', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>STATUS</label>
              <select className="ui-select" value={form.status} onChange={e => set('status', e.target.value)}>
                {['Available', 'Confirmed', 'Shipped'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button className="btn btn-glass" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" style={{ flex: 2 }} onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : 'Add Package'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────
const GrowersPage = ({ selectedCompany }) => {
  const [growers, setGrowers]   = useState([]);
  const [orders, setOrders]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [offerGrower, setOfferGrower] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [contacts, allOrders] = await Promise.all([
        contactsApi.getAll('Grower'),
        ordersApi.getAll(),
      ]);
      setGrowers(contacts);
      setOrders(allOrders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [selectedCompany?.id]);

  const filtered = growers.filter(g =>
    !search ||
    g.name?.toLowerCase().includes(search.toLowerCase()) ||
    g.company?.toLowerCase().includes(search.toLowerCase()) ||
    g.language?.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const totalGrowers  = growers.length;
  const growerOrders  = orders.filter(o => o.grower || growers.some(g => g.id === o.contactId));
  const totalBoxes    = growerOrders.reduce((s, o) => s + (o.boxQuantity || 0), 0);
  const totalValue    = growerOrders.reduce((s, o) => s + ((o.purchasePrice || 0) * (o.boxQuantity || 0)), 0);

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="flex-between">
        <div className="page-header">
          <div className="page-icon-box">
            <Leaf size={24} className="text-orange" />
          </div>
          <div>
            <h1 className="page-title">Growers</h1>
            <p className="page-subtitle">Manage your suppliers and track purchase offers.</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Add Grower
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[
          { label: 'Total Growers', value: totalGrowers, icon: Leaf, color: '#22c55e' },
          { label: 'Total Boxes Ordered', value: totalBoxes.toLocaleString(), icon: Package, color: 'var(--orange-primary)' },
          { label: 'Total Purchase Value', value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 0 })}`, icon: DollarSign, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} style={{ color }} />
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360 }}>
        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="ui-input"
          placeholder="Search growers..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 38, width: '100%' }}
        />
      </div>

      {/* List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <div className="loader" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Leaf size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
          <p>{search ? 'No growers found.' : 'No growers yet. Click "Add Grower" to get started.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(g => (
            <GrowerCard
              key={g.id}
              grower={g}
              orders={orders}
              onAddOffer={setOfferGrower}
              onRefresh={loadData}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAdd && (
        <AddGrowerModal onClose={() => setShowAdd(false)} onSaved={loadData} />
      )}
      {offerGrower && (
        <AddOfferModal
          grower={offerGrower}
          onClose={() => setOfferGrower(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
};

export default GrowersPage;
