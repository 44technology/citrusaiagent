import React, { useState } from 'react';
import { X, Ship, MapPin, Calendar } from 'lucide-react';

const AddShipmentModal = ({ isOpen, onClose, onAdd, customers }) => {
  const [form, setForm] = useState({
    contactId: '',
    origin: '',
    destination: '',
    vesselName: '',
    containerNumber: '',
    bolNumber: '',
    vesselEta: '',
    vesselDeparture: '',
    vesselArrival: '',
    shippingLine: '',
    status: 'Pending',
    notes: ''
  });

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.contactId || !form.destination) return;

    // Auto-generate label from date + origin + destination
    const dateStr = form.vesselEta
      ? new Date(form.vesselEta).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    let route = form.destination;
    if (form.origin) route = `${form.origin} - ${form.destination}`;
    const label = `${dateStr} ${route}`;

    onAdd({ ...form, label });
    setForm({
      contactId: '', origin: '', destination: '', vesselName: '', containerNumber: '',
      bolNumber: '', vesselEta: '', vesselDeparture: '', vesselArrival: '',
      shippingLine: '', status: 'Pending', notes: ''
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content shipment-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div className="flex-center gap-2">
            <Ship size={20} className="text-orange" />
            <h3>Add New Shipment</h3>
          </div>
          <button className="icon-btn-small" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ gap: '14px' }}>

            {/* Customer Select */}
            <div>
              <label className="shipment-label">Customer *</label>
              <select
                className="ui-input"
                value={form.contactId}
                onChange={(e) => handleChange('contactId', e.target.value)}
                required
                style={{ width: '100%' }}
              >
                <option value="">Select Customer...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.company}</option>
                ))}
              </select>
            </div>

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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="shipment-label">Container Number</label>
                <input type="text" className="ui-input" placeholder="e.g. MSCU1234567"
                  value={form.containerNumber} onChange={(e) => handleChange('containerNumber', e.target.value)} />
              </div>
              <div>
                <label className="shipment-label">BOL Number</label>
                <input type="text" className="ui-input" placeholder="Bill of Lading #"
                  value={form.bolNumber} onChange={(e) => handleChange('bolNumber', e.target.value)} />
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

            {/* Status */}
            <div>
              <label className="shipment-label">Status</label>
              <select className="ui-input" value={form.status}
                onChange={(e) => handleChange('status', e.target.value)} style={{ width: '100%' }}>
                <option value="Pending">Pending</option>
                <option value="In Transit">In Transit</option>
                <option value="Departed">Departed</option>
                <option value="Arrived">Arrived</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="shipment-label">Notes</label>
              <textarea className="ui-input" placeholder="Optional notes..."
                value={form.notes} onChange={(e) => handleChange('notes', e.target.value)}
                rows={2} style={{ resize: 'vertical' }} />
            </div>

          </div>

          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" className="btn btn-glass" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">
              <Ship size={16} /> Add Shipment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddShipmentModal;
