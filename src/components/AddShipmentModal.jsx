import React, { useState } from 'react';
import { X, Ship, MapPin, Calendar, UserPlus, UserCheck, Plus } from 'lucide-react';
import { contactsApi } from '../services/api';

const AddShipmentModal = ({ isOpen, onClose, onAdd, customers }) => {
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [loading, setLoading] = useState(false);
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
    notes: '',
    // New customer fields
    customerName: '',
    customerCompany: '',
    customerEmail: '',
    customerPhone: ''
  });

  if (!isOpen) return null;

  const handleChange = (field, value) => {
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

      if (!finalContactId || !form.destination) {
        alert('Check customer and destination.');
        setLoading(false);
        return;
      }

      // 2. Auto-generate label
      const dateStr = form.vesselEta
        ? new Date(form.vesselEta).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      
      let route = form.destination;
      if (form.origin) route = `${form.origin} - ${form.destination}`;
      const label = `${dateStr} ${route}`;

      // 3. Create shipment
      await onAdd({ ...form, contactId: finalContactId, label });

      // 4. Reset & Close
      setForm({
        contactId: '', origin: '', destination: '', vesselName: '', containerNumber: '',
        bolNumber: '', vesselEta: '', vesselDeparture: '', vesselArrival: '',
        shippingLine: '', status: 'Pending', notes: '',
        customerName: '', customerCompany: '', customerEmail: '', customerPhone: ''
      });
      setIsNewCustomer(false);
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
          <div className="modal-body" style={{ gap: '14px', paddingBottom: '20px' }}>

            {/* Customer Selection Header */}
            <div className="flex-between" style={{ marginBottom: '4px' }}>
              <label className="shipment-label" style={{ marginBottom: 0 }}>Customer Info *</label>
              <button 
                type="button" 
                className="btn btn-text-action" 
                style={{ fontSize: '0.75rem', gap: '4px' }}
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
                  style={{ width: '100%', border: form.contactId ? '1px solid var(--orange-primary)' : '' }}
                >
                  <option value="">Select Customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.company && `(${c.company})`}</option>
                  ))}
                </select>
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
