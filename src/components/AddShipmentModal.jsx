import React, { useState, useEffect } from 'react';
import { X, Ship, MapPin, Calendar, UserPlus, UserCheck, Plus, Edit3, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { contactsApi, ordersApi, shipmentsApi, carriersApi } from '../services/api';
import { formatFullDateUTC } from '../utils/dateUtils';

const EMPTY_FORM = {
  contactId: '', orderId: '', label: '', origin: 'Morocco', destination: '',
  vesselName: '', containerNumber: '', bolNumber: '',
  vesselEta: '', vesselDeparture: '', vesselArrival: '',
  shippingLine: '', truckingCarrier: '', status: 'Pending', notes: '',
  portOfLoading: 'Port of Agadir', portOfDischarge: '', transshipmentPort: '',
  containerType: '40RF', sealNumber: '', cargoDescription: '', grossWeight: '', numberOfBoxes: '', packType: '',
  reeferTempSet: '', reeferTempActual: '', humidity: '', ventilation: '', co2Level: '',
  variety: '', product: '', grower: '', soNumber: '', poNumber: '',
  category: '', qcArrival: '', gateInEmptyDate: '', isfSentDate: '', containerLastFreeDay: '',
  customerName: '', customerCompany: '', customerEmail: '', customerPhone: ''
};

const CATEGORY_OPTIONS = ['Cat 1', 'Cat 1.5', 'Cat 2'];

import { PRODUCTS, ALL_VARIETIES, PACK_OPTIONS } from '../constants/products';

const EMPTY_PACK_ROW = { packType: '15 KG', boxQty: '' };

const AddShipmentModal = ({ isOpen, onClose, onAdd, customers, initialData }) => {
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLabelManual, setIsLabelManual] = useState(false);
  const [orders, setOrders] = useState([]);
  const [growers, setGrowers] = useState([]);
  const [carriers, setCarriers] = useState([]);
  const [refIdInput, setRefIdInput] = useState('');
  const [matchedOrder, setMatchedOrder] = useState(null);
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [packRows, setPackRows] = useState([{ ...EMPTY_PACK_ROW }]);

  const updatePackRow = (idx, field, value) => setPackRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  const addPackRow = () => setPackRows(prev => [...prev, { ...EMPTY_PACK_ROW }]);
  const removePackRow = (idx) => setPackRows(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  const totalPackBoxes = packRows.reduce((s, r) => s + (parseInt(r.boxQty) || 0), 0);

  useEffect(() => {
    if (isOpen) {
      ordersApi.getAll().then(setOrders).catch(() => {});
      contactsApi.getAll('Grower').then(setGrowers).catch(() => {});
      carriersApi.getAll().then(setCarriers).catch(() => {});
      if (initialData) {
        // Pre-fill from cloned shipment — clear unique fields
        setForm({
          ...EMPTY_FORM,
          contactId:        initialData.contactId    || '',
          orderId:          initialData.orderId       || '',
          origin:           initialData.origin        || 'Morocco',
          destination:      initialData.destination   || '',
          vesselName:       initialData.vesselName    || '',
          shippingLine:     initialData.shippingLine  || '',
          truckingCarrier:  initialData.truckingCarrier || '',
          portOfLoading:    initialData.portOfLoading || 'Port of Agadir',
          portOfDischarge:  initialData.portOfDischarge || '',
          transshipmentPort:initialData.transshipmentPort || '',
          containerType:    initialData.containerType || '40RF',
          cargoDescription: initialData.cargoDescription || '',
          grossWeight:      initialData.grossWeight   ? String(initialData.grossWeight) : '',
          // numberOfBoxes and packType intentionally blank on clone — required, must be re-entered per container
          numberOfBoxes:    '',
          packType:         '',
          reeferTempSet:    initialData.reeferTempSet ? String(initialData.reeferTempSet) : '',
          reeferTempActual: initialData.reeferTempActual ? String(initialData.reeferTempActual) : '',
          humidity:         initialData.humidity      ? String(initialData.humidity) : '',
          ventilation:      initialData.ventilation   ? String(initialData.ventilation) : '',
          co2Level:         initialData.co2Level      ? String(initialData.co2Level) : '',
          variety:          initialData.variety       || '',
          product:          (() => { const v = initialData.variety; if (!v) return ''; for (const [p, vs] of Object.entries(PRODUCTS)) { if (vs.includes(v)) return p; } return ''; })(),
          grower:           initialData.grower        || '',
          category:         initialData.category      || '',
          notes:            initialData.notes         || '',
          status:           'Pending',
          // containerNumber, bolNumber, soNumber, poNumber, vesselEta, vesselDeparture, qcArrival, gateInEmptyDate, isfSentDate, containerLastFreeDay intentionally blank
        });
        setIsLabelManual(false);
        // Intentionally clear ref ID on clone — each shipment must have a unique ref
        setRefIdInput('');
        setMatchedOrder(null);
        // Pack breakdown intentionally blank on clone — required, must be re-entered per container
        setPackRows([{ ...EMPTY_PACK_ROW }]);
      } else {
        setForm(EMPTY_FORM);
        setRefIdInput('');
        setMatchedOrder(null);
        setPackRows([{ ...EMPTY_PACK_ROW }]);
      }
    }
  }, [isOpen, initialData]);

  // Auto-generate label logic
  useEffect(() => {
    if (!isLabelManual && isOpen) {
      // Linked to a grower offer — Grower + ETD week + Destination + Offer #,
      // e.g. "ESTCO W32 PHILADELPHIA 1003"
      if (matchedOrder) {
        const offerNum = (matchedOrder.offerId || '').replace(/^OFR-/i, '') || matchedOrder.referenceId || '';
        const parts = [
          matchedOrder.grower || form.grower,
          matchedOrder.departureWeek ? `W${matchedOrder.departureWeek}` : '',
          form.destination,
          offerNum ? String(offerNum) : '',
        ].filter(Boolean);
        setForm(prev => ({ ...prev, label: parts.join(' ').toUpperCase() }));
        return;
      }
      const dateStr = form.vesselEta
        ? formatFullDateUTC(form.vesselEta)
        : formatFullDateUTC(new Date().toISOString());

      let route = form.destination || 'New Shipment';
      if (form.origin) route = `${form.origin} - ${form.destination}`;
      setForm(prev => ({ ...prev, label: `${dateStr} ${route}` }));
    }
  }, [form.vesselEta, form.origin, form.destination, form.grower, matchedOrder, packRows, isLabelManual, isOpen]);

  if (!isOpen) return null;

  // Auto-fill from a matched/selected order
  const applyOrder = (order) => {
    setMatchedOrder(order);
    setRefIdInput(String(order.referenceId || order.offerId || ''));
    // Derive box breakdown from the order's own fields — Order.boxType is a
    // plain net-weight string (e.g. "17-18KG"), and the quantity lives in
    // boxQuantity (falls back to fclBoxes for single-container offers).
    const orderBoxQty = order.boxQuantity || order.fclBoxes;
    let estGrossWeight = '';
    if (order.boxType && orderBoxQty) {
      const rawType = order.boxType.trim();
      // Sanity-check: a real per-box net weight is a small number (a few
      // KG up to ~30). Some older offers have stray/garbage values (e.g. a
      // total weight typed into this field by mistake) — if the parsed
      // number(s) fall outside a plausible box-weight range, don't guess a
      // pack type or gross weight from it; leave the row blank for staff
      // to fill in correctly instead of showing something nonsensical.
      const nums = (rawType.match(/\d+(\.\d+)?/g) || []).map(parseFloat);
      const plausible = nums.length > 0 && nums.every(n => n >= 3 && n <= 40);
      if (plausible) {
        const packType = /kg/i.test(rawType) ? rawType.toUpperCase() : `${rawType} KG`;
        setPackRows([{ packType, boxQty: String(orderBoxQty) }]);
        const avg = nums.reduce((s, n) => s + n, 0) / nums.length;
        estGrossWeight = String(Math.round(avg * parseInt(orderBoxQty)));
      } else {
        setPackRows([{ packType: '', boxQty: String(orderBoxQty) }]);
      }
    }
    // Category (Order.quality, e.g. "CAT 1") may not exactly match our fixed
    // dropdown casing ("Cat 1") — normalize case-insensitively, or fall back
    // to the raw value shown as an extra option (same pattern as Shipping
    // Line / Trucking / Pack Type below).
    const matchedCategory = order.quality
      ? (CATEGORY_OPTIONS.find(c => c.toLowerCase() === order.quality.trim().toLowerCase()) || order.quality.trim())
      : '';

    setForm(prev => ({
      ...prev,
      orderId: order.id,
      contactId: order.contactId || prev.contactId,
      cargoDescription: [order.product, order.variety].filter(Boolean).join(' - '),
      grower: order.grower || prev.grower,
      product: order.product || prev.product,
      variety: order.variety || prev.variety,
      category: matchedCategory || prev.category,
      portOfLoading: order.departurePort || prev.portOfLoading,
      portOfDischarge: order.arrivalPort || prev.portOfDischarge,
      destination: order.arrivalPort || prev.destination,
      grossWeight: estGrossWeight || prev.grossWeight,
    }));
  };

  const clearOrder = () => {
    setMatchedOrder(null);
    setRefIdInput('');
    setForm(prev => ({ ...prev, orderId: '' }));
  };

  // REF ID / Offer ID search — auto-match by either.
  // NOTE: selecting an unlinked offer here only PREVIEWS it — a real Ref ID
  // is only assigned at actual shipment save time (see handleSubmit), so
  // opening/typing in this modal and closing it without saving never
  // consumes a Ref ID.
  const handleRefIdSearch = (val) => {
    setRefIdInput(val);
    setMatchedOrder(null);
    setForm(prev => ({ ...prev, orderId: '' }));
    if (!val.trim()) return;
    const v = val.trim().toLowerCase();
    const found = orders.find(o =>
      (o.referenceId && String(o.referenceId).toLowerCase() === v) ||
      (o.offerId && o.offerId.toLowerCase() === v)
    );
    if (found) applyOrder(found);
  };

  const handleChange = (field, value) => {
    if (field === 'label') setIsLabelManual(true);

    // Manual order dropdown selection
    if (field === 'orderId') {
      if (!value) { clearOrder(); return; }
      const order = orders.find(o => o.id === value);
      if (order) { applyOrder(order); return; }
    }

    if (field === 'product') {
      setForm(prev => ({ ...prev, product: value, variety: '' }));
      return;
    }

    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Box breakdown is required — at least one row with a pack type and quantity
    const validPackRows = packRows.filter(r => r.packType && parseInt(r.boxQty) > 0);
    if (validPackRows.length === 0) {
      alert('Please add at least one box row with Pack Type and Box Qty.');
      return;
    }

    setLoading(true);

    try {
      // Duplicate container / SO / PO check
      const cn = (form.containerNumber || '').trim().toLowerCase();
      const so = (form.soNumber || '').trim().toLowerCase();
      const po = (form.poNumber || '').trim().toLowerCase();
      if (cn || so || po) {
        try {
          const all = await shipmentsApi.getAll();
          const list = Array.isArray(all) ? all : [];
          const checks = [
            { val: cn, field: 'containerNumber', label: 'Container' },
            { val: so, field: 'soNumber', label: 'SO Number' },
            { val: po, field: 'poNumber', label: 'PO Number' },
          ];
          for (const { val, field, label } of checks) {
            if (!val) continue;
            const dup = list.find(s => (s[field] || '').trim().toLowerCase() === val);
            if (dup) {
              const ok = window.confirm(
                `⚠ ${label} "${val.toUpperCase()}" already exists in the system:\n\n` +
                `${dup.label || dup.containerNumber} — status: ${dup.status}` +
                `${dup.contact?.name ? ` — customer: ${dup.contact.name}` : ''}\n\n` +
                `Create another shipment with the same ${label} anyway?`
              );
              if (!ok) { setLoading(false); return; }
            }
          }
        } catch {}
      }

      let finalContactId = form.contactId;

      // 1. If it's a new customer, create the contact first
      if (isNewCustomer) {
        if (!form.customerName) {
           alert('Please enter a customer name.');
           setLoading(false);
           return;
        }
        const newContact = await contactsApi.create({
          name: form.customerName,
          company: form.customerCompany,
          email: form.customerEmail,
          phone: form.customerPhone,
          type: 'Customer',
          status: 'Active'
        });
        finalContactId = newContact.id;
      }

      if (!finalContactId) {
        alert('Please select a customer.');
        setLoading(false);
        return;
      }

      // 2b. Only NOW — actually saving the shipment — assign a real Ref ID to
      // an unlinked offer, so merely previewing/selecting one in this modal
      // and closing without saving never consumes a Ref ID.
      let finalOrderId = form.orderId;
      if (matchedOrder && !matchedOrder.referenceId) {
        try {
          const updated = await ordersApi.assignRefId(matchedOrder.id);
          finalOrderId = updated.id;
        } catch (err) {
          alert('Failed to assign Ref ID: ' + err.message);
          setLoading(false);
          return;
        }
      }

      // 3. Create shipment
      const totalBoxes = validPackRows.reduce((s, r) => s + parseInt(r.boxQty), 0);
      const packTypeSummary = [...new Set(validPackRows.map(r => r.packType))].join(' + ');
      await onAdd({
        ...form, contactId: finalContactId, orderId: finalOrderId,
        numberOfBoxes: totalBoxes,
        packType: packTypeSummary,
        packBreakdown: JSON.stringify(validPackRows),
      });

      // 4. Reset & Close
      setForm({ ...EMPTY_FORM });
      setPackRows([{ ...EMPTY_PACK_ROW }]);
      setIsLabelManual(false);
      setIsNewCustomer(false);
      setRefIdInput('');
      setMatchedOrder(null);
      setShowManualSelect(false);
      onClose();
    } catch (err) {
      console.error('Failed to process shipment creation:', err);
      alert('Error creating shipment/customer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content shipment-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div className="flex-center gap-2">
            <Ship size={20} className="text-orange" />
            <h3>{initialData ? 'Clone Shipment' : 'Add New Shipment'}</h3>
            {initialData && (
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: 12, background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.25)', marginLeft: 4 }}>
                Cloned from {initialData.containerNumber || initialData.label || 'shipment'}
              </span>
            )}
          </div>
          <button className="icon-btn-small" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ gap: '14px', paddingBottom: '20px' }}>

            {/* REF ID / Order Link */}
            <div>
              <label className="shipment-label">Reference ID (Order Link)</label>

              {/* REF ID auto-search */}
              <div style={{ position: 'relative', marginBottom: 6 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type="text"
                  className="ui-input"
                  placeholder="Type REF ID or Offer ID (OFR-...) to auto-link…"
                  value={refIdInput}
                  onChange={e => handleRefIdSearch(e.target.value)}
                  style={{ paddingLeft: 34, width: '100%' }}
                />
                {matchedOrder && (
                  <button type="button" onClick={clearOrder}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Match result */}
              {refIdInput && matchedOrder && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, fontSize: '0.78rem', color: '#22c55e', marginBottom: 6, flexWrap: 'wrap' }}>
                  <CheckCircle2 size={13} />
                  <strong>{matchedOrder.referenceId ? `#${matchedOrder.referenceId}` : matchedOrder.offerId}</strong>
                  {!matchedOrder.referenceId && (
                    <span style={{ color: '#f59e0b', fontSize: '0.72rem' }}>(Ref ID assigned on save)</span>
                  )}
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                  <span style={{ color: 'var(--text-primary)' }}>{[matchedOrder.product, matchedOrder.variety].filter(Boolean).join(' ')} · {matchedOrder.boxQuantity} boxes</span>
                  <span style={{ marginLeft: 'auto', color: '#22c55e', fontWeight: 700 }}>Auto-filled ✓</span>
                </div>
              )}
              {refIdInput && matchedOrder && matchedOrder.status !== 'confirmed' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, fontSize: '0.78rem', color: '#f59e0b', marginBottom: 6 }}>
                  <AlertCircle size={13} />
                  This order is not yet <strong>confirmed</strong> (status: {matchedOrder.status}) — please contact the grower to confirm before shipping.
                </div>
              )}
              {refIdInput && !matchedOrder && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.78rem', color: '#f87171', marginBottom: 6 }}>
                  <AlertCircle size={13} />
                  No order found for REF "{refIdInput}" — select manually below or leave blank
                </div>
              )}

              {/* Manual override toggle */}
              <button
                type="button"
                onClick={() => setShowManualSelect(v => !v)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.72rem', padding: '2px 0', textDecoration: 'underline' }}
              >
                {showManualSelect ? '▲ Hide manual select' : '▼ Or select order from list'}
              </button>

              {showManualSelect && (
                <select
                  className="ui-input"
                  value={form.orderId}
                  onChange={e => handleChange('orderId', e.target.value)}
                  style={{ width: '100%', marginTop: 6 }}
                >
                  <option value="">— No order link —</option>
                  {orders.map(o => (
                    <option key={o.id} value={o.id}>
                      {o.referenceId ? `#${o.referenceId}` : `${o.offerId} (offer)`} — {o.product} {o.variety} ({o.boxQuantity} boxes)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Shipment Label (Manual/Auto) */}
            <div>
              <div className="flex-between">
                <label className="shipment-label">Shipment Label *</label>
                <button 
                  type="button" 
                  className="btn btn-text-action" 
                  style={{ fontSize: '0.7rem' }}
                  onClick={() => setIsLabelManual(!isLabelManual)}
                >
                  {isLabelManual ? 'Auto-generate' : 'Manual Edit'}
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="e.g. 24/03/2026 Morocco - Newark"
                  value={form.label}
                  onChange={(e) => handleChange('label', e.target.value)}
                  style={{ width: '100%', paddingRight: '35px', border: isLabelManual ? '1px solid var(--orange-primary)' : '1px solid var(--border-glass)' }}
                  required
                />
                {!isLabelManual && (
                  <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>
                    <Edit3 size={14} />
                  </div>
                )}
              </div>
            </div>

            {/* Customer Selection Header */}
            <div className="flex-between" style={{ marginBottom: '4px' }}>
              <label className="shipment-label" style={{ marginBottom: 0 }}>Customer Info *</label>
              <button 
                type="button" 
                className="btn btn-glass" 
                style={{ fontSize: '0.75rem', gap: '4px', padding: '4px 10px', background: 'rgba(255,107,0,0.1)', color: 'var(--orange-primary)' }}
                onClick={() => setIsNewCustomer(!isNewCustomer)}
              >
                {isNewCustomer ? <><UserCheck size={14} /> Use Existing</> : <><UserPlus size={14} /> + New Customer</>}
              </button>
            </div>

            {/* Customer Toggle Areas */}
            {!isNewCustomer ? (
              <div>
                <select
                  className="ui-input"
                  value={form.contactId}
                  onChange={(e) => handleChange('contactId', e.target.value)}
                  style={{ width: '100%', border: form.contactId ? '1px solid var(--orange-primary)' : '1px solid var(--border-glass)' }}
                >
                  <option value="">Select Customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.company && `(${c.company})`}</option>
                  ))}
                </select>
                {customers.length === 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--orange-primary)', marginTop: '6px', opacity: 0.8 }}>
                    No customers found in directory. Use "New Customer" to create one.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: 'rgba(255,107,0,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,107,0,0.1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <input
                    type="text"
                    className="ui-input"
                    placeholder="Full Name *"
                    value={form.customerName}
                    onChange={(e) => handleChange('customerName', e.target.value)}
                    required={isNewCustomer}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="ui-input"
                    placeholder="Company"
                    value={form.customerCompany}
                    onChange={(e) => handleChange('customerCompany', e.target.value)}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    className="ui-input"
                    placeholder="Phone"
                    value={form.customerPhone}
                    onChange={(e) => handleChange('customerPhone', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="divider" style={{ margin: '8px 0', opacity: 0.1 }}></div>

            {/* Origin & Destination Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label"><MapPin size={14} /> Origin</label>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Morocco"
                  value={form.origin}
                  onChange={(e) => handleChange('origin', e.target.value)}
                />
              </div>
              <div>
                <label className="shipment-label"><MapPin size={14} /> Destination *</label>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Newark (NJ)"
                  value={form.destination}
                  onChange={(e) => handleChange('destination', e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Vessel Info Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label">Vessel Name</label>
                <input type="text" className="ui-input" placeholder="e.g. MSC Carolina"
                  value={form.vesselName} onChange={(e) => handleChange('vesselName', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label">Shipping Line</label>
                <select className="ui-input" value={form.shippingLine} onChange={(e) => handleChange('shippingLine', e.target.value)}>
                  <option value="">— Select Shipping Line —</option>
                  {(form.shippingLine && !carriers.some(c => c.type === 'Shipping Line' && c.name === form.shippingLine)) && (
                    <option value={form.shippingLine}>{form.shippingLine}</option>
                  )}
                  {carriers.filter(c => c.type === 'Shipping Line').map(c => (
                    <option key={c.id} value={c.name}>{c.name}{c.scacCode ? ` (${c.scacCode})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="shipment-label">Trucking Carrier</label>
                <select className="ui-input" value={form.truckingCarrier} onChange={(e) => handleChange('truckingCarrier', e.target.value)}>
                  <option value="">— Select Trucking —</option>
                  {(form.truckingCarrier && !carriers.some(c => c.type === 'Trucking' && c.name === form.truckingCarrier)) && (
                    <option value={form.truckingCarrier}>{form.truckingCarrier}</option>
                  )}
                  {carriers.filter(c => c.type === 'Trucking').map(c => (
                    <option key={c.id} value={c.name}>{c.name}{c.scacCode ? ` (${c.scacCode})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Container & BOL */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label">Container Type</label>
                <select className="ui-input" value={form.containerType} onChange={e => handleChange('containerType', e.target.value)}>
                  {['40RF','40HC-RF','20RF','40DRY','40HC-DRY','20DRY'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="shipment-label">Container Number</label>
                <input type="text" className="ui-input" placeholder="e.g. CMAU1234567"
                  value={form.containerNumber} onChange={(e) => handleChange('containerNumber', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label">BOL Number</label>
                <input type="text" className="ui-input" placeholder="Bill of Lading #"
                  value={form.bolNumber} onChange={(e) => handleChange('bolNumber', e.target.value)} />
              </div>
            </div>

            {/* Cargo */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label">Cargo Description</label>
                <input type="text" className="ui-input" placeholder="e.g. Citrus - Clementines"
                  value={form.cargoDescription} onChange={e => handleChange('cargoDescription', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label">Gross Weight (kg)</label>
                <input type="number" className="ui-input" placeholder="e.g. 22000"
                  value={form.grossWeight} onChange={e => handleChange('grossWeight', e.target.value)} />
              </div>
            </div>

            {/* Box breakdown — a container can mix several pack weights */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label className="shipment-label" style={{ margin: 0 }}>Box Breakdown *</label>
                <button type="button" className="btn btn-glass" style={{ padding: '3px 10px', fontSize: '0.75rem' }} onClick={addPackRow}>
                  <Plus size={12} /> Add Row
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {packRows.map((row, idx) => {
                  const opts = row.packType && !PACK_OPTIONS.includes(row.packType) ? [row.packType, ...PACK_OPTIONS] : PACK_OPTIONS;
                  return (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                      <select className="ui-input" value={row.packType} onChange={e => updatePackRow(idx, 'packType', e.target.value)}>
                        {!row.packType && <option value="">— Select pack type —</option>}
                        {opts.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                      <input type="number" className="ui-input" placeholder="Box qty" required
                        value={row.boxQty} onChange={e => updatePackRow(idx, 'boxQty', e.target.value)} />
                      {packRows.length > 1 && (
                        <button type="button" onClick={() => removePackRow(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(239,68,68,0.6)', padding: 4 }}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {totalPackBoxes > 0 && (
                <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Total: <strong style={{ color: 'var(--orange-primary)' }}>{totalPackBoxes.toLocaleString()} boxes</strong>
                </div>
              )}
            </div>

            {/* Grower / Product / Variety */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label">Grower</label>
                <select className="ui-input" value={form.grower} onChange={e => handleChange('grower', e.target.value)}>
                  <option value="">— Select Grower —</option>
                  {growers.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className="shipment-label">Product</label>
                <select className="ui-input" value={form.product} onChange={e => handleChange('product', e.target.value)}>
                  <option value="">— Select Product —</option>
                  {Object.keys(PRODUCTS).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="shipment-label">Variety</label>
                <select className="ui-input" value={form.variety} onChange={e => handleChange('variety', e.target.value)}>
                  <option value="">— Select Variety —</option>
                  {(form.product ? PRODUCTS[form.product] : ALL_VARIETIES).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category / QC Score / Gate-in Empty Date (ATA) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label">Category</label>
                <select className="ui-input" value={form.category} onChange={e => handleChange('category', e.target.value)}>
                  <option value="">— Select Category —</option>
                  {(form.category && !CATEGORY_OPTIONS.includes(form.category)) && (
                    <option value={form.category}>{form.category}</option>
                  )}
                  {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="shipment-label">QC Score</label>
                <input type="text" className="ui-input" placeholder="e.g. 92"
                  value={form.qcArrival} onChange={e => handleChange('qcArrival', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label">ATA (Gate-in Empty Date)</label>
                <input type="date" className="ui-input"
                  value={form.gateInEmptyDate} onChange={e => handleChange('gateInEmptyDate', e.target.value)} />
              </div>
            </div>

            {/* SO / PO / ISF / LFD */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label">SO Number</label>
                <input type="text" className="ui-input" placeholder="e.g. SO-12345"
                  value={form.soNumber} onChange={e => handleChange('soNumber', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label">PO Number</label>
                <input type="text" className="ui-input" placeholder="e.g. PO-2026-001"
                  value={form.poNumber} onChange={e => handleChange('poNumber', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label">ISF Sent to Customs</label>
                <input type="date" className="ui-input"
                  value={form.isfSentDate} onChange={e => handleChange('isfSentDate', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label">LFD (Last Free Day)</label>
                <input type="date" className="ui-input"
                  value={form.containerLastFreeDay} onChange={e => handleChange('containerLastFreeDay', e.target.value)} />
              </div>
            </div>

            {/* Reefer Settings (shown for RF containers) */}
            {form.containerType && form.containerType.includes('RF') && (
              <div style={{ background: 'rgba(56,189,248,0.05)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 10, padding: '12px 14px' }}>
                <label className="shipment-label" style={{ color: '#38bdf8', marginBottom: 10 }}>❄ Reefer Settings</label>
                <div style={{ maxWidth: 180 }}>
                  <label className="shipment-label">Set Temp (°C)</label>
                  <input type="number" step="0.1" className="ui-input" placeholder="e.g. 6.0"
                    value={form.reeferTempSet} onChange={e => handleChange('reeferTempSet', e.target.value)} />
                </div>
              </div>
            )}

            {/* Ports */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label">Port of Loading</label>
                <input type="text" className="ui-input" placeholder="e.g. Port of Agadir"
                  value={form.portOfLoading} onChange={e => handleChange('portOfLoading', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label">Transshipment Port <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.75em' }}>(optional)</span></label>
                <input type="text" className="ui-input" placeholder="e.g. Port of Algeciras (optional)"
                  value={form.transshipmentPort} onChange={e => handleChange('transshipmentPort', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label">Port of Discharge</label>
                <input type="text" className="ui-input" placeholder="e.g. Port of Newark, NJ"
                  value={form.portOfDischarge} onChange={e => handleChange('portOfDischarge', e.target.value)} />
              </div>
            </div>

            {/* Dates Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label"><Calendar size={14} /> Vessel ETA</label>
                <input type="date" className="ui-input"
                  value={form.vesselEta} onChange={(e) => handleChange('vesselEta', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label"><Calendar size={14} /> Departure</label>
                <input type="date" className="ui-input"
                  value={form.vesselDeparture} onChange={(e) => handleChange('vesselDeparture', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label"><Calendar size={14} /> Arrival</label>
                <input type="date" className="ui-input"
                  value={form.vesselArrival} onChange={(e) => handleChange('vesselArrival', e.target.value)} />
              </div>
            </div>

            {/* Status & Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label">Initial Status</label>
                <select className="ui-input" value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)} style={{ width: '100%' }}>
                  <option value="Pending">Pending</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Departed">Departed</option>
                  <option value="Arrived">Arrived</option>
                </select>
              </div>
              <div>
                <label className="shipment-label">Notes</label>
                <input type="text" className="ui-input" placeholder="Short notes..."
                  value={form.notes} onChange={(e) => handleChange('notes', e.target.value)} />
              </div>
            </div>

          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <div className="loader-small"></div> : <><Plus size={16} /> Add Shipment</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddShipmentModal;
