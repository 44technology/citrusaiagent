import React, { useState, useEffect } from 'react';
import { X, Ship, MapPin, Calendar, UserPlus, UserCheck, Plus, Edit3, Search, CheckCircle2, AlertCircle } from 'lucide-react';
import { contactsApi, ordersApi } from '../services/api';
import { formatFullDateUTC } from '../utils/dateUtils';

const EMPTY_FORM = {
  contactId: '', orderId: '', label: '', origin: 'Morocco', destination: '',
  vesselName: '', containerNumber: '', bolNumber: '',
  vesselEta: '', vesselDeparture: '', vesselArrival: '',
  shippingLine: '', status: 'Pending', notes: '',
  portOfLoading: 'Port of Agadir', portOfDischarge: '', transshipmentPort: '',
  containerType: '40RF', sealNumber: '', cargoDescription: '', grossWeight: '', numberOfBoxes: '',
  reeferTempSet: '', reeferTempActual: '', humidity: '', ventilation: '', co2Level: '',
  variety: '', grower: '', soNumber: '',
  customerName: '', customerCompany: '', customerEmail: '', customerPhone: ''
};

const AddShipmentModal = ({ isOpen, onClose, onAdd, customers, initialData }) => {
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLabelManual, setIsLabelManual] = useState(false);
  const [orders, setOrders] = useState([]);
  const [refIdInput, setRefIdInput] = useState('');
  const [matchedOrder, setMatchedOrder] = useState(null);
  const [showManualSelect, setShowManualSelect] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (isOpen) {
      ordersApi.getAll().then(setOrders).catch(() => {});
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
          portOfLoading:    initialData.portOfLoading || 'Port of Agadir',
          portOfDischarge:  initialData.portOfDischarge || '',
          transshipmentPort:initialData.transshipmentPort || '',
          containerType:    initialData.containerType || '40RF',
          cargoDescription: initialData.cargoDescription || '',
          grossWeight:      initialData.grossWeight   ? String(initialData.grossWeight) : '',
          numberOfBoxes:    initialData.numberOfBoxes ? String(initialData.numberOfBoxes) : '',
          reeferTempSet:    initialData.reeferTempSet ? String(initialData.reeferTempSet) : '',
          reeferTempActual: initialData.reeferTempActual ? String(initialData.reeferTempActual) : '',
          humidity:         initialData.humidity      ? String(initialData.humidity) : '',
          ventilation:      initialData.ventilation   ? String(initialData.ventilation) : '',
          co2Level:         initialData.co2Level      ? String(initialData.co2Level) : '',
          variety:          initialData.variety       || '',
          grower:           initialData.grower        || '',
          notes:            initialData.notes         || '',
          status:           'Pending',
          // containerNumber, bolNumber, soNumber, vesselEta, vesselDeparture intentionally blank
        });
        setIsLabelManual(false);
        if (initialData.order?.referenceId) {
          setRefIdInput(String(initialData.order.referenceId));
        }
      } else {
        setForm(EMPTY_FORM);
        setRefIdInput('');
        setMatchedOrder(null);
      }
    }
  }, [isOpen, initialData]);

  // Auto-generate label logic
  useEffect(() => {
    if (!isLabelManual && isOpen) {
      const dateStr = form.vesselEta
        ? formatFullDateUTC(form.vesselEta)
        : formatFullDateUTC(new Date().toISOString());
      
      let route = form.destination || 'New Shipment';
      if (form.origin) route = `${form.origin} - ${form.destination}`;
      setForm(prev => ({ ...prev, label: `${dateStr} ${route}` }));
    }
  }, [form.vesselEta, form.origin, form.destination, isLabelManual, isOpen]);

  if (!isOpen) return null;

  // Auto-fill from a matched/selected order
  const applyOrder = (order) => {
    setMatchedOrder(order);
    setRefIdInput(String(order.referenceId || ''));
    setForm(prev => ({
      ...prev,
      orderId: order.id,
      contactId: order.contactId || prev.contactId,
      cargoDescription: [order.product, order.variety].filter(Boolean).join(' - '),
      numberOfBoxes: order.boxQuantity ? String(order.boxQuantity) : prev.numberOfBoxes,
      grower: order.grower || prev.grower,
    }));
  };

  const clearOrder = () => {
    setMatchedOrder(null);
    setRefIdInput('');
    setForm(prev => ({ ...prev, orderId: '' }));
  };

  // REF ID search — auto-match by referenceId
  const handleRefIdSearch = (val) => {
    setRefIdInput(val);
    setMatchedOrder(null);
    setForm(prev => ({ ...prev, orderId: '' }));
    if (!val.trim()) return;
    const found = orders.find(o => String(o.referenceId).toLowerCase() === val.trim().toLowerCase());
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

    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
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

      // 3. Create shipment
      await onAdd({ ...form, contactId: finalContactId });

      // 4. Reset & Close
      setForm({
        contactId: '', label: '', origin: 'Morocco', destination: '',
        vesselName: '', containerNumber: '', bolNumber: '',
        vesselEta: '', vesselDeparture: '', vesselArrival: '',
        shippingLine: '', status: 'Pending', notes: '',
        portOfLoading: 'Port of Agadir', portOfDischarge: '', transshipmentPort: '',
        containerType: '40RF', sealNumber: '', cargoDescription: '', grossWeight: '', numberOfBoxes: '',
        reeferTempSet: '', humidity: '', ventilation: '',
        customerName: '', customerCompany: '', customerEmail: '', customerPhone: ''
      });
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
    <div className="modal-overlay" onClick={onClose}>
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
                  placeholder="Type REF ID to auto-link order…"
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: 8, fontSize: '0.78rem', color: '#22c55e', marginBottom: 6 }}>
                  <CheckCircle2 size={13} />
                  <strong>#{matchedOrder.referenceId}</strong>
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                  <span style={{ color: 'var(--text-primary)' }}>{[matchedOrder.product, matchedOrder.variety].filter(Boolean).join(' ')} · {matchedOrder.boxQuantity} boxes</span>
                  <span style={{ marginLeft: 'auto', color: '#22c55e', fontWeight: 700 }}>Auto-filled ✓</span>
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
                      #{o.referenceId} — {o.product} {o.variety} ({o.boxQuantity} boxes)
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label">Vessel Name</label>
                <input type="text" className="ui-input" placeholder="e.g. MSC Carolina"
                  value={form.vesselName} onChange={(e) => handleChange('vesselName', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label">Shipping Line</label>
                <input type="text" className="ui-input" placeholder="e.g. MSC, Maersk..."
                  value={form.shippingLine} onChange={(e) => handleChange('shippingLine', e.target.value)} />
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
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
              <div>
                <label className="shipment-label">Number of Boxes</label>
                <input type="number" className="ui-input" placeholder="e.g. 1120"
                  value={form.numberOfBoxes} onChange={e => handleChange('numberOfBoxes', e.target.value)} />
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
